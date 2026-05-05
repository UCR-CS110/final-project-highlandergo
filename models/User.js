// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    googleId: {
        type: String,
        default: null
    },
    avatar: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);