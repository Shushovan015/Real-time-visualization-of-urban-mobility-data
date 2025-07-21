const mongoose = require("mongoose");
const CrowdData = require("./models/CrowdData");
const MovementData = require("./models/MovementData");

(async () => {
  await mongoose.connect(process.env.MONGO_URL);

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  await CrowdData.deleteMany({ timestamp: { $lt: cutoff } });
  await MovementData.deleteMany({ timestamp: { $lt: cutoff } });

  console.log("🧹 Old MongoDB data removed.");
  process.exit();
})();
