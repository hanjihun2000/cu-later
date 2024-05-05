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
  const response = await fetch("http://localhost:8080/save-subscription", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscription),
  });
  return response.json();
};

// on unregistering service worker
self.addEventListener("unregister", async () => {
  const subscription = await self.registration.pushManager.getSubscription();
  if (subscription) {
    fetch("http://localhost:8080/unsubscribe", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });
    return subscription.unsubscribe();
  }
});

self.addEventListener("activate", async () => {
  try {
    const subscription = await self.registration.pushManager.subscribe({
      applicationServerKey: urlB64ToUint8Array(
        // need to change if you want to use your own key
        "BEQSh_hG7ob48m_G3JEI38Mu6E6-YntJ4bQF9whlfITry6_pmxcfPntMp2nfTtEHG31v0MzW0hgCUJ0Fpvl0WPA"
      ),
      userVisibleOnly: true,
    });
    await saveSubscription(subscription);
  } catch (err) {
    window.alert("Error", err);
  }
});

const showLocalNotification = (title, data, swRegistration) => {
  swRegistration.showNotification(title, data);
};

self.addEventListener("push", function (event) {
  if (event.data) {
    showLocalNotification(
      "Notification ",
      JSON.parse(event.data.text()),
      self.registration
    );
  }
});
