const webpush = require("web-push");
const { PUSH_PRIVATE_KEY, PUSH_PUBLIC_KEY } = process.env;
//setting our previously generated VAPID keys
webpush.setVapidDetails(
  "mailto:admin@cu-later.com",
  PUSH_PUBLIC_KEY,
  PUSH_PRIVATE_KEY
);
//function to send the notification to the subscribed device
const sendNotification = async (subscription, dataToSend) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(dataToSend)); //string or Node Buffer
    console.log(`Notification sent`);
  } catch (error) {
    console.log(error);
  }
};
module.exports = { sendNotification };
