const express = require("express");
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

// POST: Add a task
router.post("/", auth, async (req, res) => {
  try {
    // 🚩 FIX: Use req.user.id to get the string/ObjectId
    const task = await Task.create({ ...req.body, userId: req.user.id });
    res.status(201).json(task);
  } catch (err) {
    console.error("Task Create Error:", err);
    res.status(500).json({ error: "Could not create task" });
  }
});

// GET: Fetch only the user's tasks
router.get("/", auth, async (req, res) => {
  try {
    // 🚩 FIX: Use req.user.id for filtering
    const tasks = await Task.find({ userId: req.user.id }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch tasks" });
  }
});

// PUT: Update a task
router.put("/:id", auth, async (req, res) => {
  try {
    // 🚩 FIX: Ensure the user owns the task they are updating
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!task) return res.status(404).json({ msg: "Task not found" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE: Remove a task
router.delete("/:id", auth, async (req, res) => {
  try {
    // 🚩 FIX: Ensure the user can only delete their OWN task
    const task = await Task.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!task) {
      return res.status(404).json({ msg: "Task not found or unauthorized" });
    }

    res.json({ msg: "Task deleted successfully" });
  } catch (err) {
    console.error("Delete Task Error:", err);
    res.status(500).json({ error: "Server error during deletion" });
  }
});

module.exports = router;