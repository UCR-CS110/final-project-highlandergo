const express = require('express');
const router = express.Router();
const Spot = require('../models/Spot');
const Comment = require('../models/Comment');

function isAdmin(req, res, next){
  if(!req.session.userId || req.session.role !== 'admin'){
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.get('/spots', isAdmin, async (req, res) => {
  try {
    const spots = await Spot.find({ isDeleted: false })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    res.json(spots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/comments', isAdmin, async (req, res) => {
  try {
    const comments = await Comment.find({ isDeleted: false })
      .populate('author', 'username')
      .populate('spot', 'title')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/spots/:id', isAdmin, async (req, res) => {
  try {
    const spot = await Spot.findOne({ _id: req.params.id, isDeleted: false });
    if(!spot) return res.status(404).json({ error: 'Spot not found' });

    const { title, description, category } = req.body;
    if(title) spot.title = title;
    if(description !== undefined) spot.description = description;
    if(category) spot.category = category;
    await spot.save();
    res.json(spot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/comments/:id', isAdmin, async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });
    if(!comment) return res.status(404).json({ error: 'Comment not found' });

    const { body } = req.body;
    if(body && body.trim()) comment.body = body.trim();
    await comment.save();
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/spots/:id', isAdmin, async (req, res) => {
  try {
    const spot = await Spot.findOne({ _id: req.params.id, isDeleted: false });
    if(!spot) return res.status(404).json({ error: 'Spot not found' });
    spot.isDeleted = true;
    await spot.save();
    res.json({ message: 'Spot deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/comments/:id', isAdmin, async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });
    if(!comment) return res.status(404).json({ error: 'Comment not found' });

    comment.isDeleted = true;
    await comment.save();

    if(comment.rating !== null){
      const spot = await Spot.findById(comment.spot);
      if(spot){
        if(spot.ratingCount <= 1){
          spot.ratingAvg = 0;
          spot.ratingCount = 0;
        } else {
          spot.ratingAvg = (spot.ratingAvg * spot.ratingCount - comment.rating) / (spot.ratingCount - 1);
          spot.ratingCount -= 1;
        }
        await spot.save();
      }
    }

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;