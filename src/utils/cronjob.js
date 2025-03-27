const cron = require("node-cron");
const { subDays, startOfDay, endOfDay } = require("date-fns");
const ConnectionRequest = require("../models/connectionRequest");
const sendEmail = require("./sendEmail");

cron.schedule("00 08 * * *", async () => {
	// send email to all people who have got request previous day --> to 8'o clock next day
	try {
		const yesterday = subDays(new Date(), 1);
		const yesterdayStart = startOfDay(yesterday);
		const yesterdayEnd = endOfDay(yesterday);

		const pendingRequests = await ConnectionRequest.find({
			status: "interested",
			createdAt: {
				$gte: yesterdayStart,
				$lte: yesterdayEnd,
			},
		}).populate("fromUserId toUserId");

		const listOfEmails = [
			...new Set(pendingRequests.map((req) => req.toUserId.emailId)),
		];
		console.log(listOfEmails);

		for (const email of listOfEmails) {
			// send email
			try {
				const res = await sendEmail.run(
					"New friend request pedding for: " + email,
					"There are so many pending requests pending, please login to gopesh.shop and accept or reject the requests."
				);

				console.log(res);
			} catch (err) {
				console.error(err);
			}
		}
	} catch (err) {
		console.error(err);
	}
});
