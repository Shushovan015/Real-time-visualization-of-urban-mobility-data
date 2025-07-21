const mongoose = require("mongoose");

const MovementSchema = new mongoose.Schema({
  from: {
    location: String,
    lat: Number,
    lon: Number,
  },
  to: {
    location: String,
    lat: Number,
    lon: Number,
  },
  visitors: Number,
  timestamp: { type: Date, required: true },
});

module.exports = mongoose.model("MovementData", MovementSchema);
