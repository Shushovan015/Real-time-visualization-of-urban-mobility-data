const mongoose = require("mongoose");

const PlaceSchema = new mongoose.Schema(
  {
    placeId: { type: String, index: true, unique: true }, 
    name: { type: String, required: true, index: true },
    centroid: {
      lat: Number,
      lon: Number,
    },
    geometry_type: String,
    geometry: mongoose.Schema.Types.Mixed,
    kind: { type: String, index: true },
    subkind: { type: String, index: true },
    touristInterest: { type: Number, min: 0, max: 1, default: null },
    popularity: {
      score: { type: Number, default: null }, 
      normalized: { type: Number, default: null }, 
      rating: { type: Number, default: null }, 
      reviewCount: { type: Number, default: null },
      wiki30d: { type: Number, default: null },
      otmRate: { type: Number, default: null },
      histWeeklyMean: { type: Number, default: null },
      source: { type: String, default: null },
      updatedAt: { type: Date, default: Date.now },
    },
    capacity: { type: Number, default: null }, 
    properties: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Place", PlaceSchema);
