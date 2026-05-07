const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");

// User registation
router.get("/register", (req, res) => {
  res.sendFile("register.html", { root: "./public" });
});

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email is already in use" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    req.session.userId = user._id;
    req.session.role = user.role;
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login
router.get("/login", (req, res) => {
  res.sendFile("login.html", { root: "./public" });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    req.session.userId = user._id;
    req.session.role = user.role;
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during lofin" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

module.exports = router;
