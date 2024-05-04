// import relevant packages
const express = require("express");
const app = express();
require("./db");
const mongoose = require("mongoose");
const Item_buy = mongoose.model("Item_buy");
const Activity = mongoose.model("Activity");
const User = mongoose.model("User");
const session = require("express-session");
const auth = require("./auth.js");
const exphbs = require("express-handlebars");
const cors = require("cors");
const { sendNotification } = require("./push_helper");
var fs = require("fs");
var hbs = require("hbs");
const https = require("https");
var path = require("path");
var bodyParser = require("body-parser");
const crypto = require("crypto");

// register partials for handlebars
var partialsDir = __dirname + "/views/partials";
var filenames = fs.readdirSync(partialsDir);
filenames.forEach(function (filename) {
  var matches = /^([^.]+).hbs$/.exec(filename);
  if (!matches) {
    return;
  }
  var name = matches[1];
  var template = fs.readFileSync(partialsDir + "/" + filename, "utf8");
  hbs.registerPartial(name, template);
});

// use public folder and handlebars engine
app.use(express.static("public"));
app.use(
  cors({
    origin: "*",
  })
);
app.set("view engine", "hbs");
app.use(express.urlencoded({ extended: false }));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.disable("x-powered-by");
// TODO: remove the cache control header for production
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// initialize session to maintain login state
const sessionOptions = {
  secret: "secret for signing session id",
  saveUninitialized: false,
  resave: false,
};
app.use(session(sessionOptions));

// to support picture storage
var multer = require("multer");
const status = require("statuses");

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

var upload = multer({ storage: storage });

// default home page
app.get("/", function (req, res) {
  if (req.session.user === undefined) {
    res.render("home", { loggedIn: false });
  } else {
    res.render("home", { loggedIn: true });
  }
});

app.get("/search/buy", function (req, res) {
  // if (req.session.user === undefined) {
  //   res.render("home", {
  //     error: "Please login or register first!",
  //     loggedIn: false,
  //   });
  // } else {
  var query = req.query.query;
  Item_buy.find({
    title: { $regex: query, $options: "i" },
    status: { $ne: "finished" },
  })
    .then((varToStoreResult) => {
      let items = varToStoreResult.map((item) => {
        // start mapping images
        if (item.img && item.img.data) {
          item.img.data = item.img.data.toString("base64"); // convert the data into base64
          item._id = item._id.toString();
          item.img = item.img.toObject();
        }
        return item;
      });
      res.render("buy", {
        searchResults: items,
        loggedIn: req.session.user !== undefined,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("An error occurred while fetching the data");
    });
  // }
});

app.get("/search/activity", function (req, res) {
  // if (req.session.user === undefined) {
  //   res.render("home", {
  //     error: "Please login or register first!",
  //     loggedIn: false,
  //   });
  // } else {
  var query = req.query.query;
  Activity.find({
    title: { $regex: query, $options: "i" },
    date: { $gt: new Date() },
  })
    .then((varToStoreResult) => {
      let items = varToStoreResult.map((item) => {
        // start mapping images
        if (item.img && item.img.data) {
          item.img.data = item.img.data.toString("base64"); // convert the data into base64
          item._id = item._id.toString();
          item.img = item.img.toObject();
        }
        return item;
      });
      res.render("activity", {
        searchResults: items,
        loggedIn: req.session.user !== undefined,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("An error occurred while fetching the data");
    });
  // }
});

// item buying page
app.get("/buy", function (req, res) {
  // check login state
  // if (req.session.user === undefined) {
  //   res.render("home", {
  //     error: "Please login or register first!",
  //     loggedIn: false,
  //   });
  // }
  // find all items ready for sale in database, tag finished will be omitted
  // else {
  Item_buy.find({ status: { $ne: "finished" } })
    .then((varToStoreResult) => {
      let items = varToStoreResult.map((item) => {
        if (item.img && item.img.data) {
          item.img.data = item.img.data.toString("base64"); // convert the data into base64
          item._id = item._id.toString();
          item.img = item.img.toObject();
        }
        return item;
      });
      res.render("buy", {
        shop: items,
        loggedIn: req.session.user !== undefined,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("An error occurred while fetching the data");
    });
  // }
});

app.post("/buy", function (req, res) {
  key = Object.keys(req.body)[0];
  Item_buy.findOneAndUpdate(
    { _id: key },
    { $set: { status: "requested" } },
    { upsert: true, new: true } // 'new: true' to return the document after update if you need it
  )
    .then((doc) => {
      // Handle the updated document, if needed
      console.log("Update successful:", doc);
    })
    .catch((err) => {
      console.log("Something wrong when updating data!", err);
    });
});

app.get("/buy/:id", (req, res) => {
  if (req.session.user === undefined) {
    res.redirect("/login");
  }

  let id = req.params.id;
  const objectId = new mongoose.Types.ObjectId(id);
  Item_buy.findOne({ _id: objectId })
    .then((item) => {
      if (item && item.img && item.img.data) {
        item.img.data = item.img.data.toString("base64"); // convert the data into base64
        item.img = item.img.toObject();
      }
      if (!item) {
        res.render("home", {
          error: "Item not found!",
          loggedIn: req.session.user !== undefined,
        });
      }
      res.render("detail", { shop: item, loggedIn: true });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error retrieving item");
    });
});

// create form for request botton of a product, this is to easily digest which user requested from session inputs for reference
app.post("/buy/:id", function (req, res) {
  key = Object.keys(req.body)[0];
  Item_buy.findOneAndUpdate(
    { _id: key },
    {
      $set: { status: "requested" },
      $push: { requesters: req.session.user.email },
    },
    { upsert: true, new: true } // new: true to get the updated document in the response
  )
    .then((doc) => {
      res.redirect("/personal");
    })
    .catch((err) => {
      console.log("Something wrong when updating data!", err);
      res.status(500).send("Failed to update data");
    });
});

// sell page for users to post new items
app.get("/sell", function (req, res) {
  if (req.session.user === undefined) {
    res.render("home", {
      error: "Please login or register first!",
      loggedIn: false,
    });
  } else {
    // create the uploads folder if it does not exist
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("./uploads");
    }

    res.render("sell", { loggedIn: true });
  }
});

app.post("/sell", upload.single("image"), function (req, res, next) {
  // input validations
  if (
    typeof req.body.title !== "string" ||
    typeof req.body.description !== "string" ||
    !req.session.user ||
    typeof req.session.user.username !== "string"
  ) {
    res.render("sell", { error: "Invalid input!", loggedIn: true });
  } else if (
    typeof req.body.price !== "string" ||
    isNaN(req.body.price) ||
    parseInt(req.body.price) < 0
  ) {
    res.render("sell", { error: "Price is ridiculous!", loggedIn: true });
  }
  // add new item to database
  else {
    new Item_buy({
      title: req.body.title,
      price: parseInt(req.body.price),
      description: req.body.description,
      owner: req.session.user.username,
      img: {
        data: fs.readFileSync("./uploads/" + req.file.filename),
        contentType: req.file.mimetype,
      },
      status: "posted",
      updated_at: Date.now(),
    })
      .save() // save() returns a promise
      .then((item) => {
        // delete the image from the uploads folder
        fs.unlinkSync("./uploads/" + req.file.filename);

        // Handle successful save
        // update user information by adding new product in place
        return User.findOneAndUpdate(
          { username: req.session.user.username },
          {
            $push: {
              items_sell: req.body.title,
            },
          },
          { new: true } // 'new: true' to get the updated document back
        );
      })
      .then((doc) => {
        // Handle successful user update
        res.redirect("/buy");
      })
      .catch((err) => {
        // Handle errors
        res.render("sell", {
          error: "Error saving or updating item!",
          loggedIn: true,
        });
      });
  }
});

// activity page for users to post new activities
app.get("/activity", function (req, res) {
  // if (req.session.user === undefined) {
  //   res.render("home", {
  //     error: "Please login or register first!",
  //     loggedIn: false,
  //   });
  // } else {
  Activity.find({ date: { $gt: new Date() } })
    .then((varToStoreResult) => {
      let items = varToStoreResult.map((item) => {
        if (item.img && item.img.data) {
          item.img.data = item.img.data.toString("base64"); // convert the data into base64
          item._id = item._id.toString();
          item.img = item.img.toObject();
        }
        return item;
      });
      res.render("activity", {
        shop: items,
        loggedIn: req.session.user !== undefined,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("An error occurred while fetching the data");
    });
  // }
});

// activity detail page
app.get("/activity/:id", (req, res) => {
  if (req.session.user === undefined) {
    res.redirect("/login");
  }

  let id = req.params.id;
  const objectId = new mongoose.Types.ObjectId(id);
  Activity.findOne({ _id: objectId })
    .then((item) => {
      if (!item) {
        throw new Error("Activity not found");
      }
      item.deadline = item.date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      if (item.img && item.img.data) {
        item.img.data = item.img.data.toString("base64"); // convert the data into base64
        item.img = item.img.toObject();
      }
      res.render("content", { shop: item, loggedIn: true });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("An error occurred while fetching the data");
    });
});

// create form for request botton of an activity, this is to easily digest which user requested from session inputs for reference
app.get("/create", function (req, res) {
  if (req.session.user === undefined) {
    res.render("home", {
      error: "Please login or register first!",
      loggedIn: false,
    });
  } else {
    // create the uploads folder if it does not exist
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("./uploads");
    }
    res.render("create", { loggedIn: true });
  }
});

app.post("/create", upload.single("image"), function (req, res, next) {
  // input validations
  if (
    typeof req.body.title !== "string" ||
    typeof req.body.description !== "string" ||
    !req.session.user ||
    typeof req.session.user.username !== "string"
  ) {
    console.log("Debug!");
    res.render("create", { error: "Invalid input!", loggedIn: true });
  } else {
    new Activity({
      title: req.body.title,
      description: req.body.description,
      organizer: req.session.user.username,
      date: req.body.date,
      img: {
        data: fs.readFileSync("./uploads/" + req.file.filename),
        contentType: req.file.mimetype,
      },
      status: "posted",
      updated_at: Date.now(),
    })
      .save() // save() returns a promise
      .then((activity) => {
        // delete the image from the uploads folder
        fs.unlinkSync("./uploads/" + req.file.filename);

        // Handle successful save
        // update user information by adding new activity
        return User.findOneAndUpdate(
          { username: req.session.user.username },
          {
            $push: {
              activity: req.body.title,
            },
          },
          { new: true }
        );
      })
      .then((doc) => {
        // Handle successful user update
        console.log("redirecting to activity page");
        res.redirect("/activity");
      })
      .catch((err) => {
        // Handle errors
        console.log(err);
        res.render("create", {
          error: "Error saving or updating activity!",
          loggedIn: true,
        });
      });
  }
});

// personal history page
app.get("/personal", function (req, res) {
  if (req.session.user === undefined) {
    res.render("home", {
      error: "Please login or register first!",
      loggedIn: false,
    });
  }
  // Find all items user requested, and all other users that requested certain items of this user.
  // Buyers are able to see updates of requested items, but cannot contact sellers directly.
  // Sellers are able to see requesters' emails and initiate contacts.
  // They can also update items' availability by clicking denied (remove requesters) or finished (remove item since transaction is completed).
  else {
    const itemQuery = Item_buy.find({
      owner: req.session.user.username,
      status: "requested",
    }).exec();
    const requestQuery = Item_buy.find({
      requesters: req.session.user.email,
      status: "requested",
    }).exec();

    Promise.all([itemQuery, requestQuery])
      .then(([items, requests]) => {
        res.render("personal", {
          shop: items,
          request: requests,
          loggedIn: true,
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("An error occurred while fetching the data");
      });
  }
});

// form to update items' availability
app.post("/personal", function (req, res) {
  // change to finished status and hide item from display. (item still in database)
  if (Object.values(req.body)[0] === "Finished") {
    result = "finished";
    key = Object.keys(req.body)[0];
    Item_buy.findOneAndUpdate(
      { _id: key },
      {
        $set: { status: result, requesters: [] },
      },
      { upsert: true, new: true }
    )
      .then((doc) => {
        console.log(doc);
        res.redirect("/personal");
      })
      .catch((err) => {
        console.log("Something wrong when updating data!", err);
      });
  } else {
    // remove all requesters from list, transaction is denied and item is reposted for requests
    result = "posted";
    key = Object.keys(req.body)[0];
    Item_buy.findOneAndUpdate(
      { _id: key },
      {
        $set: { status: result, requesters: [] },
      },
      { upsert: true, new: true }
    )
      .then((doc) => {
        res.redirect("/personal");
      })
      .catch((err) => {
        console.log("Something wrong when updating data!", err);
      });
  }
});

// take input from user to register new account
app.post("/register", (req, res) => {
  function success(user) {
    // start new session with registered user
    auth.startAuthenticatedSession(req, user, (err = undefined) => {
      if (err) {
        console.log(err);
      }
      res.redirect("/");
    });
  }
  function error(obj) {
    res.render("login", { registerMessage: obj.message, register: true });
  }
  // use functions in auth.js to register new user
  auth.register(
    req.body.username,
    req.body.email,
    req.body.password,
    error,
    success
  );
});

app.get("/register", (req, res) => {
  res.render("login", { register: true });
});

// login page for users
app.get("/login", (req, res) => {
  if (req.session.user !== undefined) {
    res.redirect("/");
  } else res.render("login");
});

app.get("/cuhkLogin", (req, res) => {
  res.render("cuhkLogin");
});

app.post("/cuhkLogin", (req, res) => {
  // check if the user is a CUHK student
  try {
    const username = req.body.username;
    const validation = /\b1155\d{6}@link.cuhk.edu.hk$/;
    if (!validation.test(username)) {
      throw new Error("Invalid CUHK email address!");
    }
    const studentNumber = username.split("@")[0];
    const password = req.body.password;

    const encrypt = (plaintext) => {
      const password = "e3ded030ce294235047550b8f69f5a28";
      const iv = "e0b2ea987a832e24";
      const cipher = crypto.createCipheriv("aes-256-cbc", password, iv);
      let encrypted = cipher.update(plaintext, "utf8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    };

    const xml = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetTimeTable xmlns="http://tempuri.org/"><asP1>${encrypt(
      studentNumber
    )}</asP1><asP2>${encrypt(
      password
    )}</asP2><asP3>hk.edu.cuhk.ClassTT</asP3></GetTimeTable></soap:Body></soap:Envelope>`;

    fetch("https://campusapps.itsc.cuhk.edu.hk/store/CLASSSCHD/STT.asmx", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "User-Agent": "ClassTT/2.4 CFNetwork/1333.0.4 Darwin/21.5.0",
      },
      body: xml,
    })
      .then((response) => response.text())
      .then((data) => {
        const jsonData = data.replace(/(<([^>]+)>)/gi, "");
        const result = JSON.parse(jsonData);

        //  if is empty array, then it is not a valid CUHK student
        if (result.length === 0) {
          throw new Error("Invalid CUHK username or password!");
        }

        auth.startAuthenticatedSession(
          req,
          {
            username: studentNumber,
            email: username,
            actions: [],
          },
          (err) => {
            if (err) {
              console.log(err);
            }
            // close the window after login
            res.send(
              "<script>window.close();</script><h1>Login successful!</h1><p>You can close this window now.</p>"
            );
          },
          { type: "CUHK" }
        );
      })
      .catch((error) => {
        res.render("cuhkLogin", {
          error: error || "Invalid CUHK username or password!",
        });
      });
  } catch (error) {
    res.render("cuhkLogin", { error: error });
  }
});

// validation of login credentials
app.post("/login", (req, res) => {
  function success(user) {
    // start user session with login credentials
    auth.startAuthenticatedSession(req, user, (err = undefined) => {
      if (err) {
        console.log(err);
      }
      res.redirect("/");
    });
  }
  function error(obj) {
    res.render("login", { loginMessage: obj.message });
  }
  // use functions in auth.js to check login credentials
  auth.login(req.body.username, req.body.password, error, success);
});

// logout
app.get("/logout", (req, res) => {
  // Clear the user's session or authentication token
  auth.logout(req, (err = undefined) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/login");
  });
});

app.post(`/save-subscription`, async (req, res) => {
  try {
    const subscription = JSON.stringify(req.body);
    const user = await User.findOne({ email: req.session.user.email });
    user.subscription.push(JSON.parse(subscription));
    await user.save();
    res.status(201).json({ message: "Subscription Successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post(`/send-notification`, async (req, res) => {
  try {
    const { id } = req.body;
    const sub = await models.subscriptions.findOne({ where: { id } });
    const message = {
      body: "Elon Musk sent you a friend request",
      icon: "https://media.npr.org/assets/img/2022/06/01/ap22146727679490-6b4aeaa7fd9c9b23d41bbdf9711ba54ba1e7b3ae-s800-c85.webp",
      data: {
        requestId: "1234",
        username: "elonmusk",
      },
      actions: [
        {
          action: "accept",
          title: "Accept",
        },
        {
          action: "view_profile",
          title: "View Profile",
        },
      ],
      tag: "friend_request",
    };
    await sendNotification(sub.subsription, message);
    res.json({ message: "message sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// clear the uploaded image
if (fs.existsSync("uploads"))
  fs.readdirSync("./uploads").forEach((file) => {
    fs.unlinkSync(path.join("./uploads", file));
  });

// start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

// support https
try {
  const credentials = {
    key: fs.readFileSync(process.env.SSL_KEY || "/etc/secrets/key.pem"),
    cert: fs.readFileSync(process.env.SSL_CERT || "/etc/secrets/cert.pem"),
  };
  const httpsServer = https.createServer(credentials, app);
  const SSL_PORT = process.env.SSL_PORT || 8443;
  httpsServer.listen(SSL_PORT, () => {
    console.log(`Server listening on port ${SSL_PORT}...`);
  });
} catch (err) {
  console.log("HTTPS not available", err);
}
