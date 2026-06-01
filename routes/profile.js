const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Spot = require('../models/Spot');

router.get('/user/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const postCount = await Spot.countDocuments({ author: req.session.userId });

        res.json({
            userId: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            role: user.role,
            postCount,
            joinDate: user.createdAt
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/user/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    try {
        const { username, bio, avatar } = req.body;

        const existing = await User.findOne({ username });
        if (existing && String(existing._id) !== String(req.session.userId)) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const user = await User.findByIdAndUpdate(
            req.session.userId,
            { username, bio, avatar },
            { new: true }
        );

        res.json({ success: true, username: user.username, bio: user.bio, avatar: user.avatar });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;