const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  content: String,
  summary: String,
  quiz: String,
  versions: [{ title:String, content:String, summary:String, quiz:String, updatedAt:Date }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Note", noteSchema);
