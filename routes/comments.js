const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Spot = require("../models/Spot");

const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "You must be logged in" });
  }
  next();
};

router.get("/:spotId/comments", async (req, res) => {
  try {
    const comments = await Comment.find({
      spot: req.params.spotId,
      isDeleted: false,
    })
      .populate("author", "username avatar")
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:spotId/comments", isAuthenticated, async (req, res) => {
  try {
    const spot = await Spot.findOne({
      _id: req.params.spotId,
      isDeleted: false,
    });
    if (!spot) return res.status(404).json({ error: "Spot not found" });

    const { body, rating } = req.body;
    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }

    let parsedRating = null;
    if(rating !== undefined && rating !== null && rating !== ""){
      parsedRating = parseFloat(rating);
      if(isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5){
        return res.status(400).json({ error: "Rating must be between 0 and 5"});
      }
    }

    if(parsedRating !== null){
      spot.ratingCount += 1;
      spot.ratingAvg = ((spot.ratingAvg * (spot.ratingCount - 1)) + parsedRating) / spot.ratingCount;
      await spot.save();
    }

    const comment = await Comment.create({
      body,
      rating: parsedRating,
      author: req.session.userId,
      spot: req.params.spotId,
    });

    await comment.populate("author", "username avatar");
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/comments/:id", isAuthenticated, async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const isAuthor =
      comment.author.toString() === req.session.userId.toString();
    const isAdmin = req.session.role === "admin";
    if (!isAuthor && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment" });
    }

    comment.isDeleted = true;
    await comment.save();

    if(comment.rating !== null){
      const spot = await Spot.findById(comment.spot);
      if(spot){
        if(spot.ratingCount <= 1){
          spot.ratingAvg = 0;
          spot.ratingCount = 0;
        } else{
          spot.ratingAvg = ((spot.ratingAvg * spot.ratingCount) - comment.rating) / (spot.ratingCount - 1);
          spot.ratingCount -= 1;
        }
        await spot.save();
      }
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
