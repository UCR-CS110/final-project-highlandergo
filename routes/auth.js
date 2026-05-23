const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const axios = require("axios");

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

router.get('/test', (req, res) => {
    res.send('auth router is working');
});

// ✅ Google OAuth - Step 1: redirect to Google
router.get('/google', (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: 'http://localhost:3000/auth/google/callback',
        response_type: 'code',
        scope: 'profile email',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// ✅ Google OAuth - Step 2: handle callback
router.get('/google/callback', async (req, res) => {
    try {
        const { code } = req.query;

        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: 'http://localhost:3000/auth/google/callback',
            grant_type: 'authorization_code',
        });

        const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
        });

        const { id, email, name, picture } = userRes.data;

        let user = await User.findOne({ googleId: id });
        if (!user) {
            user = await User.findOne({ email });
            if (user) {
                user.googleId = id;
                user.avatar = user.avatar || picture;
                await user.save();
            } else {
                user = await User.create({
                    googleId: id,
                    email,
                    username: name.replace(/\s+/g, '_').toLowerCase() + '_' + Math.floor(Math.random() * 1000),
                    avatar: picture,
                    passwordHash: null,
                });
            }
        }

        req.session.userId = user._id;
        req.session.role = user.role;
        res.redirect('/map');
    } catch (err) {
        console.error('Google auth error:', err.message);
        res.redirect('/auth/login');
    }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

module.exports = router;
