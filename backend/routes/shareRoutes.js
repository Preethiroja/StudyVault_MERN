const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const FileShare = require("../models/FileShare");
const auth = require("../middleware/authMiddleware");

const storage = multer.diskStorage({
  destination:(req,file,cb)=>cb(null,"uploads/"),
  filename:(req,file,cb)=>cb(null,uuidv4()+"_"+file.originalname)
});
const upload = multer({storage});
const router = express.Router();

router.post("/", auth, upload.single("file"), async(req,res)=>{
  const expiresAt = new Date(Date.now()+1000*60*60); // 1 hour
  const file = await FileShare.create({userId:req.user, filename:req.file.originalname, path:req.file.path, expiresAt});
  res.json(file);
});

router.get("/", auth, async(req,res)=>{
  const files = await FileShare.find({userId:req.user, expiresAt:{$gt:new Date()}});
  res.json(files);
});

module.exports = router;
