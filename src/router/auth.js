const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const { validateSignUpData } = require("../utils/validation");

const authRouter = express.Router();

authRouter.post("/signup", async (req, res) => {
	try {
		validateSignUpData(req);
		const { firstName, lastName, emailId, password } = req.body;

		const isAlreadyExist = await User.findOne({
			emailId,
		});

		if (isAlreadyExist) {
			return res.status(400).json({ message: "user already exist" });
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const user = new User({
			firstName,
			lastName,
			emailId,
			password: passwordHash,
		});
		const savedUser = await user.save();

		const token = await user.getJWT();
		res.cookie("token", token, { expires: new Date(Date.now() + 3600000) });

		res.json({
			message: "User added successfully.",
			data: savedUser,
		});
	} catch (err) {
		res.status(400).send("ERROR: " + err.message);
	}
});

authRouter.post("/login", async (req, res) => {
	try {
		const { emailId, password } = req.body;

		const user = await User.findOne({ emailId: emailId });
		if (!user) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		const isPasswordValid = await user.validatePassword(password);
		if (isPasswordValid) {
			// create JWT token
			const token = await user.getJWT();

			// Add token to cookie and sent back coookie to user
			res.cookie("token", token, { expires: new Date(Date.now() + 3600000) });

			res.json({ user });
		} else {
			res.status(400).json({ message: "Invalid credentials" });
		}
	} catch (err) {
		res.status(400).send("ERROR:" + err.message);
	}
});

authRouter.post("/logout", (req, res) => {
	res.cookie("token", null, {
		expires: new Date(Date.now()),
	});
	res.send("Logged out successfully.");
});

module.exports = authRouter;
