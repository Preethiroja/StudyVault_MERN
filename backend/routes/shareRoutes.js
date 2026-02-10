const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const FileShare = require("../models/FileShare");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, uuidv4() + "_" + file.originalname)
});
const upload = multer({ storage });
const router = express.Router();

// 1. Upload & Get Points
router.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
    const file = await FileShare.create({
      userId: req.user.id,
      filename: req.file.originalname,
      path: req.file.path,
      expiresAt
    });
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 5 } });
    res.json(file);
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
});

// 2. Get My Uploads
router.get("/", auth, async (req, res) => {
  try {
    const files = await FileShare.find({ userId: req.user.id, expiresAt: { $gt: new Date() } });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Error fetching files" });
  }
});

// 3. GET: Files Shared WITH Me
// GET: Files Shared WITH the logged-in user
router.get("/shared-with-me", auth, async (req, res) => {
  try {
    const files = await FileShare.find({ 
      sharedWith: req.user.id, 
      expiresAt: { $gt: new Date() } 
    })
    // 🚩 IMPORTANT: This tells Mongoose to look up the sender's name and email
    .populate("userId", "name email"); 

    res.json(files);
  } catch (err) {
    console.error("Fetch Shared Files Error:", err);
    res.status(500).json({ message: "Error fetching shared files" });
  }
});

// 4. POST: Share file with a friend via email
router.post("/share-to-friend", auth, async (req, res) => {
  try {
    const { fileId, friendEmail } = req.body;
    const friend = await User.findOne({ email: friendEmail });
    if (!friend) return res.status(404).json({ message: "User not found" });

    await FileShare.findByIdAndUpdate(fileId, {
      $addToSet: { sharedWith: friend._id } 
    });
    res.json({ message: `Successfully shared with ${friend.name}` });
  } catch (err) {
    res.status(500).json({ message: "Sharing failed" });
  }
});

// 5. Public Download
router.get("/download/:id", async (req, res) => {
  try {
    const file = await FileShare.findById(req.params.id);
    if (!file || new Date() > file.expiresAt) return res.status(404).send("File expired");
    res.download(path.join(__dirname, "..", file.path), file.filename);
  } catch (err) {
    res.status(500).send("Download error");
  }
});
// 6. DELETE: Remove a file
router.delete("/:id", auth, async (req, res) => {
  try {
    const file = await FileShare.findById(req.params.id);

    if (!file) return res.status(404).json({ message: "File not found" });

    // Check ownership
    if (file.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to delete this file" });
    }

    // Optional: Delete the actual file from the 'uploads/' folder here using fs.unlink
    
    await FileShare.findByIdAndDelete(req.params.id);
    res.json({ message: "File deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error during deletion" });
  }
});
module.exports = router;