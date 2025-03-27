const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./configs/database");
const authRouter = require("./router/auth");
const profileRouter = require("./router/profile");
const userRouter = require("./router/user");
const requestRouter = require("./router/request");
const paymentRouter = require("./router/payment");

const app = express();

app.use(
	cors({
		// origin: "http://localhost:5173",
		// credentials: true,
	})
);

dotenv.config();
require("./utils/cronjob");

const PORT = process.env.PORT || 3002;
// const PORT = 3002;

app.use(express.json());
app.use(cookieParser());

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", userRouter);
app.use("/", requestRouter);
app.use("/", paymentRouter);

connectDB()
	.then(() => {
		console.log("connection to database established successfully....");
		app.listen(PORT, () => {
			console.log(
				`server is successfully listening on port http://localhost:${PORT}`
			);
		});
	})
	.catch((err) => {
		console.error("Database connection unsuccessful.", err);
	});
