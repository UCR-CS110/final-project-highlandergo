const express = require("express");
const router = express.Router();
const { cloudinary, upload } = require("../cloudinary");

const isAuthenticated = (req, res, next) => {
  console.log("Session:", req.session);
  if (!req.session.userId) {
    return res.status(401).json({ error: "You must be logged in" });
  }
  next();
};

router.post("/", isAuthenticated, upload.array("photos", 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.json({ urls: [] });
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "highlandergo" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        stream.end(file.buffer);
      });
    });

    const urls = await Promise.all(uploadPromises);
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;