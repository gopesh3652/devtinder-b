const express = require("express");
const {
	validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const paymentRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const Payment = require("../models/payment");
const User = require("../models/user");
const instance = require("../configs/razorpay");
const { membershipAmount } = require("../utils/constants");

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
	try {
		const { membershipType } = req.body;
		const { firstName, lastName, emailId, _id } = req.user;

		// amount is in paisa so, 50000 --> 500.00
		const orderDetails = {
			amount: membershipAmount[membershipType] * 100,
			currency: "INR",
			receipt: "receipt#1",
			partial_payment: false,
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

		// save in db
		const savedPaymentDetails = await payment.save();

		// return the orderId and details to frontend
		return res.json({
			savedPaymentDetails,
			keyId: process.env.RAZORPAY_KEY_ID,
		});
	} catch (err) {
		return res.status(400).json({
			messgae: err.message,
		});
	}
});

paymentRouter.post("/payment/webhook", async (req, res) => {
	try {
		const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
		const webhookBody = req.body;
		// req.get / req.headers  --> for taking headers from request
		const webhookSignature = req.get("X-Razorpay-Signature");

		const isWebhookValid = validateWebhookSignature(
			JSON.stringify(webhookBody),
			webhookSignature,
			webhookSecret
		);

		if (!isWebhookValid) {
			res.status(400).json({
				message: "webhook signature is invalid",
			});
		}

		// update payment status in DB
		const paymentDetails = req.body.payload.payment.entity;
		const payment = await Payment.findOne({
			orderId: paymentDetails.order_id,
		});
		payment.status = paymentDetails.status;
		await payment.save();
		console.log(paymentDetails);

		// update user to premium
		const user = await User.findOne({
			_id: payment.userId,
		});
		user.isPremium = true;
		user.membershipType = payment.notes.membershipType;
		await user.save();

		// if (req.body.event === "payment.captured") {
		// }

		// if (req.body.event === "payment.failed") {
		// }

		// return success reaponse to razorpay
		return res.status(200).json({
			messgae: "webhook received successfully.",
		});
	} catch (err) {
		return res.status(400).json({
			messgae: err.message,
		});
	}
});

module.exports = paymentRouter;
