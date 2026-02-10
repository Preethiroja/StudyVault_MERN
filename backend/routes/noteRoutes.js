const express = require("express");
const router = express.Router();
const axios = require("axios");
const Note = require("../models/Note");
const User = require("../models/User");
const { generateSummaryAndQuiz } = require("../utils/ai");
const auth = require("../middleware/authMiddleware");

/* ======================================================
   GET: Fetch notes ONLY for the logged-in user
   ====================================================== */
router.get("/", auth, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Failed to load notes" });
  }
});

/* ======================================================
   POST: Save note & trigger background AI processing
   ====================================================== */
router.post("/", auth, async (req, res) => {
  try {
    const { title, content } = req.body;

    const note = await Note.create({
      title,
      content,
      userId: req.user.id,
      summary: "Processing...",
      quiz: "Pending..."
    });

    // Reward the user with 10 points
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 10 } });

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
        console.error("AI Background Update Failed", err.message);
      }
    })();
  } catch (err) {
    res.status(500).json({ message: "Failed to save note" });
  }
});

/* ======================================================
   🚀 NEW: AI TUTOR ROUTE (Uses Axios + flash-latest)
   ====================================================== */
router.post("/ask-tutor", auth, async (req, res) => {
  try {
    const { noteId, question } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: "AI API Key missing in server" });
    }

    // 1. Fetch the specific note to provide context
    const note = await Note.findOne({ _id: noteId, userId: req.user.id });
    if (!note) return res.status(404).json({ message: "Note not found" });

    // 2. Prepare the AI URL (Using your working Axios method)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    // 3. Request logic
    const response = await axios.post(url, {
      contents: [{
        parts: [{
          text: `You are an expert Academic Tutor. 
          Use the following study note to answer the student's question.
          
          NOTE CONTENT: ${note.content}
          
          STUDENT QUESTION: ${question}
          
          INSTRUCTIONS: 
          - Be helpful, concise, and encourage the student.
          - Use bullet points for clarity if needed.`
        }]
      }]
    });

    // 4. Send answer back to frontend
    if (response.data && response.data.candidates) {
      const answer = response.data.candidates[0].content.parts[0].text;
      res.json({ answer });
    } else {
      res.status(500).json({ message: "AI returned an empty response" });
    }

  } catch (err) {
    console.error("Tutor Error:", err.response ? JSON.stringify(err.response.data) : err.message);
    res.status(500).json({ message: "AI Tutor is currently busy." });
  }
});

module.exports = router;