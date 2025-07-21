const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const client = require("./redisClient");
const storeSimulatedData = require("./crowdSimulator");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// API endpoint to return all Redis crowd entries (last 30 mins)
app.get("/api/crowd", async (req, res) => {
  try {
    const keys = await client.keys("crowd:*");
    const values = await Promise.all(keys.map((key) => client.get(key)));

    const parsed = values
      .map((value) => JSON.parse(value))
      .filter((entry) => typeof entry.timestamp === "string") // remove bad entries
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    res.json(parsed); // includes data[] and movement[]
  } catch (error) {
    console.error("Error fetching Redis data:", error);
    res.status(500).json({ error: "Failed to fetch crowd data" });
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

// Simulate new crowd+movement data every 10 minutes
setInterval(storeSimulatedData, 5 * 60 * 1000);

mongoose
  .connect(process.env.MONGO_URL || "mongodb://localhost:27017/crowdDB")
  .then(() => console.log("🗄️ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server and generate first dataset
app.listen(PORT, async () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  await cleanLegacyEntries();
  storeSimulatedData();
});
