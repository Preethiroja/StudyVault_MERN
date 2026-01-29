const express = require("express");
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", auth, async(req,res)=>{
  const task = await Task.create({...req.body, userId:req.user});
  res.json(task);
});

router.get("/", auth, async(req,res)=>{
  const tasks = await Task.find({userId:req.user});
  res.json(tasks);
});

router.put("/:id", auth, async(req,res)=>{
  const task = await Task.findById(req.params.id);
  Object.assign(task, req.body);
  await task.save();
  res.json(task);
});

module.exports = router;