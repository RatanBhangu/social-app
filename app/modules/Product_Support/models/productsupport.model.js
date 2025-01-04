const mongoose = require("mongoose");

const jwt = require("jsonwebtoken");

const Product_Support = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  user_id: { type: mongoose.Schema.Types.ObjectId },
  Productid: {
    type: mongoose.Schema.Types.ObjectId,
    allowNull: false,
  },
  message: {
    type: String,
    allowNull: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("productSupport", Product_Support);
