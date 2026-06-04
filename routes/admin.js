const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Spot = require('../models/Spot');
const Comment = require('../models/Comment');
const isAdmin = require('../middleware/isAdmin');

// Protect all admin routes
router.use(isAdmin);

// Dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalSpots = await Spot.countDocuments({ deleted: { $ne: true } });
        const recentSignups = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('username email createdAt role');
        res.json({ totalUsers, totalSpots, recentSignups });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find()
            .sort({ createdAt: -1 })
            .select('username email role createdAt');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user role or ban
router.put('/users/:id', async (req, res) => {
    try {
        const { role, banned } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role, banned },
            { new: true }
        ).select('username email role banned');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Soft delete a spot
router.delete('/spots/:id', async (req, res) => {
    try {
        const spot = await Spot.findByIdAndUpdate(
            req.params.id,
            { deleted: true },
            { new: true }
        );
        if (!spot) return res.status(404).json({ error: 'Spot not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all spots
router.get('/spots', async (req, res) => {
    try {
        const spots = await Spot.find({ deleted: { $ne: true } })
            .sort({ createdAt: -1 })
            .populate('author', 'username')
            .select('title category createdAt author');
        res.json(spots);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a comment
router.delete('/comments/:id', async (req, res) => {
    try {
        await Comment.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;