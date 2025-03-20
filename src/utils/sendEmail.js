const { SendEmailCommand } = require("@aws-sdk/client-ses");
const { sesClient } = require("./sesClient.js");

const createSendEmailCommand = (toAddress, fromAddress) => {
	return new SendEmailCommand({
		Destination: {
			CcAddresses: [],
			ToAddresses: [toAddress],
		},
		Message: {
			Body: {
				Html: {
					Charset: "UTF-8",
					Data: "<h1>This is html email</h1>",
				},
				Text: {
					Charset: "UTF-8",
					Data: "This is text email",
				},
			},
			Subject: {
				Charset: "UTF-8",
				Data: "First SES Email",
			},
		},
		Source: fromAddress,
		ReplyToAddresses: [],
	});
};

const run = async () => {
	const sendEmailCommand = createSendEmailCommand(
		"rishab8696@gmail.com",
		"gopeshkhandelwal10+1@gmail.com"
	);

	try {
		return await sesClient.send(sendEmailCommand);
	} catch (caught) {
		if (caught instanceof Error && caught.name === "MessageRejected") {
			const messageRejectedError = caught;
			return messageRejectedError;
		}
		throw caught;
	}
};

module.exports = { run };
