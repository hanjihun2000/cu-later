const urlB64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const saveSubscription = async (subscription) => {
  console.log("subscription", JSON.stringify(subscription));

  const SERVER_URL = "http://localhost:8080/save-subscription";
  const response = await fetch(SERVER_URL, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscription),
  });
  return response.json();
};

self.addEventListener("activate", async () => {
  try {
    const subscription = await self.registration.pushManager.subscribe({
      applicationServerKey: urlB64ToUint8Array(
        // need to change if you want to use your own key
        "BEQSh_hG7ob48m_G3JEI38Mu6E6-YntJ4bQF9whlfITry6_pmxcfPntMp2nfTtEHG31v0MzW0hgCUJ0Fpvl0WPA"
      ),
      userVisibleOnly: true,
    });
    console.log(JSON.stringify(subscription));
    const response = await saveSubscription(subscription);
    console.log("response", response);
  } catch (err) {
    console.log("Error", err);
  }
});

const showLocalNotification = (title, data, swRegistration) => {
  swRegistration.showNotification(title, data);
};

self.addEventListener("push", function (event) {
  if (event.data) {
    console.log("Push event!! ", JSON.parse(event.data.text()));
    showLocalNotification(
      "Notification ",
      JSON.parse(event.data.text()),
      self.registration
    );
  } else {
    console.log("Push event but no data");
  }
});
