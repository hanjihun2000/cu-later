const webpush = require("web-push");
const fs = require("fs");

const keyJson = fs.readFileSync(
  process.env.PUSH_KEY_PATH || "/etc/secrets/webPushKeys.json"
);
const { publicKey, privateKey } = JSON.parse(keyJson);

webpush.setVapidDetails("mailto:admin@cu-later.com", publicKey, privateKey);
//function to send the notification to the subscribed device
const sendNotification = async (subscription, dataToSend) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(dataToSend)); //string or Node Buffer
  } catch (error) {
    console.log(error);
  }
};
module.exports = { sendNotification };
