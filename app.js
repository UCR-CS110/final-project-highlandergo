require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: true,
}));

connectDB();
app.listen(3000, () => console.log('Server running on port 3000'));

app.get('/', (req, res) => {
  res.send('Server is running on localhost:3000');
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/my_database')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('Database connection error:', err));