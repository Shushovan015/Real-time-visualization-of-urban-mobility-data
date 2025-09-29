const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const client = require("./redisClient");
const storeSimulatedData = require("./crowdSimulator");
const CrowdData = require("./models/CrowdData");
const Place = require("./models/Places");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/api/places", async (req, res) => {
  try {
    const docs = await Place.find({}).lean(); 
    res.json(docs);
  } catch (err) {
    console.error("GET /api/places error:", err);
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

app.get("/api/crowd", async (req, res) => {
  try {
    const keys = await client.keys("crowd:*");
    const values = await Promise.all(keys.map((key) => client.get(key)));
    const parsed = values
      .map((value) => JSON.parse(value))
      .filter((entry) => typeof entry.timestamp === "string")
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    res.json(parsed);
  } catch (error) {
    console.error("Error fetching Redis data:", error);
    res.status(500).json({ error: "Failed to fetch crowd data" });
  }
});

app.get("/api/crowd/live", async (req, res) => {
  try {
    const latest = await client.get("crowd:last");
    if (!latest) return res.status(404).json({ error: "No recent data" });
    res.json(JSON.parse(latest));
  } catch (err) {
    console.error("Error fetching real-time data:", err);
    res.status(500).json({ error: "Failed to fetch real-time data" });
  }
});

app.get("/api/crowd/mongo/recent", async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes);
    if (isNaN(minutes) || minutes <= 0) return res.json([]);
    const now = Date.now();
    const targetStart = new Date(now - minutes * 60 * 1000);
    const targetEnd = new Date(targetStart.getTime() + 60 * 1000);
    const records = await CrowdData.aggregate([
      { $match: { timestamp: { $gte: targetStart, $lt: targetEnd } } },
      {
        $lookup: {
          from: "places",
          localField: "placeId", 
          foreignField: "placeId", 
          as: "place",
        },
      },
      { $unwind: { path: "$place", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          location: 1,
          lat: 1,
          lon: 1,
          visitors: 1,
          timestamp: 1,
          geometry: 1,
          properties: 1,
          kind: "$place.kind",
          subkind: "$place.subkind",
        },
      },
      { $sort: { timestamp: 1 } },
    ]);
    if (records.length === 0) return res.json([]);
    const formatted = [
      {
        timestamp: records[0].timestamp,
        data: records,
      },
    ];
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching Mongo minute crowd data:", err);
    res.status(500).json({ error: "Failed to fetch recent data" });
  }
});

app.get("/api/crowd/hourly-history", async (req, res) => {
  try {
    const { location } = req.query;
    if (!location)
      return res.status(400).json({ error: "Location is required" });
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const data = await CrowdData.aggregate([
      { $match: { location, timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            hour: { $hour: "$timestamp" },
          },
          visitors: { $sum: "$visitors" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
    ]);
    res.json(data);
  } catch (err) {
    console.error("Error in /api/crowd/hourly-history:", err);
    res.status(500).json({ error: "Failed to fetch hourly history" });
  }
});

app.get("/api/crowd/hourly-history-all", async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const data = await CrowdData.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo, $lte: now } } },
      {
        $group: {
          _id: {
            location: "$location",
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            hour: { $hour: "$timestamp" },
          },
          visitors: { $sum: "$visitors" },
        },
      },
      {
        $sort: {
          "_id.location": 1,
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
          "_id.hour": 1,
        },
      },
    ]);
    const formatted = {};
    for (const entry of data) {
      const { location, year, month, day, hour } = entry._id;
      const time = new Date(year, month - 1, day, hour).toISOString();
      if (!formatted[location]) formatted[location] = [];
      formatted[location].push({ time, visitors: entry.visitors });
    }
    res.json(formatted);
  } catch (err) {
    console.error("Error in /api/crowd/hourly-history-all:", err);
    res.status(500).json({ error: "Failed to fetch all hourly history" });
  }
});

app.get("/api/recommendations/now-next", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon are required" });
    }

    const userPoint = { lat: parseFloat(lat), lon: parseFloat(lon) };

    const latestRecord = await CrowdData.findOne()
      .sort({ timestamp: -1 })
      .lean();
    if (!latestRecord) {
      return res.status(404).json({ error: "No recent data" });
    }
    const latestTimestamp = latestRecord.timestamp;

    const [latestData, places] = await Promise.all([
      CrowdData.find({ timestamp: latestTimestamp }).lean(),
      Place.find(
        {},
        { placeId: 1, name: 1, kind: 1, subkind: 1, touristInterest: 1 }
      ).lean(),
    ]);

    const placeById = new Map(places.map((p) => [p.placeId, p]));
    const maxPopularity = Math.max(
      1,
      ...latestData.map((p) => p.properties?.popularity || 0)
    );

    const DENSITY_THRESHOLDS = {
      quiet: 0.2,
      comfortable: 0.5,
      lively: 1.0,
      crowded: 3.0,
      unsafe: 5.0,
    };

    const KIND_DENY = new Set(["bus_stop", "parking", "office", "residential"]);
    const KIND_ALLOW = new Set([
      "attraction",
      "museum",
      "church",
      "cathedral",
      "park",
      "viewpoint",
      "beergarden",
      "restaurant",
      "square",
      "market",
      "castle",
      "monument",
      "theatre",
      "gallery",
      "bridge",
      "river_cruise",
    ]);
    const TOURIST_MIN = 0.4;

    const isTourist = (meta = {}) => {
      const ki = (meta.kind || "").toLowerCase();
      const sk = (meta.subkind || "").toLowerCase();
      const ti = meta.touristInterest ?? null;

      if (ti !== null) return ti >= TOURIST_MIN;
      if (KIND_DENY.has(ki) || KIND_DENY.has(sk)) return false;
      if (KIND_ALLOW.has(ki) || KIND_ALLOW.has(sk)) return true;
      return false;
    };

    const recommendations = latestData
      .filter((p) => {
        const distM = require("haversine-distance")(userPoint, {
          lat: p.lat,
          lon: p.lon,
        });
        if (distM > 1500) return false;
        const meta = placeById.get(p.placeId) || {};
        return isTourist(meta);
      })
      .map((p) => {
        const meta = placeById.get(p.placeId) || {};
        const area = p.geometry_value || (p.properties?.area ?? 1);
        const capacity = area * DENSITY_THRESHOLDS.comfortable;
        const pressure = capacity > 0 ? p.visitors / capacity : 0;

        const pressureNorm = Math.min(pressure / 1.2, 1);
        const popularityNorm = (p.properties?.popularity || 0) / maxPopularity;
        const trendFactor = p.flow?.ratePerMin < 0 ? 1 : 0;

        const score =
          popularityNorm * 0.6 + (1 - pressureNorm) * 0.3 + trendFactor * 0.1;

        return {
          location: p.location,
          lat: p.lat,
          lon: p.lon,
          popularity: p.properties?.popularity || 0,
          pressure,
          score,
          trend: p.flow?.ratePerMin ?? 0,
          kind: meta.kind ?? null,
          subkind: meta.subkind ?? null,
          touristInterest: meta.touristInterest ?? null,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    res.json(recommendations);
  } catch (err) {
    console.error("Error in /api/recommendations/now-next:", err);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

const cleanLegacyEntries = async () => {
  const keys = await client.keys("crowd:*");
  for (const key of keys) {
    const value = JSON.parse(await client.get(key));
    if (!value.movement) {
      await client.del(key);
      console.log("Deleted legacy key:", key);
    }
  }
};

setInterval(() => storeSimulatedData(), 60 * 1000);

mongoose
  .connect(process.env.MONGO_URL || "mongodb://localhost:27017/crowdDB")
  .then(() => console.log("🗄️ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  await cleanLegacyEntries();
  storeSimulatedData(); 
});
