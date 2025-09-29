export function classifyPoi({ gTypes = [], otmKinds = "" }) {
  const t = new Set(gTypes.map(s => s.toLowerCase()));
  const k = `,${String(otmKinds).toLowerCase()},`;

  const has = (s) => t.has(s);
  const kin = (s) => k.includes(`,${s},`);

  if (has("bus_station") || has("bus_stop") || has("transit_station") || has("subway_station") || has("train_station") || kin("transport")) {
    return "transport";
  }
  if (has("museum") || has("tourist_attraction") || has("art_gallery") || has("church") || has("place_of_worship") || has("point_of_interest") && (kin("historic") || kin("monuments") || kin("museums") || kin("churches") || kin("interesting_places"))) {
    return "attraction";
  }
  if (has("restaurant") || has("cafe") || has("bar") || has("beer_garden") || has("toilet") || kin("foods")) {
    return "service";
  }
  return "other";
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));

function normLog(x, k = 8) { return clamp01(Math.log1p(x) / k); }
function normRating(r) { return clamp01(((r ?? 0) - 3) / 2); } 
function normOtmRate(r) { return clamp01((r ?? 0) / 3); }     

export function touristInterest(kind, { rating, reviewCount, otmRate, wiki30d }) {
  if (kind === "transport") return 0;
  const score =
    0.55 * normRating(rating) +
    0.25 * normLog(reviewCount ?? 0, 8) +
    0.15 * normOtmRate(otmRate ?? 0) +
    0.05 * normLog(wiki30d ?? 0, 10);
  return clamp01(score);
}
