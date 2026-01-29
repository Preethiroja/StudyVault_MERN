const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

/* ================= 1. REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed });
    res.json({ msg: "Registered successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Registration failed" });
  }
});

/* ================= 2. LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // ✅ Crucial: Send the user object so Frontend doesn't crash
    res.json({ 
      token, 
      user: { name: user.name, email: user.email } 
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error during login" });
  }
});

/* ================= 3. GET PROFILE ================= */
router.get("/me", async (req, res) => {
  try {
    let token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "No token provided" });

    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

module.exports = router;