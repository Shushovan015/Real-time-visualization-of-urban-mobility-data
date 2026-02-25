const { createClient } = require("redis");
require("dotenv").config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const client = createClient({ url: redisUrl });

client.on("error", (err) => console.error("Redis error:", err));

(async () => {
  try {
    await client.connect();
    console.log(`Connected to Redis: ${redisUrl}`);
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
  }
})();

module.exports = client;
