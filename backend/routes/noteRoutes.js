const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const { generateSummaryAndQuiz } = require("../utils/ai");
const auth = require("../middleware/authMiddleware");

// GET: Fetch notes ONLY for the logged-in user
router.get("/", auth, async (req, res) => {
  try {
    // Uses req.user.id from the JWT token to filter notes
    const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Failed to load notes" });
  }
});

// POST: Save note with the correct owner ID
router.post("/", auth, async (req, res) => {
  try {
    const { title, content } = req.body;

    // Creates the note linked to the authenticated user
    const note = await Note.create({
      title,
      content,
      userId: req.user.id, 
      summary: "Processing...",
      quiz: "Pending..."
    });

    // Respond immediately so the user doesn't wait for AI
    res.status(201).json(note);

    // AI Processing in background
    (async () => {
      try {
        const result = await generateSummaryAndQuiz(content);
        await Note.findByIdAndUpdate(note._id, {
          summary: result.summary,
          quiz: result.quiz
        });
        console.log(`✅ AI Sync Complete for: ${note.title}`);
      } catch (err) {
        console.error("AI Background Update Failed", err);
      }
    })();
  } catch (err) {
    res.status(500).json({ message: "Failed to save note" });
  }
});

module.exports = router;