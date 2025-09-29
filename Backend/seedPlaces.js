require("dotenv").config();
const mongoose = require("mongoose");
const levenshtein = require("fast-levenshtein");
const Place = require("./models/Places.js");

const placeData = require("./data/grid-places.json");
const popularityRaw = require("./data/popularity.json");

const normalize = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

(async () => {
  await mongoose.connect(process.env.MONGO_URL);

  const popByName = new Map();
  const popById = new Map();
  const popEntries = Array.isArray(popularityRaw)
    ? popularityRaw
    : Object.entries(popularityRaw).map(([placeId, val]) => ({
        placeId,
        ...val,
      }));

  for (const p of popEntries) {
    const name = p.name || p.place || p.placeName || p.placeId;
    if (name) popByName.set(normalize(name), p);
    if (p.placeId) popById.set(normalize(p.placeId), p);
  }

  const getPopularityFor = (name, placeId) => {
    if (placeId) {
      const byId = popById.get(normalize(placeId));
      if (byId) return byId;
    }
    const key = normalize(name);
    const byName = popByName.get(key);
    if (byName) return byName;

    let best = null,
      bestDist = Infinity;
    for (const [k, val] of popByName.entries()) {
      const d = levenshtein.get(key, k);
      if (d < bestDist) {
        bestDist = d;
        best = val;
      }
    }
    return bestDist <= 4 ? best : null;
  };

  for (const p of placeData) {
    const type = (p.geometry_type || "").toLowerCase();
    let centroid = null;
    if (type === "point") {
      const [lon, lat] = p.coordinates || [];
      if (typeof lat === "number" && typeof lon === "number") {
        centroid = { lat, lon };
      }
    } else if (type === "polygon") {
      const coords = p.coordinates?.[0] || [];
      if (coords.length >= 3) {
        const [sumLon, sumLat] = coords.reduce(
          ([a, b], [lon, lat]) => [a + lon, b + lat],
          [0, 0]
        );
        centroid = { lon: sumLon / coords.length, lat: sumLat / coords.length };
      }
    } else if (type === "linestring") {
      const coords = p.coordinates || [];
      if (coords.length >= 2) {
        const [sumLon, sumLat] = coords.reduce(
          ([a, b], [lon, lat]) => [a + lon, b + lat],
          [0, 0]
        );
        centroid = { lon: sumLon / coords.length, lat: sumLat / coords.length };
      }
    }

    const popularity = getPopularityFor(p.name, p.placeId) || {};
    const popularityNorm =
      typeof popularity.popularity === "number"
        ? Math.max(0, Math.min(1, popularity.popularity))
        : typeof popularity.rating === "number"
        ? Math.max(0, Math.min(1, popularity.rating / 5))
        : null;

    const capacity = p.properties?.area_m2
      ? Math.round(p.properties.area_m2 * (p.properties.comfortPpm2 || 1.5))
      : null;

    function classifyFromName(name = "") {
      const n = String(name).toLowerCase().trim();
      const ends = (re) => re.test(n);
      if (n.includes("zob") || n.includes("omnibus"))
        return { kind: "transport", subkind: "bus_station" };
      if (ends(/(brücke)$/)) return { kind: "public_space", subkind: "bridge" };
      if (ends(/(promenade|promenadestraße)$/))
        return { kind: "public_space", subkind: "promenade" };
      if (n.includes("grüner markt") || n.includes("obstmarkt"))
        return { kind: "public_space", subkind: "market_square" };
      if (ends(/(platz)$/)) return { kind: "public_space", subkind: "square" };
      if (ends(/(straße|strasse|gasse|gassen)$/))
        return { kind: "public_space", subkind: "street" };
      return { kind: "public_space", subkind: "street" };
    }

    const { kind, subkind } = (() => {
      const k = popularity.kind;
      const sk = popularity.subkind;
      if (k && sk) return { kind: k, subkind: sk };
      if (k && !sk) {
        const guess = classifyFromName(p.name);
        return { kind: k, subkind: guess.subkind };
      }
      return classifyFromName(p.name);
    })();

    function clamp01(x) {
      return Math.max(0, Math.min(1, x));
    }
    function normLog(x, k = 8) {
      return clamp01(Math.log1p(x) / k);
    }
    function normRating(r) {
      return clamp01(((r ?? 0) - 3) / 2);
    } 

    const touristInterestFallback = (() => {
      if (kind === "transport") return 0;
      const r = popularity.rating ?? 0;
      const rc = popularity.reviewCount ?? popularity.reviews ?? 0;
      const otm = popularity.otmRate ?? 0;
      const wiki = popularity.wiki30d ?? 0;
      const score =
        0.55 * normRating(r) +
        0.25 * normLog(rc, 8) +
        0.15 * clamp01(otm / 3) +
        0.05 * normLog(wiki, 10);
      return Number(clamp01(score).toFixed(3));
    })();
    await Place.updateOne(
      { placeId: p.placeId || p.id || p.name }, 
      {
        $set: {
          placeId: p.placeId || p.id || p.name,
          name: p.name,
          centroid,
          geometry_type: type,
          capacity,
          kind: popularity.kind || "other",
          touristInterest:
            typeof popularity.touristInterest === "number"
              ? Math.max(0, Math.min(1, popularity.touristInterest))
              : null,
          kind,
          subkind,
          touristInterest:
            typeof popularity.touristInterest === "number"
              ? clamp01(popularity.touristInterest)
              : touristInterestFallback,
          popularity: {
            score:
              typeof popularity.popularity === "number"
                ? popularity.popularity
                : null,
            normalized: popularityNorm,
            rating:
              typeof popularity.rating === "number" ? popularity.rating : null,
            reviewCount: popularity.reviewCount ?? popularity.reviews ?? null,
            wiki30d: popularity.wiki30d ?? null,
            otmRate: popularity.otmRate ?? null,
            otmKinds: popularity.otmKinds ?? null,
            histWeeklyMean: popularity.histWeeklyMean ?? null,
            source: popularity.source || "popularity.json",
            updatedAt: new Date(),
          },
        },
      },
      { upsert: true }
    );
  }

  console.log("Places collection seeded/updated.");
  await mongoose.disconnect();
  process.exit(0);
})().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
