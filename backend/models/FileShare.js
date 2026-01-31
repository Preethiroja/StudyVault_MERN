const mongoose = require("mongoose");

const fileShareSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  filename: String,
  path: String,
  expiresAt: Date,
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

module.exports = mongoose.model("FileShare", fileShareSchema);