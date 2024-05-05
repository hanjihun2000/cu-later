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
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration) {
      document.querySelector("#push").checked = true;
    }
  });
}
