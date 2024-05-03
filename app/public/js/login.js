const openCUHKLogin = () => {
  // open login page in a new window and wait for the user to login
  const loginWindow = window.open(
    "/cuhkLogin",
    "Login",
    "height=600,width=400"
  );
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      try {
        if (loginWindow.closed) {
          clearInterval(interval);
          resolve();
          // redirect to the login page (if logged in, the user will be redirected to the home page)
          window.location.href = "/login";
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 1000);
  });
};
