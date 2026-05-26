// routes/spots.js
const express = require("express");
const router = express.Router();
const Spot = require("../models/Spot");
const { body, validationResult } = require("express-validator");
const isAuthenticated = (req, res, next) => {
  console.log("Session:", req.session);
  if (!req.session.userId) {
    return res.status(401).json({ error: "You must be logged in" });
  }
  next();
};

router.get("/", async (req, res) => {
  try {
    const spots = await Spot.find({ isDeleted: false })
      .populate("author", "username avatar")
      .sort({ createdAt: -1 });
    res.json(spots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const spot = await Spot.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("author", "username avatar");
    if (!spot) return res.status(404).json({ error: "Spot not found" });
    res.json(spot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const spotValidation = [
  body("title").trim().escape().notEmpty().withMessage("Title is required"),
  body("description").trim().escape().optional(),
  body("category").trim().isIn(["food", "study", "sightseeing", "other"]),
  body("lat").isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),
  body("lng").isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
];

router.post("/", isAuthenticated, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { title, description, category, photos, tags, lat, lng, rating } =
      req.body;
    const spot = await Spot.create({
      title,
      description,
      category,
      photos: photos || [],
      tags: tags || [],
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      author: req.session.userId,
      ratingAvg: rating ? parseFloat(rating) : 0,
      ratingCount: rating ? 1 : 0,
    });
    res.status(201).json(spot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    const spot = await Spot.findOne({ _id: req.params.id, isDeleted: false });
    if (!spot) return res.status(404).json({ error: "Spot not found" });

    if (spot.author.toString() !== req.session.userId.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this spot" });
    }

    const { title, description, category, photos, tags, rating } = req.body;
    spot.title = title || spot.title;
    spot.description = description || spot.description;
    spot.category = category || spot.category;
    spot.photos = photos || spot.photos;
    spot.tags = tags || spot.tags;
    if (rating !== undefined) {
      spot.ratingAvg = rating ? parseFloat(rating) : 0;
      spot.ratingCount = rating ? 1 : 0;
    }
    await spot.save();

    res.json(spot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const spot = await Spot.findOne({ _id: req.params.id, isDeleted: false });
    if (!spot) return res.status(404).json({ error: "Spot not found" });

    const isAuthor = spot.author.toString() === req.session.userId.toString();
    const isAdmin = req.session.role === "admin";
    if (!isAuthor && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this spot" });
    }

    spot.isDeleted = true;
    await spot.save();
    res.json({ message: "Spot deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
