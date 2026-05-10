const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
    res.sendFile("map.html", { root: "./public" });
});

module.exports = router;
