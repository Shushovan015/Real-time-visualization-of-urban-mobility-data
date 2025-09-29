import fs from "fs/promises";
import path from "path";
import {
  googlePlaceId,
  googlePlaceStats,
  wikiNearestPage,
  wikiPageviews30d,
  openTripInfo,
} from "./fetchers.js";
import {
  getPlaces,
  getHistWeeklyMeans,
  setExternalIds,
} from "../db/adapters.js";
import { classifyPoi, touristInterest } from "./classify.js";

function scale(v, min, max) {
  return max === min ? 0 : (v - min) / (max - min);
}

export async function buildPopularity() {
  const places = await getPlaces(); 
  const histMeans = await getHistWeeklyMeans(); 

  for (const p of places) {
    if (!p.google_place_id) {
      p.google_place_id = await googlePlaceId(p);
      if (p.google_place_id) {
        await setExternalIds(p.placeId, { google_place_id: p.google_place_id });
      }
    }
    if (!p.wiki) {
      p.wiki = await wikiNearestPage(p);
      if (p.wiki) {
        await setExternalIds(p.placeId, { wiki: p.wiki });
      }
    }
  }

  const rows = [];
  for (const p of places) {
    const gp = await googlePlaceStats(p.google_place_id);
    const pv = await wikiPageviews30d(p.wiki?.title);
    const otm = await openTripInfo(p);
    const hist = histMeans[p.placeId] || 0;
    const kind = classifyPoi({
      gTypes: gp.types || [],
      otmKinds: otm.kinds || "",
    });

    rows.push({
      placeId: p.placeId, 
      name: p.name,
      reviewCount: gp.user_ratings_total || 0,
      rating: gp.rating || 0,
      wiki30d: pv || 0,
      otmRate: otm || 0,
      histWeeklyMean: hist,
      otmRate: otm.rate || 0,
      otmKinds: otm.kinds || "",
      histWeeklyMean: hist,
      kind,
    });
  }

  const minMax = (key) => {
    const vals = rows.map((r) => r[key] || 0);
    return [Math.min(...vals), Math.max(...vals)];
  };
  const [rcMin, rcMax] = minMax("reviewCount");
  const [pvMin, pvMax] = minMax("wiki30d");
  const [hmMin, hmMax] = minMax("histWeeklyMean");
  const [orMin, orMax] = minMax("otmRate");
  const [rtMin, rtMax] = [3.5, 5.0];

  for (const r of rows) {
    const popularity =
      0.4 * scale(r.histWeeklyMean, hmMin, hmMax) +
      0.25 * scale(r.reviewCount, rcMin, rcMax) +
      0.2 * scale(r.wiki30d, pvMin, pvMax) +
      0.1 * scale(r.otmRate, orMin, orMax) +
      0.05 * scale(Math.max(Math.min(r.rating, 5), 3.5), rtMin, rtMax);

    r.popularity = Number(popularity.toFixed(3));
    r.touristInterest = Number(
      touristInterest(r.kind, {
        rating: r.rating,
        reviewCount: r.reviewCount,
        otmRate: r.otmRate,
        wiki30d: r.wiki30d,
      }).toFixed(3)
    );
  }

  const file = path.join(process.cwd(), "data", "popularity.json");
  await fs.mkdir(path.dirname(file), { recursive: true });
  const out = Object.fromEntries(rows.map((r) => [r.placeId, r]));
  await fs.writeFile(file, JSON.stringify(out, null, 2));

  return out;
}
