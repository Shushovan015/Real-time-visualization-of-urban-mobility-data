const express = require("express");
const app = express();
const CrowdData = require("./models/CrowdData");

app.get("/api/crowd/recent", async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes) || 30; 
    const startTime = new Date(Date.now() - minutes * 60 * 1000);

    const recent = await CrowdData.find({ timestamp: { $gte: startTime } });
    res.json(recent);
  } catch (err) {
    console.error("Error in /api/crowd/recent:", err);
    res.status(500).json({ error: "Failed to fetch recent data" });
  }
});

app.get("/api/crowd/hourly-history", async (req, res) => {
  try {
    const { location } = req.query;
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const data = await CrowdData.aggregate([
      {
        $match: {
          location,
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            hour: { $hour: "$timestamp" }
          },
          visitors: { $sum: "$visitors" }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
          "_id.hour": 1
        }
      }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Error in /api/crowd/hourly-history:", err);
    res.status(500).json({ error: "Failed to fetch hourly history" });
  }
});

