const express = require("express");
const router = express.Router();
const path = require("path");

router.get("/", (req, res) => {
  res.sendFile("map.html", { root: "./public" });
});

router.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/user_profile/profile.html'));
});

module.exports = router;
