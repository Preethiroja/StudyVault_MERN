const mongoose = require("mongoose");

const fileShareSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  filename: String,
  path: String,
  expiresAt: Date
});

module.exports = mongoose.model("FileShare", fileShareSchema);
