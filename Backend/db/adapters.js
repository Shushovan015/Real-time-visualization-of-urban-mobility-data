import mongoose from "mongoose";
import "dotenv/config";
const uri = process.env.MONGO_URL;

const CrowdSchema = new mongoose.Schema({
  location: String, 
  lat: Number,
  lon: Number,
  timestamp: Date,
  visitors: Number,
});

const Crowd =
  mongoose.models.CrowdData ||
  mongoose.model("crowddatas", CrowdSchema, "crowddatas");

export async function connect() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(uri, { dbName: undefined });
}

export async function getPlaces() {
  await connect();
  const docs = await Crowd.aggregate([
    {
      $group: {
        _id: "$location",
        lat: { $first: "$lat" },
        lon: { $first: "$lon" },
      },
    },
  ]);
  return docs.map((d) => ({
    placeId: d._id, 
    name: d._id,
    lat: d.lat,
    lon: d.lon,
  }));
}

export async function getHistWeeklyMeans() {
  await connect();
  const since = new Date(Date.now() - 8 * 7 * 24 * 3600 * 1000); 
  const agg = await Crowd.aggregate([
    { $match: { timestamp: { $gte: since } } },
    { $group: { _id: "$location", mean: { $avg: "$visitors" } } },
  ]);
  const out = {};
  for (const r of agg) out[r._id] = Math.round(r.mean || 0);
  return out;
}

export async function setExternalIds(placeId, { google_place_id, wiki }) {
  return;
}
