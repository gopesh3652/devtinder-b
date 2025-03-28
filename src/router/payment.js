const express = require("express");
const {
	validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const { userAuth } = require("../middlewares/auth");
const Payment = require("../models/payment");
const User = require("../models/user");
const instance = require("../configs/razorpay");
const { membershipAmount } = require("../utils/constants");

const paymentRouter = express.Router();

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
	try {
		const { membershipType } = req.body;
		const { firstName, lastName, emailId, _id } = req.user;

		const orderDetails = {
			amount: membershipAmount[membershipType] * 100,
			currency: "INR",
			receipt: "receipt#1",
			notes: {
				firstName,
				lastName,
				emailId,
				membershipType,
			},
		};
		const order = await instance.orders.create(orderDetails);
		const { amount, currency, id, notes, receipt, status } = order;
		const payment = new Payment({
			userId: _id,
			orderId: id,
			status,
			amount,
			currency,
			notes,
			receipt,
		});

		const savedPaymentDetails = await payment.save();

		return res.json({
			savedPaymentDetails,
			keyId: process.env.RAZORPAY_KEY_ID,
		});
	} catch (err) {
		return res.status(400).json({
			message: err.message,
		});
	}
});

// Apply express.raw() for the webhook route to get the raw body
paymentRouter.post("/payment/webhook", async (req, res) => {
	try {
		const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
		const webhookSignature = req.get("X-Razorpay-Signature");
		const webhookBody = req.body;

		// Log the incoming request for debugging
		console.log("Webhook received:", req.body.toString());

		// Validate the webhook signature using the raw body
		const isWebhookValid = validateWebhookSignature(
			webhookBody, // Raw body as a string
			webhookSignature,
			webhookSecret
		);

		console.log("Signature validation result:", isWebhookValid);

		if (!isWebhookValid) {
			console.log("Webhook signature validation failed");
			return res.status(400).json({
				message: "Webhook signature is invalid",
			});
		}

		// Parse the body manually after validation
		const paymentDetails = webhookBody.payload.payment.entity;

		// Find and update the payment in the database
		const payment = await Payment.findOne({
			orderId: paymentDetails.order_id,
		});

		if (!payment) {
			console.log("Payment not found for orderId:", paymentDetails.order_id);
			return res.status(404).json({
				message: "Payment not found",
			});
		}

		payment.paymentId = paymentDetails.id;
		payment.status = paymentDetails.status;
		await payment.save();
		console.log("Payment updated:", payment);

		// Update user to premium only if payment is captured
		if (payment.status === "captured") {
			const user = await User.findOne({ _id: payment.userId });
			if (user) {
				user.isPremium = true;
				user.membershipType = payment.notes.membershipType;
				await user.save();
				console.log("User updated to premium:", user._id);
			} else {
				console.log("User not found for userId:", payment.userId);
			}
		}

		// Send success response to Razorpay
		return res.status(200).json({
			message: "Webhook received successfully",
		});
	} catch (err) {
		console.error("Webhook error:", err);
		return res.status(500).json({
			message: "Internal server error",
		});
	}
});

module.exports = paymentRouter;
