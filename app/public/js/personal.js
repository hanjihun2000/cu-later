if (!("Notification" in window) || !("serviceWorker" in navigator)) {
  document.querySelector(".push-select").style.display = "none";
}

document.querySelector("#push").addEventListener("click", async () => {
  if (document.querySelector("#push").checked) {
    if (!("Notification" in window)) {
      window.alert("This browser does not support desktop notification");
    }

    Notification.requestPermission().then(async (Permission) => {
      const sw = await registerServiceWorker();
      sw.showNotification("CU-LATER", {
        body: "You have enabled push notification",
      });
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
