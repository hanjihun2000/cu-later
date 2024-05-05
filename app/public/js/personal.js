if (!("Notification" in window) || !("serviceWorker" in navigator)) {
  document.querySelector(".push-select").style.display = "none";
}

document.querySelector("#push").addEventListener("click", async () => {
  if (document.querySelector("#push").checked) {
    Notification.requestPermission().then(async (Permission) => {
      try {
        const sw = await registerServiceWorker();
        sw.showNotification("CU-LATER", {
          body: "You have enabled push notification",
        });
      } catch (err) {
        window.alert("Error", err);
        document.querySelector("#push").checked = false;
      }
    });
  } else {
    if (window.navigator && navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }
});

// if service worker is registered, make #push checked
if (navigator.serviceWorker) {
  const response = navigator.serviceWorker.getRegistrations();
  response.then((registrations) => {
    for (let registration of registrations) {
      const channel = new MessageChannel();
      registration.active.postMessage("checkSubscription", [channel.port2]);
      channel.port1.onmessage = (event) => {
        if (event.data) {
          document.querySelector("#push").checked = true;
        }
      };
    }
  });
}
