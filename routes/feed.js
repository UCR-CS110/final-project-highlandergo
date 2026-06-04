const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Spot = require('../models/Spot');

router.get('/comments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const skip = parseInt(req.query.skip) || 0;

    const comments = await Comment.find({ 
        isDeleted: false 
    })
      .populate('author', 'username')
      .populate('spot', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-spots', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const skip = parseInt(req.query.skip) || 0;

    const spots = await Spot.find({ 
      isDeleted: false 
    })
      .sort({ ratingAvg: -1, ratingCount: -1 })
      .skip(skip)
      .limit(limit);
    res.json(spots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;