const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = mongoose.model("User");

// function to register new users
function register(
  username,
  email,
  password,
  category,
  errorCallback,
  successCallback
) {
  // check if email is valid (CUHK email)
  const validation = /\b1155\d{6}@link.cuhk.edu.hk$/;
  if (!email.match(validation)) {
    console.log("email is not a valid CUHK email!");
    errorCallback({ message: "EMAIL IS NOT A VALID CUHK EMAIL" });
    return;
  }
  const emailValidation = /\b\w+@\w+\.\w+/;
  if (username.match(emailValidation)) {
    console.log("Username is an email address!");
    errorCallback({ message: "USERNAME IS AN EMAIL ADDRESS" });
    return;
  }
  // check if user already exists
  User.findOne({ username: username })
    .then((result) => {
      if (result) {
        console.log("Username exists!");
        errorCallback({ message: "USERNAME ALREADY EXISTS" });
      } else {
        // hash passwords to prevent leak
        return bcrypt.hash(password, 10);
      }
    })
    .then((hash) => {
      // create new user

      const preference = typeof category === "string" ? [category] : category;

      return new User({
        username: username,
        email: email,
        password: hash,
        preferences: {
          preference: {
            Books: preference.includes("Books"),
            Electronics: preference.includes("Electronics"),
            Clothes: preference.includes("Clothes"),
            Gloceries: preference.includes("Gloceries"),
          },
        },
        actions: [],
      }).save();
    })
    .then((user) => {
      successCallback(user);
    })
    .catch((err) => {
      console.log("Error:", err);
      errorCallback({ message: "DOCUMENT SAVE ERROR" });
    });
}

// function to check login credentials
function login(username, password, errorCallback, successCallback) {
  User.findOne({ username: username })
    .then((user) => {
      if (!user) {
        console.log("user not found!");
        errorCallback({ message: "USER NOT FOUND" });
        return;
      }
      // unhash passwords using bcrypt
      bcrypt
        .compare(password, user.password)
        .then((passwordMatch) => {
          if (passwordMatch) {
            successCallback(user);
          } else {
            console.log("passwords do not match!");
            errorCallback({ message: "PASSWORDS DO NOT MATCH" });
          }
        })
        .catch((err) => {
          console.log("Error comparing passwords", err);
          errorCallback({ message: "ERROR COMPARING PASSWORDS" });
        });
    })
    .catch((err) => {
      console.log("Error finding user", err);
      errorCallback({ message: "ERROR FINDING USER" });
    });
}

// function to end the authenticated session (logout)
function logout(req, callback) {
  req.session.destroy((err) => {
    if (err) {
      callback(err);
    } else {
      callback();
    }
  });
}

// create session with user logged in
function startAuthenticatedSession(
  req,
  user,
  callback,
  attribute = { type: "normal" }
) {
  req.session.regenerate((err) => {
    if (!err) {
      req.session.user = user;
      req.session.type = attribute.type;
      callback();
    } else {
      callback(err);
    }
  });
}

module.exports = {
  startAuthenticatedSession: startAuthenticatedSession,
  register: register,
  login: login,
  logout: logout,
};
