import "dotenv/config";
import { buildPopularity } from "../popularity/buildPopularity.js";

(async () => {
  try {
    const out = await buildPopularity();
    console.log(`Popularity built for ${Object.keys(out).length} places`);
    process.exit(0);
  } catch (e) {
    console.error("Popularity build failed:", e);
    process.exit(1);
  }
})();
