require("dotenv").config();
const mongoose = require("mongoose");

// item object for sale
const Item_buy = new mongoose.Schema({
  title: String,
  price: Number,
  description: String,
  status: String,
  category: String,
  date: { type: Date, default: Date.now },
  // foreign key to reference owners
  owner: [{ type: String, ref: "User.username" }],
  requesters: [{ type: String, ref: "User.email" }],
  img: {
    data: Buffer,
    contentType: String,
  },
});

// activity for promotion
const Activity = new mongoose.Schema({
  title: String,
  description: String,
  status: String,
  created: { type: Date, default: Date.now },
  date: Date,
  // foreign key to reference organizer and participants
  organizer: [{ type: String, ref: "User.username" }],
  participants: [{ type: String, ref: "User.email" }],
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
  activity: [{ type: String, ref: "Activity.title" }],
  preferences: {
    preference: {
      Books: { type: Boolean, default: false },
      Electronics: { type: Boolean, default: false },
      Clothes: { type: Boolean, default: false },
      Gloceries: { type: Boolean, default: false },
    },
    sendEmail: { type: Boolean, default: false },
  },
  subscription: [
    {
      endpoint: String,
      expirationTime: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
  ],
});

mongoose.model("Item_buy", Item_buy);
mongoose.model("Activity", Activity);
mongoose.model("User", User);

mongoose.connect(process.env.DB);
