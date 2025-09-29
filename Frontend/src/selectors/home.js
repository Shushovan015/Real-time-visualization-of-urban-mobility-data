import { createSelector } from "reselect";
import {
  estimateCapacity,
  adaptivePressureThresholds,
  flowRatePerMin,
  simpleBadge,
} from "../utils/baselineUtils";
import haversine from "haversine-distance";

const EMPTY_PUBLIC_DATA = Object.freeze({ data: Object.freeze([]) });
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJ = Object.freeze({});

const publicDataSelector = (state) =>
  state.home.publicData ?? EMPTY_PUBLIC_DATA;
const placesDataSelector = (state) => state.home.placesData ?? EMPTY_ARRAY;
const historySelector = (state) => state.home.historyByPlace ?? EMPTY_OBJ;
const prefsSelector = (state) => state.home.preferences ?? EMPTY_OBJ;
const userLocation = (state) => state.home.userLocation ?? EMPTY_OBJ;

const toLower = (s) => (typeof s === "string" ? s.toLowerCase() : s);

export const mergedLiveSelector = createSelector(
  [publicDataSelector, placesDataSelector],
  (publicData, places) => {
    const live = publicData?.data || [];
    const merged = live.map((pub) => {
      const key = toLower(pub.location);
      const match = places.find(
        (p) => toLower(p.name) === key || toLower(p.placeId) === key
      );
      return match ? { ...pub, ...match } : pub;
    });
    return { ...publicData, data: merged };
  }
);

export const enrichedLiveSelector = createSelector(
  [mergedLiveSelector, historySelector, prefsSelector],
  (mergedLive, historyByPlace, prefs) => {
    const enriched = (mergedLive?.data || [])
      .filter((d) => d.location !== "Zollnerstraße")
      .map((row) => {
        const capacity = estimateCapacity(row);
        const visitors = Number(row.visitors) || 0;
        let pressure = capacity > 0 ? visitors / capacity : 0;

        let { chillMax, livelyMax } = adaptivePressureThresholds(row);

        if (
          prefs.likesLively &&
          row?.popularity?.normalized >= 0.6 &&
          pressure <= livelyMax * 1.1
        ) {
          livelyMax *= 1.1;
        }

        let label = "Chill";
        if (pressure >= chillMax && pressure <= livelyMax) label = "Lively";
        if (pressure > livelyMax) label = "Overcrowded";

        const key = toLower(row.location || row.name || row.placeId);
        const history = historyByPlace[key] || [];
        const flowRate = flowRatePerMin(history, capacity);
        const badge = simpleBadge({ label, pressure, livelyMax, flowRate });

        return {
          ...row,
          capacity,
          pressure,
          label,
          thresholds: { chillMax, livelyMax },
          flow: { ratePerMin: flowRate },
          badge,
        };
      });

    return { ...mergedLive, data: enriched };
  }
);


export const nowNextRecommendationsSelector = createSelector(
  [enrichedLiveSelector, userLocation],
  (enrichedLive, userLocation) => {
    const defaultLocation = { lon: 10.88988415, lat: 49.8943078 };

    const crowdData = enrichedLive?.data || [];

    const userLoc = userLocation?.lat && userLocation?.lon ? userLocation : defaultLocation;
      if (!userLoc?.lat || !userLoc?.lon || crowdData.length === 0) {
      return [];
    }

    // const userLoc = { lat: userLocation1.lat, lon: userLocation1.lon };

    const TOURIST_MIN = 0.4;
    const KIND_DENY = new Set([
      "bus_stop",
      "station",
      "office",
      "residential",
      "parking",
    ]);
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

    const isTourist = (row) => {
      const ki = (row.kind || "").toLowerCase();
      const sk = (row.subkind || "").toLowerCase();

      if (KIND_DENY.has(ki) || KIND_DENY.has(sk)) return false;
      if (KIND_ALLOW.has(ki) || KIND_ALLOW.has(sk)) return true;
      return false; 
    };

    const POP_W = 0.6;
    const COMF_W = 0.3;
    const TREND_W = 0.1;

    const maxPopularity = Math.max(
      ...crowdData.map((p) => p.popularity?.normalized || 0),
      1
    );

    const scorePlace = (p) => {
      const popularityNorm =
        (p.popularity?.normalized || 0) / (maxPopularity || 1);
      const pressureNorm = Math.min(
        p.pressure / (p.thresholds?.livelyMax || 1),
        1
      );
      const trendFactor = p.flow?.ratePerMin < 0 ? 1 : 0;
      return (
        POP_W * popularityNorm +
        COMF_W * (1 - pressureNorm) +
        TREND_W * trendFactor
      );
    };

    let candidates = crowdData.filter(
      (p) =>
        haversine(userLoc, { lat: p.lat, lon: p.lon }) <= 1500 && isTourist(p)
    );

    if (candidates.length === 0) {
      candidates = crowdData.filter(
        (p) => haversine(userLoc, { lat: p.lat, lon: p.lon }) <= 1500
      );
    }
    return candidates
      .map((p) => ({ ...p, score: scorePlace(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }
);
