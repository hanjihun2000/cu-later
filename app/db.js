require("dotenv").config();

const mongoose = require("mongoose");

//Item object for sale
const Item_buy = new mongoose.Schema({
  title: String,
  price: Number,
  description: String,
  status: String,
  // foreign key to reference owners
  owner: [{ type: String, ref: "User.username" }],
  requesters: [{ type: String, ref: "User.email" }],
  img: {
    data: Buffer,
    contentType: String,
  },
});

// item object for share
const Item_share = new mongoose.Schema({
  title: String,
  price: Number,
  description: String,
  status: String,
  // foreign key to reference owners
  owner: [{ type: String, ref: "User.username" }],
  requesters: [{ type: String, ref: "User.email" }],
  img: {
    data: Buffer,
    contentType: String,
  },
});

// user object
const User = new mongoose.Schema({
  username: String,
  email: String,
  // constraints to make password required
  password: { type: String, unique: true, required: true },
  items_buy: [{ type: String, ref: "Item_buy.title" }],
  items_share: [{ type: String, ref: "Item_share.title" }],
});

mongoose.model("Item_buy", Item_buy);
mongoose.model("Item_share", Item_share);
mongoose.model("User", User);

mongoose.connect(process.env.DB);
