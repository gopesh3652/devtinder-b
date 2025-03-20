const express = require("express");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");

const requestRouter = express.Router();

requestRouter.post(
	"/request/send/:status/:toUserId",
	userAuth,
	async (req, res) => {
		try {
			const toUserId = req.params.toUserId;
			const fromUserId = req.user._id;
			const status = req.params.status;

			const allowedStatus = ["ignored", "interested"];
			if (!allowedStatus.includes(status)) {
				return res.status(400).json({
					message: "Invalid status type " + status,
				});
			}

			const toUser = await User.findById(toUserId);
			if (!toUser) {
				return res.status(400).json({
					messgae: "user does not exist",
				});
			}

			const existingConnectionRequest = await ConnectionRequest.findOne({
				$or: [
					{ fromUserId, toUserId },
					{ fromUserId: toUserId, toUserId: fromUserId },
				],
			});
			if (existingConnectionRequest) {
				return res.status(400).json({
					message: "Connection request already exist",
				});
			}

			const connectionRequest = new ConnectionRequest({
				toUserId,
				fromUserId,
				status,
			});

			const data = await connectionRequest.save();

			const emailRes = await sendEmail.run();
			console.log(emailRes);

			res.json({
				message: "Connection request sent successfully",
				data,
			});
		} catch (err) {
			res.status(400).send("ERROR: " + err.message);
		}
	}
);

requestRouter.post(
	"/request/review/:status/:requestId",
	userAuth,
	async (req, res) => {
		try {
			const loggedInUserId = req.user._id;
			const { status, requestId } = req.params;
			const allowedStatusTypes = ["accepted", "rejected"];
			if (!allowedStatusTypes.includes(status)) {
				return res.status(400).json({
					message: "Not a valid status type " + status,
				});
			}

			const connectionRequest = await ConnectionRequest.findOne({
				_id: requestId,
				toUserId: loggedInUserId,
				status: "interested",
			});
			if (!connectionRequest) {
				return res.status(400).send("Not a valid request.");
			}

			connectionRequest.status = status;
			const data = await connectionRequest.save();
			return res.json({
				messgae: "User has " + status,
				data,
			});
		} catch (err) {
			res.status(400).send("ERROR: " + err.message);
		}
	}
);

module.exports = requestRouter;
