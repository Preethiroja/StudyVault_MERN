const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  points: { type: Number, default: 0 }
});

module.exports = mongoose.model("Leaderboard", leaderboardSchema);
