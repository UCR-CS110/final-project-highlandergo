require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./db');
const authRoutes = require("./routes/auth");
const mapRoutes = require("./routes/map");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
}));
app.use('/auth', authRoutes);
app.use('/map', mapRoutes);

app.get('/', (req, res) => {
    res.send('Highlander GO! is running on localhost:3000');
    //res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function isLoggedIn(req, res, next) {
    if (req.session.userId) return next(); // ← use session instead
    res.redirect('/auth/login');
}

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/map', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'map.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});