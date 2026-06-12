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
    try{
        const user = await User.findOne({ username: req.params.username });
        if(!user){
            return res.status(404).json({ error: 'User not found' });
        }

        const postCount = await Spot.countDocuments({ author: user._id });
        
        let isFollowing = false;
        let isSelf = false;

        if(req.session.userId){
            isSelf = String(req.session.userId) === String(user._id);
            if(!isSelf){
                const me = await User.findById(req.session.userId).select('following');
                isFollowing = me
                    ? me.following.some(id => String(id) === String(user._id))
                    : false;
            }
        }

        res.json({
            userId: user._id,
            username: user.username,
            avatar: user.avatar,
            bio: user.bio,
            postCount,
            joinDate: user.createdAt,
            isFollowing,
            isSelf,
        });
    } catch(err){
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/user/follow/:username', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'You must be logged in to follow users.' });
    }
    try {
        const target = await User.findOne({ username: req.params.username });
        if (!target) return res.status(404).json({ error: 'User not found' });

        if (String(req.session.userId) === String(target._id)) {
            return res.status(400).json({ error: 'You cannot follow yourself.' });
        }

        await User.findByIdAndUpdate(
            req.session.userId,
            { $addToSet: { following: target._id } }
        );

        res.json({ success: true, isFollowing: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/user/follow/:username', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'You must be logged in.' });
    }
    try {
        const target = await User.findOne({ username: req.params.username });
        if (!target) return res.status(404).json({ error: 'User not found' });

        await User.findByIdAndUpdate(
            req.session.userId,
            { $pull: { following: target._id } }
        );

        res.json({ success: true, isFollowing: false });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;