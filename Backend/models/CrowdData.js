const mongoose = require("mongoose");

const CrowdDataSchema = new mongoose.Schema({
  location: String,
  lat: Number,
  lon: Number,
  visitors: Number,
  timestamp: { type: Date, required: true },
});

module.exports = mongoose.model("CrowdData", CrowdDataSchema);
