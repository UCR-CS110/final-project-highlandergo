const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Spot = require('../models/Spot');
const User = require('../models/User');

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

router.get('/following', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const limit = parseInt(req.query.limit) || 5;
  const skip = parseInt(req.query.skip) || 0;

  try {
    const me = await User.findById(req.session.userId).select('following');

    if (!me || me.following.length === 0) {
      return res.json([]);
    }

    const comments = await Comment.find({
      isDeleted: false,
      author: { $in: me.following },
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

module.exports = router;