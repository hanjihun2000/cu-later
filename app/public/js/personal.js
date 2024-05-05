if (!("Notification" in window) || !("serviceWorker" in navigator)) {
  document.querySelector(".push-select").style.display = "none";
}

const destroySW = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (let registration of registrations) {
    await registration.unregister();
  }
};

document.querySelector("#push").addEventListener("click", async () => {
  if (document.querySelector("#push").checked) {
    Notification.requestPermission().then(async (Permission) => {
      try {
        // check if there is already a service worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          throw new Error(
            "Notification already registered in other account, please unregister first!"
          );
        }
        // register a new service worker and show a notification
        const sw = await registerServiceWorker();
        sw.showNotification("CU-LATER", {
          body: "You have enabled push notification",
        });
      } catch (err) {
        window.alert(err);
        document.querySelector("#push").checked = false;
      }
    });
  } else {
    if (window.navigator && navigator.serviceWorker) {
      await destroySW();
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
