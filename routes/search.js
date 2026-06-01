// routes/search.js
const express = require("express");
const router = express.Router();
const Spot = require("../models/Spot");

router.get("/", async (req, res) => {
  try {
    const { q, category, lat, lng } = req.query;

    const query = { isDeleted: false };

    if (q && q.trim().length > 0) {
      query.$text = { $search: q.trim() };
    }

    if (category && category !== "all") {
      query.category = category;
    }

    let spots;
    if (q && q.trim().length > 0) {
      spots = await Spot.find(query, { score: { $meta: "textScore" } })
        .populate("author", "username avatar")
        .sort({ score: { $meta: "textScore" }, ratingAvg: -1 })
        .limit(20);
    } else {
      spots = await Spot.find(query)
        .populate("author", "username avatar")
        .sort({ ratingAvg: -1, createdAt: -1 })
        .limit(20);
    }

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      spots = spots.map((spot) => {
        const spotObj = spot.toObject();
        if (spot.location && spot.location.coordinates) {
          const [sLng, sLat] = spot.location.coordinates;
          const R = 6371;
          const dLat = ((sLat - userLat) * Math.PI) / 180;
          const dLng = ((sLng - userLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((userLat * Math.PI) / 180) *
              Math.cos((sLat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          spotObj.distance = (
            R *
            2 *
            Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          ).toFixed(2);
        }
        return spotObj;
      });
    }

    res.json(spots);
  } catch (err) {
    if (err.message.includes("text index required")) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
