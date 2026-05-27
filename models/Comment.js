// models/Comment.js
const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: true,
      maxlength: 280,
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    spot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Spot",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Comment", CommentSchema);
