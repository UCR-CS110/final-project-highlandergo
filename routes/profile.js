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

router.get('/user/public/:username', async (req, res) => {
    try {
        const targetUser = await User.findOne({ username: req.params.username });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const postCount = await Spot.countDocuments({ author: targetUser._id, isDeleted: false });
        const isSelf = req.session.userId && String(req.session.userId) === String(targetUser._id);

        let isFollowing = false;
        if (req.session.userId && !isSelf) {
            const me = await User.findById(req.session.userId).select('following');
            isFollowing = me ? me.following.some(id => String(id) === String(targetUser._id)) : false;
        }

        res.json({
            username: targetUser.username,
            avatar: targetUser.avatar,
            bio: targetUser.bio,
            postCount,
            joinDate: targetUser.createdAt,
            isSelf,
            isFollowing
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/user/follow/:username', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
    try {
        const targetUser = await User.findOne({ username: req.params.username });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });
        if (String(req.session.userId) === String(targetUser._id))
            return res.status(400).json({ error: 'Cannot follow yourself' });

        await User.findByIdAndUpdate(req.session.userId, { $addToSet: { following: targetUser._id } });
        res.json({ isFollowing: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/user/follow/:username', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
    try {
        const targetUser = await User.findOne({ username: req.params.username });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        await User.findByIdAndUpdate(req.session.userId, { $pull: { following: targetUser._id } });
        res.json({ isFollowing: false });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
