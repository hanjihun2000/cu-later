// import relevant packages
const express = require("express");
const app = express();
require("./db");
const mongoose = require("mongoose");
const Item_buy = mongoose.model("Item_buy");
const Item_share = mongoose.model("Item_share");
const User = mongoose.model("User");
const session = require("express-session");
const auth = require("./auth.js");
const exphbs = require("express-handlebars");
var fs = require("fs");
var hbs = require("hbs");
var path = require("path");

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
app.set("view engine", "hbs");
app.use(express.urlencoded({ extended: false }));
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
  if (req.session.username === undefined) {
    res.render("home", { loggedIn: false });
  } else {
    res.render("home", { loggedIn: true });
  }
});

app.get("/search", function (req, res) {
  if (req.session.username === undefined) {
    res.render("home", {
      error: "Please login or register first!",
      loggedIn: false,
    });
  } else {
    var query = req.query.query;
    Item_buy.find(
      { title: { $regex: query, $options: "i" }, status: { $ne: "finished" } },
      function (err, varToStoreResult) {
        if (err) {
          console.log(err);
        }
        let items = varToStoreResult;
        items = items.map((item) => {
          // start mapping images
          if (item.img.data !== undefined) {
            item.img.data = item.img.data.toString("base64"); // convert the data into base64
            item._id = item._id.toString();
            item.img = item.img.toObject();
          }
          return item;
        });
        res.render("buy", { searchResults: items, loggedIn: true });
      }
    );
  }
});

// item buying page
app.get("/buy", function (req, res) {
  // check login state
  // if (req.session.username === undefined) {
  //   res.render("home", {
  //     error: "Please login or register first!",
  //     loggedIn: false,
  //   });
  // }
  // // find all items ready for sale in database, tag finished will be omitted
  // else {
  Item_buy.find(
    { status: { $ne: "finished" } },
    function (err, varToStoreResult) {
      if (err) {
        console.log(err);
      }
      let items = varToStoreResult;
      items = items.map((item) => {
        // start mapping images
        if (item.img.data !== undefined) {
          item.img.data = item.img.data.toString("base64"); // convert the data into base64
          item._id = item._id.toString();
          item.img = item.img.toObject();
        }
        return item;
      });
      res.render("buy", { shop: items });
    }
  );
  // }
});

app.post("/buy", function (req, res) {
  key = Object.keys(req.body)[0];
  Item_buy.findOneAndUpdate(
    { _id: key },
    {
      $set: { status: "requested" },
    },
    { upsert: true },
    (err, doc) => {
      if (err) {
        console.log("Something wrong when updating data!");
      }
    }
  );
});

app.get("/buy/:id", (req, res) => {
  let id = req.params.id;
  const objectId = mongoose.Types.ObjectId(id);
  Item_buy.find({ _id: objectId }, function (err, result) {
    if (err) {
      console.log(err);
    }
    let item = result[0];
    if (item.img.data !== undefined) {
      item.img.data = item.img.data.toString("base64"); // convert the data into base64
      item.img = item.img.toObject();
    }
    res.render("detail", { shop: item, loggedIn: true });
  });
});

// create form for request botton of a product, this is to easily digest which user requested from session inputs for reference
app.post("/buy/:id", function (req, res) {
  key = Object.keys(req.body)[0];
  Item_buy.findOneAndUpdate(
    { _id: key },
    {
      // update item information by adding new requests
      $set: { status: "requested" },
      $push: { requesters: req.session.username.email },
    },
    { upsert: true },
    (err, doc) => {
      if (err) {
        console.log("Something wrong when updating data!");
      } else {
        res.redirect("/personal");
      }
    }
  );
});

// sell page for users to post new items
app.get("/sell", function (req, res) {
  if (req.session.username === undefined) {
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
    !req.session.username ||
    typeof req.session.username.username !== "string"
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
      owner: req.session.username.username,
      img: {
        data: fs.readFileSync("./uploads/" + req.file.filename),
        contentType: req.file.mimetype,
      },
      status: "posted",
      updated_at: Date.now(),
    }).save(function (err, Item_sale, count) {
      if (err) {
        res.render("sell", { error: "Error saving item!", loggedIn: true });
        return;
      }
      // update user information by adding new product in place
      User.findOneAndUpdate(
        { username: req.session.username.username },
        {
          $push: {
            items_sell: req.body.title,
          },
        },
        { new: true },
        (err, doc) => {
          if (err) {
            res.render("sell", {
              error: "Error updating user information!",
              loggedIn: true,
            });
            return;
          }
          console.log("redirecting to buy page");
          res.redirect("/buy");
        }
      );
    });
  }
});

// personal history page
app.get("/personal", function (req, res) {
  if (req.session.username === undefined) {
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
    Item_buy.find(
      { owner: req.session.username.username, status: "requested" },
      function (err, varToStoreResult) {
        if (err) {
          console.log(err);
        }
        const items = varToStoreResult;
        Item_buy.find(
          { requesters: req.session.username.email, status: "requested" },
          function (err, varToStoreResult) {
            if (err) {
              console.log(err);
            }
            const request = varToStoreResult;
            Item_share.find(
              { requesters: req.session.username.email, status: "requested" },
              function (err, varToStoreResult) {
                if (err) {
                  console.log(err);
                }
                const request2 = varToStoreResult;
                Item_share.find(
                  { owner: req.session.username.username, status: "requested" },
                  function (err, varToStoreResult) {
                    if (err) {
                      console.log(err);
                    }
                    const items2 = varToStoreResult;
                    res.render("personal", {
                      shop: items,
                      request: request,
                      shop2: items2,
                      request2: request2,
                      loggedIn: true,
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
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
      { upsert: true },
      (err, doc) => {
        if (err) {
          console.log("Something wrong when updating data!");
        } else {
          console.log(doc);
          res.redirect("/personal");
        }
      }
    );
  } else {
    // remove all requesters from list, transaction is denied and item is reposted for requests
    result = "posted";
    key = Object.keys(req.body)[0];
    Item_buy.findOneAndUpdate(
      { _id: key },
      {
        $set: { status: result, requesters: [] },
      },
      { upsert: true },
      (err, doc) => {
        if (err) {
          console.log("Something wrong when updating data!");
        } else {
          res.redirect("/personal");
        }
      }
    );
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
  if (req.session.username !== undefined) {
    res.redirect("personal");
  } else res.render("login");
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
