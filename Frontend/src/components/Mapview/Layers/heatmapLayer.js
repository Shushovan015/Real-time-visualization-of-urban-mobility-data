// import { useEffect, useRef, useContext } from "react";
// import { Heatmap as HeatmapLayer } from "ol/layer";
// import VectorSource from "ol/source/Vector";
// import Feature from "ol/Feature";
// import { Point } from "ol/geom";
// import { fromLonLat } from "ol/proj";
// import { MapContext } from "../MapContainer";
// import { unByKey } from "ol/Observable";

// const COLORS = {
//   chill: "#2dc653", // green
//   lively: "#ffc107", // yellow
//   overcrowded: "#dc3545", // red
// };

// /** Normalize value -> heat weight in [0.7, 1] so faint points still show */
// const normalizeWeight = (val, min, max) => {
//   if (val == null || !isFinite(val) || min === max) return 1;
//   const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
//   return 0.7 + 0.3 * t;
// };

// /** Choose lon/lat for any item (lon/lat -> centroid -> average of coords) */
// const pickCoord = (item) => {
//   if (typeof item.lon === "number" && typeof item.lat === "number") {
//     return [item.lon, item.lat];
//   }
//   if (
//     item?.centroid &&
//     typeof item.centroid.lon === "number" &&
//     typeof item.centroid.lat === "number"
//   ) {
//     return [item.centroid.lon, item.centroid.lat];
//   }
//   const coords =
//     item?.properties?.coordinates ||
//     item?.geometry ||
//     item?.properties?.geometry?.coordinates;

//   if (Array.isArray(coords) && coords.length && Array.isArray(coords[0])) {
//     let sx = 0,
//       sy = 0,
//       n = 0;
//     for (const c of coords) {
//       if (
//         Array.isArray(c) &&
//         c.length >= 2 &&
//         isFinite(c[0]) &&
//         isFinite(c[1])
//       ) {
//         sx += c[0];
//         sy += c[1];
//         n++;
//       }
//     }
//     if (n > 0) return [sx / n, sy / n];
//   }
//   return null;
// };

// // knobs: make red rarer, ensure some green
// const TUNE = {
//   chillFloorFrac: 0.2, // at least bottom 20% are green
//   livelyCapFrac: 0.9, // only top ~10% eligible for red
//   nearEps: 0.08, // "near threshold" band
//   overBoostPct: 0.15, // need +15% over livelyMax to be red purely by thresholds
// };

// // Robust quantiles (noisy-proof)
// const buildQuantileFn = (values) => {
//   const arr = values
//     .filter(Number.isFinite)
//     .slice()
//     .sort((a, b) => a - b);
//   if (!arr.length) return () => 0.5;
//   return (p) => {
//     if (p <= 0) return arr[0];
//     if (p >= 1) return arr[arr.length - 1];
//     const idx = Math.floor(p * (arr.length - 1));
//     return arr[idx];
//   };
// };

// // One classifier that blends global distribution + per-place thresholds
// const makeStateClassifier = (pressures) => {
//   const q = buildQuantileFn(pressures);
//   const q20 = q(TUNE.chillFloorFrac);
//   const q85 = q(0.85); // generous yellow ceiling (adjust to 0.90 for even less red)

//   return (p, thresholds = { chillMax: 0.4, livelyMax: 1.2 }) => {
//     const { chillMax = 0.4, livelyMax = 1.2 } = thresholds || {};
//     if (!Number.isFinite(p)) return "chill";

//     // strong green if clearly below chill threshold
//     if (p <= chillMax * (1 - TUNE.nearEps)) return "chill";

//     // distribution rails: guarantee some green & keep most out of red
//     if (p <= q20) return "chill";
//     if (p <= q85) return "lively";

//     // threshold-led red only if clearly above livelyMax (+15%)
//     if (p > livelyMax * (1 + TUNE.overBoostPct)) return "overcrowded";

//     // top tail near livelyMax can be red
//     if (p >= livelyMax * (1 - TUNE.nearEps)) return "overcrowded";

//     // otherwise stay lively
//     return "lively";
//   };
// };

// const badgeFromStateAndFlow = (state, flowRatePerMin = 0) => {
//   if (state !== "overcrowded") return null;
//   if (flowRatePerMin >= 0.02) return "Watch"; // high & rising fast
//   if (Math.abs(flowRatePerMin) <= 0.01) return "Strain"; // high & stagnant
//   return "Good-busy"; // high but easing
// };

// export default function CrowdHeatmapLayer({ data, onHover }) {
//   const { map } = useContext(MapContext);
//   const layersRef = useRef([]);
//   const pointerKeyRef = useRef(null);

//   useEffect(() => {
//     if (!map || !Array.isArray(data) || data.length === 0) return;

//     // clean up
//     layersRef.current.forEach((l) => l && map.removeLayer(l));
//     layersRef.current = [];
//     if (pointerKeyRef.current) {
//       unByKey(pointerKeyRef.current);
//       pointerKeyRef.current = null;
//     }

//     // ranges & classifier
//     const pressures = data.map((d) => d?.pressure).filter(Number.isFinite);
//     const densities = data.map((d) => d?.density).filter(Number.isFinite);
//     const classifyState = makeStateClassifier(pressures);

//     const pMin = pressures.length ? Math.min(...pressures) : 0;
//     const pMax = pressures.length ? Math.max(...pressures) : 1;
//     const dMin = densities.length ? Math.min(...densities) : 0;
//     const dMax = densities.length ? Math.max(...densities) : 1;

//     const buckets = { chill: [], lively: [], overcrowded: [] };

//     for (const item of data) {
//       const coord = pickCoord(item);
//       if (!coord) continue;

//       const state = classifyState(item.pressure, item.thresholds);

//       // intensity weight
//       const w = Number.isFinite(item.pressure)
//         ? normalizeWeight(item.pressure, pMin, pMax)
//         : normalizeWeight(item.density, dMin, dMax);

//       const badge = badgeFromStateAndFlow(state, item.flow?.ratePerMin ?? 0);

//       const feature = new Feature({
//         geometry: new Point(fromLonLat(coord)),
//         meta: {
//           location: item.location || item.name || item.placeId,
//           label:
//             state === "overcrowded"
//               ? "Overcrowded"
//               : state === "lively"
//               ? "Lively"
//               : "Chill",
//           capacity: item.capacity,
//           visitors: item.visitors,
//           pressure: item.pressure,
//           density: item.density,
//           thresholds: item.thresholds,
//           popularity: item.normalized ?? item.score,
//           timestamp: item.timestamp || item.updatedAt,
//           badge,
//           flowRatePerMin: item.flow?.ratePerMin,
//         },
//         weight: w,
//         state,
//       });

//       buckets[state].push(feature);
//     }

//     // one heatmap layer per state; red on top
//     const makeLayer = (features, color, z) => {
//       if (!features.length) return null;
//       const source = new VectorSource({ features });
//       const layer = new HeatmapLayer({
//         source,
//         radius: 45,
//         blur: 20,
//         weight: "weight",
//         opacity: 1,
//         gradient: [color, color],
//         zIndex: z,
//       });
//       map.addLayer(layer);
//       return layer;
//     };

//     const chillLayer = makeLayer(buckets.chill, COLORS.chill, 1000);
//     const livelyLayer = makeLayer(buckets.lively, COLORS.lively, 1001);
//     const ocLayer = makeLayer(buckets.overcrowded, COLORS.overcrowded, 1002);

//     layersRef.current = [chillLayer, livelyLayer, ocLayer].filter(Boolean);

//     // hover
//     pointerKeyRef.current = map.on("pointermove", (e) => {
//       let sent = false;
//       map.forEachFeatureAtPixel(
//         e.pixel,
//         (feature) => {
//           const meta = feature.get("meta");
//           if (meta) {
//             onHover?.({
//               ...meta,
//               state: feature.get("state"),
//               coordinate: e.coordinate,
//             });
//             sent = true;
//             return true;
//           }
//           return false;
//         },
//         { hitTolerance: 5 }
//       );
//       if (!sent) onHover?.(null);
//     });

//     return () => {
//       layersRef.current.forEach((l) => l && map.removeLayer(l));
//       layersRef.current = [];
//       if (pointerKeyRef.current) {
//         unByKey(pointerKeyRef.current);
//         pointerKeyRef.current = null;
//       }
//     };
//   }, [map, data, onHover]);

//   return null;
// }

// uncomment this for centroid code
import { useEffect, useRef, useContext } from "react";
import { Heatmap as HeatmapLayer } from "ol/layer";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { MapContext } from "../MapContainer";
import { unByKey } from "ol/Observable";

const COMFORT_REF_PPM2 = 0.5;

const DEFAULT_THRESHOLDS = {
  chillMax: 0.35,
  livelyMax: 1.05,
};

const TUNE = {
  chillFloorFrac: 0.2,
  livelyCapFrac: 0.85,
  nearEps: 0.05,
  overBoostPct: 0.15,
  heatRadius: 45,
  heatBlur: 20,
};

const COLORS = {
  chill: "#2dc653",
  lively: "#ffc107",
  overcrowded: "#dc3545",
};

const normalizeWeight = (val, min, max) => {
  if (val == null || !isFinite(val) || min === max) return 1;
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
  return 0.7 + 0.3 * t;
};

const pickCoord = (item) => {
  if (typeof item.lon === "number" && typeof item.lat === "number") {
    return [item.lon, item.lat];
  }
  if (
    item?.centroid &&
    typeof item.centroid.lon === "number" &&
    typeof item.centroid.lat === "number"
  ) {
    return [item.centroid.lon, item.centroid.lat];
  }
  const coords =
    item?.properties?.coordinates ||
    item?.geometry ||
    item?.properties?.geometry?.coordinates;

  if (Array.isArray(coords) && coords.length && Array.isArray(coords[0])) {
    let sx = 0,
      sy = 0,
      n = 0;
    for (const c of coords) {
      if (
        Array.isArray(c) &&
        c.length >= 2 &&
        isFinite(c[0]) &&
        isFinite(c[1])
      ) {
        sx += c[0];
        sy += c[1];
        n++;
      }
    }
    if (n > 0) return [sx / n, sy / n];
  }
  return null;
};

const buildQuantileFn = (values) => {
  const arr = values
    .filter(Number.isFinite)
    .slice()
    .sort((a, b) => a - b);
  if (!arr.length) return () => 0;
  return (p) => {
    if (p <= 0) return arr[0];
    if (p >= 1) return arr[arr.length - 1];
    const idx = Math.floor(p * (arr.length - 1));
    return arr[idx];
  };
};

const makeStateClassifier = (
  pressures,
  globalThresholds = DEFAULT_THRESHOLDS
) => {
  const q = buildQuantileFn(pressures);
  const q20 = q(TUNE.chillFloorFrac);
  const q85 = q(TUNE.livelyCapFrac);

  return (p, localThresholds) => {
    const base = { ...globalThresholds, ...(localThresholds || {}) };
    const chillMax = Number.isFinite(base.chillMax)
      ? base.chillMax
      : DEFAULT_THRESHOLDS.chillMax;
    const livelyMax = Number.isFinite(base.livelyMax)
      ? base.livelyMax
      : DEFAULT_THRESHOLDS.livelyMax;

    if (!Number.isFinite(p)) return "chill";

    if (p <= chillMax * (1 - TUNE.nearEps)) return "chill";

    if (p <= q20) return "chill";
    if (p <= q85) return "lively";

    if (p > livelyMax * (1 + TUNE.overBoostPct)) return "overcrowded";

    if (p >= livelyMax * (1 - TUNE.nearEps)) return "overcrowded";

    return "lively";
  };
};

export default function CrowdHeatmapLayer({ data, onHover }) {
  const { map } = useContext(MapContext);
  const layersRef = useRef([]);
  const pointerKeyRef = useRef(null);

  useEffect(() => {
    if (!map || !Array.isArray(data) || data.length === 0) return;

    layersRef.current.forEach((l) => l && map.removeLayer(l));
    layersRef.current = [];
    if (pointerKeyRef.current) {
      unByKey(pointerKeyRef.current);
      pointerKeyRef.current = null;
    }

    const pressures = data.map((d) => d?.pressure).filter(Number.isFinite);
    const densities = data.map((d) => d?.density).filter(Number.isFinite);
    const classifyState = makeStateClassifier(pressures, DEFAULT_THRESHOLDS);

    const pMin = pressures.length ? Math.min(...pressures) : 0;
    const pMax = pressures.length ? Math.max(...pressures) : 1;
    const dMin = densities.length ? Math.min(...densities) : 0;
    const dMax = densities.length ? Math.max(...densities) : 1;

    const buckets = { chill: [], lively: [], overcrowded: [] };

    for (const item of data) {
      const coord = pickCoord(item);
      if (!coord) continue;

      const state = classifyState(item.pressure, item.thresholds);

      const w = Number.isFinite(item.pressure)
        ? normalizeWeight(item.pressure, pMin, pMax)
        : normalizeWeight(item.density, dMin, dMax);

      const feature = new Feature({
        geometry: new Point(fromLonLat(coord)),
        meta: {
          location: item.location || item.name || item.placeId,
          label:
            state === "overcrowded"
              ? "Overcrowded"
              : state === "lively"
                ? "Lively"
                : "Chill",
          capacity: item.capacity,
          visitors: item.visitors,
          pressure: item.pressure,
          density: item.density,
          thresholds: item.thresholds,
          popularity: item.popularity ?? item.score,
          timestamp: item.timestamp || item.updatedAt,
          badge: item.badge,
          flowRatePerMin: item.flow?.ratePerMin,
          comfortRefPpm2: COMFORT_REF_PPM2,
          kind: item?.kind,
          subKind: item?.subkind,
        },
        weight: w,
        state,
      });

      buckets[state].push(feature);
    }

    const makeLayer = (features, color, z) => {
      if (!features.length) return null;
      const source = new VectorSource({ features });
      const layer = new HeatmapLayer({
        source,
        radius: TUNE.heatRadius,
        blur: TUNE.heatBlur,
        weight: "weight",
        opacity: 1,
        gradient: [color, color],
        zIndex: z,
      });
      map.addLayer(layer);
      return layer;
    };

    const chillLayer = makeLayer(buckets.chill, COLORS.chill, 1000);
    const livelyLayer = makeLayer(buckets.lively, COLORS.lively, 1001);
    const ocLayer = makeLayer(buckets.overcrowded, COLORS.overcrowded, 1002);

    layersRef.current = [chillLayer, livelyLayer, ocLayer].filter(Boolean);

    pointerKeyRef.current = map.on("pointermove", (e) => {
      let sent = false;
      map.forEachFeatureAtPixel(
        e.pixel,
        (feature) => {
          const meta = feature.get("meta");
          if (meta) {
            onHover?.({
              ...meta,
              state: feature.get("state"),
              coordinate: e.coordinate,
            });
            sent = true;
            return true;
          }
          return false;
        },
        { hitTolerance: 5 }
      );
      if (!sent) onHover?.(null);
    });

    return () => {
      layersRef.current.forEach((l) => l && map.removeLayer(l));
      layersRef.current = [];
      if (pointerKeyRef.current) {
        unByKey(pointerKeyRef.current);
        pointerKeyRef.current = null;
      }
    };
  }, [map, data, onHover]);

  return null;
}

// uncomment this fo zoomin centroid and zoomout whole polygon or linestring color
// import { useEffect, useRef, useContext } from "react";
// import { Heatmap as HeatmapLayer } from "ol/layer";
// import VectorLayer from "ol/layer/Vector";
// import VectorSource from "ol/source/Vector";
// import Feature from "ol/Feature";
// import { Point, Polygon, LineString } from "ol/geom";
// import { fromLonLat } from "ol/proj";
// import { MapContext } from "../MapContainer";
// import { unByKey } from "ol/Observable";
// import { Fill, Stroke, Style } from "ol/style";

// /** === Research anchors === */
// const LOS_B = 0.43,
//   LOS_C = 0.54,
//   LOS_D = 0.72;
// const DEFAULT_THRESHOLDS = {
//   chillMax: LOS_B / LOS_C,
//   livelyMax: LOS_D / LOS_C,
// };

// const TUNE = {
//   chillFloorFrac: 0.2,
//   livelyCapFrac: 0.85,
//   nearEps: 0.05,
//   overBoostPct: 0.15,
//   heatRadius: 45,
//   heatBlur: 20,
//   // Blend is REVERSED now: polygons/lines at low zoom, points at high zoom
//   blendStartZoom: 13, // ≤ this: only polys/lines
//   blendEndZoom: 15, // ≥ this: only points
// };

// const COLORS = { chill: "#2dc653", lively: "#ffc107", overcrowded: "#dc3545" };

// /* Utils */
// const normalizeWeight = (val, min, max) => {
//   if (val == null || !isFinite(val) || min === max) return 1;
//   const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
//   return 0.7 + 0.3 * t;
// };

// const pickCoord = (item) => {
//   if (typeof item.lon === "number" && typeof item.lat === "number")
//     return [item.lon, item.lat];
//   if (
//     item?.centroid &&
//     Number.isFinite(item.centroid.lon) &&
//     Number.isFinite(item.centroid.lat)
//   )
//     return [item.centroid.lon, item.centroid.lat];
//   const coords =
//     item?.properties?.coordinates ??
//     item?.geometry?.coordinates ??
//     item?.geometry ??
//     item?.properties?.geometry?.coordinates;

//   if (Array.isArray(coords) && coords.length && Array.isArray(coords[0])) {
//     let sx = 0,
//       sy = 0,
//       n = 0;
//     for (const c of coords) {
//       if (
//         Array.isArray(c) &&
//         c.length >= 2 &&
//         isFinite(c[0]) &&
//         isFinite(c[1])
//       ) {
//         sx += c[0];
//         sy += c[1];
//         n++;
//       }
//     }
//     if (n > 0) return [sx / n, sy / n];
//   }
//   return null;
// };

// const buildQuantileFn = (values) => {
//   const arr = values
//     .filter(Number.isFinite)
//     .slice()
//     .sort((a, b) => a - b);
//   if (!arr.length) return () => 0;
//   return (p) => {
//     if (p <= 0) return arr[0];
//     if (p >= 1) return arr[arr.length - 1];
//     const idx = Math.floor(p * (arr.length - 1));
//     return arr[idx];
//   };
// };

// const makeStateClassifier = (
//   pressures,
//   globalThresholds = DEFAULT_THRESHOLDS
// ) => {
//   const q = buildQuantileFn(pressures);
//   const q20 = q(TUNE.chillFloorFrac);
//   const q85 = q(TUNE.livelyCapFrac);

//   return (p, localThresholds) => {
//     const base = { ...globalThresholds, ...(localThresholds || {}) };
//     const chillMax = Number.isFinite(base.chillMax)
//       ? base.chillMax
//       : DEFAULT_THRESHOLDS.chillMax;
//     const livelyMax = Number.isFinite(base.livelyMax)
//       ? base.livelyMax
//       : DEFAULT_THRESHOLDS.livelyMax;

//     if (!Number.isFinite(p)) return "chill";
//     if (p <= chillMax * (1 - TUNE.nearEps)) return "chill";
//     if (p <= q20) return "chill";
//     if (p <= q85) return "lively";
//     if (p > livelyMax * (1 + TUNE.overBoostPct)) return "overcrowded";
//     if (p >= livelyMax * (1 - TUNE.nearEps)) return "overcrowded";
//     return "lively";
//   };
// };

// const badgeFromStateAndFlow = (state, flowRatePerMin = 0) => {
//   if (state !== "overcrowded") {
//     if (state === "lively") {
//       if (flowRatePerMin <= -0.01) return "Good-busy";
//       if (flowRatePerMin >= 0.02) return "Watch";
//     }
//     return null;
//   }
//   if (flowRatePerMin >= 0.02) return "Watch";
//   if (Math.abs(flowRatePerMin) <= 0.01) return "Strain";
//   return "Good-busy";
// };

// const withAlpha = (hex, alpha) => {
//   const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//   if (!m) return hex;
//   const r = parseInt(m[1], 16),
//     g = parseInt(m[2], 16),
//     b = parseInt(m[3], 16);
//   return `rgba(${r},${g},${b},${alpha})`;
// };

// /* Geometry builders (lon,lat order) */
// const buildPolygonGeom = (item) => {
//   const raw =
//     item?.properties?.coordinates ??
//     item?.geometry?.coordinates ??
//     item?.geometry ??
//     item?.properties?.geometry?.coordinates;

//   if (!raw) return null;
//   let ring = null;
//   if (Array.isArray(raw) && raw.length) {
//     if (Array.isArray(raw[0]) && typeof raw[0][0] === "number")
//       ring = raw; // flat
//     else if (
//       Array.isArray(raw[0]) &&
//       Array.isArray(raw[0][0]) &&
//       typeof raw[0][0][0] === "number"
//     )
//       ring = raw[0]; // nested
//   }
//   if (!ring || ring.length < 3) return null;

//   // close ring
//   const f = ring[0],
//     l = ring[ring.length - 1];
//   if (f[0] !== l[0] || f[1] !== l[1]) ring = [...ring, [f[0], f[1]]];

//   const ring3857 = ring.map(([lon, lat]) => fromLonLat([lon, lat]));
//   return new Polygon([ring3857]);
// };

// const buildLineGeom = (item) => {
//   const type = (
//     item?.geometry_type ||
//     item?.properties?.geometry_type ||
//     item?.properties?.type ||
//     ""
//   ).toLowerCase();
//   const raw =
//     item?.properties?.coordinates ??
//     item?.geometry?.coordinates ??
//     item?.geometry ??
//     item?.properties?.geometry?.coordinates;

//   if (type !== "linestring" || !Array.isArray(raw) || raw.length < 2)
//     return null;

//   const line3857 = raw
//     .filter(
//       (c) =>
//         Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1])
//     )
//     .map(([lon, lat]) => fromLonLat([lon, lat]));

//   return line3857.length >= 2 ? new LineString(line3857) : null;
// };

// /* Component */
// export default function CrowdHybridLayer({ data, onHover }) {
//   const { map } = useContext(MapContext);
//   const layersRef = useRef([]);
//   const blendRef = useRef(0); // 0 = polys/lines only, 1 = points only
//   const pointerKeyRef = useRef(null);
//   const resKeyRef = useRef(null);
//   const moveEndKeyRef = useRef(null);

//   useEffect(() => {
//     if (!map || !Array.isArray(data) || data.length === 0) return;

//     // cleanup old
//     layersRef.current.forEach((l) => l && map.removeLayer(l));
//     layersRef.current = [];
//     if (pointerKeyRef.current) {
//       unByKey(pointerKeyRef.current);
//       pointerKeyRef.current = null;
//     }
//     if (resKeyRef.current) {
//       unByKey(resKeyRef.current);
//       resKeyRef.current = null;
//     }
//     if (moveEndKeyRef.current) {
//       unByKey(moveEndKeyRef.current);
//       moveEndKeyRef.current = null;
//     }

//     // classifier setup
//     const pressures = data.map((d) => d?.pressure).filter(Number.isFinite);
//     const densities = data.map((d) => d?.density).filter(Number.isFinite);
//     const classifyState = makeStateClassifier(pressures, DEFAULT_THRESHOLDS);

//     const pMin = pressures.length ? Math.min(...pressures) : 0;
//     const pMax = pressures.length ? Math.max(...pressures) : 1;
//     const dMin = densities.length ? Math.min(...densities) : 0;
//     const dMax = densities.length ? Math.max(...densities) : 1;

//     // buckets
//     const ptBuckets = { chill: [], lively: [], overcrowded: [] };
//     const polyBuckets = { chill: [], lively: [], overcrowded: [] };
//     const lineBuckets = { chill: [], lively: [], overcrowded: [] };

//     for (const item of data) {
//       const state = classifyState(item.pressure, item.thresholds);
//       const badge = badgeFromStateAndFlow(state, item.flow?.ratePerMin ?? 0);

//       const meta = {
//         location: item.location || item.name || item.placeId,
//         label:
//           state === "overcrowded"
//             ? "Overcrowded"
//             : state === "lively"
//             ? "Lively"
//             : "Chill",
//         capacity: item.capacity,
//         visitors: item.visitors,
//         pressure: item.pressure,
//         density: item.density,
//         thresholds: item.thresholds,
//         popularity: item.normalized ?? item.score,
//         timestamp: item.timestamp || item.updatedAt,
//         badge,
//         flowRatePerMin: item.flow?.ratePerMin,
//         losComfort: LOS_C,
//       };

//       // centroid point (shows at high zoom)
//       const coord = pickCoord(item);
//       if (coord) {
//         const w = Number.isFinite(item.pressure)
//           ? normalizeWeight(item.pressure, pMin, pMax)
//           : normalizeWeight(item.density, dMin, dMax);
//         ptBuckets[state].push(
//           new Feature({
//             geometry: new Point(fromLonLat(coord)),
//             meta,
//             state,
//             weight: w,
//           })
//         );
//       }

//       // polygon (shows at low zoom)
//       const polyGeom = buildPolygonGeom(item);
//       if (polyGeom)
//         polyBuckets[state].push(
//           new Feature({ geometry: polyGeom, meta, state })
//         );

//       // line (shows at low zoom)
//       const lineGeom = buildLineGeom(item);
//       if (lineGeom)
//         lineBuckets[state].push(
//           new Feature({ geometry: lineGeom, meta, state })
//         );
//     }

//     // layer factories
//     const makeHeatLayer = (features, color, z) => {
//       if (!features.length) return null;
//       const source = new VectorSource({ features });
//       const layer = new HeatmapLayer({
//         source,
//         radius: TUNE.heatRadius,
//         blur: TUNE.heatBlur,
//         weight: "weight",
//         gradient: [color, color],
//         zIndex: z,
//         opacity: 0, // starts hidden at low zoom; fades in
//       });
//       map.addLayer(layer);
//       return layer;
//     };

//     const makePolygonLayer = (features, color, z) => {
//       if (!features.length) return null;
//       const source = new VectorSource({ features });
//       const layer = new VectorLayer({
//         source,
//         zIndex: z,
//         style: new Style({
//           fill: new Fill({ color: withAlpha(color, 0.4) }),
//           stroke: new Stroke({ color: withAlpha(color, 0.9), width: 1.4 }),
//         }),
//         opacity: 1, // starts visible at low zoom; fades out
//       });
//       map.addLayer(layer);
//       return layer;
//     };

//     const makeLineLayer = (features, color, z) => {
//       if (!features.length) return null;
//       const source = new VectorSource({ features });
//       const layer = new VectorLayer({
//         source,
//         zIndex: z,
//         style: new Style({
//           stroke: new Stroke({ color: withAlpha(color, 0.85), width: 3 }),
//         }),
//         opacity: 1, // starts visible at low zoom; fades out
//       });
//       map.addLayer(layer);
//       return layer;
//     };

//     // build layers
//     const heatLayers = [
//       makeHeatLayer(ptBuckets.chill, COLORS.chill, 1200),
//       makeHeatLayer(ptBuckets.lively, COLORS.lively, 1201),
//       makeHeatLayer(ptBuckets.overcrowded, COLORS.overcrowded, 1202),
//     ].filter(Boolean);

//     const polyLayers = [
//       makePolygonLayer(polyBuckets.chill, COLORS.chill, 1100),
//       makePolygonLayer(polyBuckets.lively, COLORS.lively, 1101),
//       makePolygonLayer(polyBuckets.overcrowded, COLORS.overcrowded, 1102),
//     ].filter(Boolean);

//     const lineLayers = [
//       makeLineLayer(lineBuckets.chill, COLORS.chill, 1050),
//       makeLineLayer(lineBuckets.lively, COLORS.lively, 1051),
//       makeLineLayer(lineBuckets.overcrowded, COLORS.overcrowded, 1052),
//     ].filter(Boolean);

//     layersRef.current = [...heatLayers, ...polyLayers, ...lineLayers];

//     // reversed blend: t=0 -> polys/lines 1; points 0  |  t=1 -> polys/lines 0; points 1
//     const applyBlendForZoom = () => {
//       const zoom = map.getView().getZoom() ?? TUNE.blendStartZoom;
//       const t = Math.max(
//         0,
//         Math.min(
//           1,
//           (zoom - TUNE.blendStartZoom) /
//             Math.max(0.0001, TUNE.blendEndZoom - TUNE.blendStartZoom)
//         )
//       );
//       blendRef.current = t;

//       const polysOpacity = 1 - t; // fade OUT as you zoom in
//       const pointsOpacity = t; // fade IN as you zoom in

//       // set layer opacities directly
//       polyLayers.forEach((l) => l && l.setOpacity(polysOpacity));
//       lineLayers.forEach((l) => l && l.setOpacity(polysOpacity));
//       heatLayers.forEach((l) => l && l.setOpacity(pointsOpacity));
//     };

//     applyBlendForZoom();
//     resKeyRef.current = map
//       .getView()
//       .on("change:resolution", applyBlendForZoom);
//     moveEndKeyRef.current = map.on("moveend", applyBlendForZoom);

//     // hover → popup meta (unchanged)
//     pointerKeyRef.current = map.on("pointermove", (e) => {
//       let sent = false;
//       map.forEachFeatureAtPixel(
//         e.pixel,
//         (feature) => {
//           const meta = feature.get("meta");
//           if (meta) {
//             onHover?.({
//               ...meta,
//               state: feature.get("state"),
//               coordinate: e.coordinate,
//             });
//             sent = true;
//             return true;
//           }
//           return false;
//         },
//         { hitTolerance: 5 }
//       );
//       if (!sent) onHover?.(null);
//     });

//     // cleanup
//     return () => {
//       layersRef.current.forEach((l) => l && map.removeLayer(l));
//       layersRef.current = [];
//       if (pointerKeyRef.current) {
//         unByKey(pointerKeyRef.current);
//         pointerKeyRef.current = null;
//       }
//       if (resKeyRef.current) {
//         unByKey(resKeyRef.current);
//         resKeyRef.current = null;
//       }
//       if (moveEndKeyRef.current) {
//         unByKey(moveEndKeyRef.current);
//         moveEndKeyRef.current = null;
//       }
//     };
//   }, [map, data, onHover]);

//   return null;
// }

// zoomin polygon zoomout centroid
// import { useEffect, useRef, useContext } from "react";
// import { Heatmap as HeatmapLayer } from "ol/layer";
// import VectorLayer from "ol/layer/Vector";
// import VectorSource from "ol/source/Vector";
// import Feature from "ol/Feature";
// import { Point, Polygon, LineString } from "ol/geom";
// import { fromLonLat } from "ol/proj";
// import { MapContext } from "../MapContainer";
// import { unByKey } from "ol/Observable";
// import { Fill, Stroke, Style } from "ol/style";

// /** === Research anchors (unchanged) === */
// const LOS_B = 0.43;
// const LOS_C = 0.54;
// const LOS_D = 0.72;

// const DEFAULT_THRESHOLDS = {
//   chillMax: LOS_B / LOS_C, // ≈ 0.80
//   livelyMax: LOS_D / LOS_C, // ≈ 1.33
// };

// const TUNE = {
//   chillFloorFrac: 0.2,
//   livelyCapFrac: 0.85,
//   nearEps: 0.05,
//   overBoostPct: 0.15,
//   heatRadius: 45,
//   heatBlur: 20,

//   // zoom blend band: points -> lines/polys
//   blendStartZoom: 13,
//   blendEndZoom: 15,
// };

// const COLORS = {
//   chill: "#2dc653",
//   lively: "#ffc107",
//   overcrowded: "#dc3545",
// };

// /** Utils */
// const normalizeWeight = (val, min, max) => {
//   if (val == null || !isFinite(val) || min === max) return 1;
//   const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
//   return 0.7 + 0.3 * t;
// };

// const pickCoord = (item) => {
//   if (typeof item.lon === "number" && typeof item.lat === "number") {
//     return [item.lon, item.lat];
//   }
//   if (item?.centroid && Number.isFinite(item.centroid.lon) && Number.isFinite(item.centroid.lat)) {
//     return [item.centroid.lon, item.centroid.lat];
//   }
//   const coords =
//     item?.properties?.coordinates ??
//     item?.geometry?.coordinates ??
//     item?.geometry ??
//     item?.properties?.geometry?.coordinates;

//   if (Array.isArray(coords) && coords.length && Array.isArray(coords[0])) {
//     let sx = 0, sy = 0, n = 0;
//     for (const c of coords) {
//       if (Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1])) {
//         sx += c[0]; sy += c[1]; n++;
//       }
//     }
//     if (n > 0) return [sx / n, sy / n];
//   }
//   return null;
// };

// const buildQuantileFn = (values) => {
//   const arr = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
//   if (!arr.length) return () => 0;
//   return (p) => {
//     if (p <= 0) return arr[0];
//     if (p >= 1) return arr[arr.length - 1];
//     const idx = Math.floor(p * (arr.length - 1));
//     return arr[idx];
//   };
// };

// const makeStateClassifier = (pressures, globalThresholds = DEFAULT_THRESHOLDS) => {
//   const q = buildQuantileFn(pressures);
//   const q20 = q(TUNE.chillFloorFrac);
//   const q85 = q(TUNE.livelyCapFrac);

//   return (p, localThresholds) => {
//     const base = { ...globalThresholds, ...(localThresholds || {}) };
//     const chillMax = Number.isFinite(base.chillMax) ? base.chillMax : DEFAULT_THRESHOLDS.chillMax;
//     const livelyMax = Number.isFinite(base.livelyMax) ? base.livelyMax : DEFAULT_THRESHOLDS.livelyMax;

//     if (!Number.isFinite(p)) return "chill";
//     if (p <= chillMax * (1 - TUNE.nearEps)) return "chill";
//     if (p <= q20) return "chill";
//     if (p <= q85) return "lively";
//     if (p > livelyMax * (1 + TUNE.overBoostPct)) return "overcrowded";
//     if (p >= livelyMax * (1 - TUNE.nearEps)) return "overcrowded";
//     return "lively";
//   };
// };

// const badgeFromStateAndFlow = (state, flowRatePerMin = 0) => {
//   if (state !== "overcrowded") {
//     if (state === "lively") {
//       if (flowRatePerMin <= -0.01) return "Good-busy";
//       if (flowRatePerMin >= 0.02) return "Watch";
//     }
//     return null;
//   }
//   if (flowRatePerMin >= 0.02) return "Watch";
//   if (Math.abs(flowRatePerMin) <= 0.01) return "Strain";
//   return "Good-busy";
// };

// const withAlpha = (hex, alpha) => {
//   const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//   if (!m) return hex;
//   const r = parseInt(m[1], 16);
//   const g = parseInt(m[2], 16);
//   const b = parseInt(m[3], 16);
//   return `rgba(${r},${g},${b},${alpha})`;
// };

// /** Geometry builders */

// // Accepts flat [[lon,lat],...] or nested [[[lon,lat],...]].
// // Assumes lon,lat ordering (your sample matches this). If your dataset mixes
// // lat/lon, we can add an auto‑flip heuristic, but keeping it simple for now.
// const buildPolygonGeom = (item) => {
//   const raw =
//     item?.properties?.coordinates ??
//     item?.geometry?.coordinates ??
//     item?.geometry ??
//     item?.properties?.geometry?.coordinates;

//   if (!raw) return null;
//   let ring = null;

//   if (Array.isArray(raw) && raw.length) {
//     if (Array.isArray(raw[0]) && typeof raw[0][0] === "number") ring = raw; // flat
//     else if (Array.isArray(raw[0]) && Array.isArray(raw[0][0]) && typeof raw[0][0][0] === "number") ring = raw[0]; // nested
//   }
//   if (!ring || ring.length < 3) return null;

//   // ensure closed
//   const f = ring[0], l = ring[ring.length - 1];
//   if (f[0] !== l[0] || f[1] !== l[1]) ring = [...ring, [f[0], f[1]]];

//   const ring3857 = ring.map(([lon, lat]) => fromLonLat([lon, lat]));
//   return new Polygon([ring3857]);
// };

// const buildLineGeom = (item) => {
//   const type = (item?.geometry_type || item?.properties?.geometry_type || item?.properties?.type || "").toLowerCase();
//   const raw =
//     item?.properties?.coordinates ??
//     item?.geometry?.coordinates ??
//     item?.geometry ??
//     item?.properties?.geometry?.coordinates;

//   if (type !== "linestring" || !Array.isArray(raw) || raw.length < 2) return null;

//   const line3857 = raw
//     .filter((c) => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
//     .map(([lon, lat]) => fromLonLat([lon, lat]));

//   if (line3857.length < 2) return null;
//   return new LineString(line3857);
// };

// /** The component */
// export default function CrowdHybridLayer({ data, onHover }) {
//   const { map } = useContext(MapContext);
//   const layersRef = useRef([]);
//   const blendRef = useRef(0);
//   const pointerKeyRef = useRef(null);
//   const resKeyRef = useRef(null);
//   const moveEndKeyRef = useRef(null);

//   useEffect(() => {
//     if (!map || !Array.isArray(data) || data.length === 0) return;

//     // cleanup previous run
//     layersRef.current.forEach((l) => l && map.removeLayer(l));
//     layersRef.current = [];
//     if (pointerKeyRef.current) { unByKey(pointerKeyRef.current); pointerKeyRef.current = null; }
//     if (resKeyRef.current) { unByKey(resKeyRef.current); resKeyRef.current = null; }
//     if (moveEndKeyRef.current) { unByKey(moveEndKeyRef.current); moveEndKeyRef.current = null; }

//     // distributions & classifier
//     const pressures = data.map((d) => d?.pressure).filter(Number.isFinite);
//     const densities = data.map((d) => d?.density).filter(Number.isFinite);
//     const classifyState = makeStateClassifier(pressures, DEFAULT_THRESHOLDS);

//     const pMin = pressures.length ? Math.min(...pressures) : 0;
//     const pMax = pressures.length ? Math.max(...pressures) : 1;
//     const dMin = densities.length ? Math.min(...densities) : 0;
//     const dMax = densities.length ? Math.max(...densities) : 1;

//     // buckets
//     const ptBuckets = { chill: [], lively: [], overcrowded: [] };
//     const polyBuckets = { chill: [], lively: [], overcrowded: [] };
//     const lineBuckets = { chill: [], lively: [], overcrowded: [] };

//     for (const item of data) {
//       const state = classifyState(item.pressure, item.thresholds);
//       const badge = badgeFromStateAndFlow(state, item.flow?.ratePerMin ?? 0);

//       const meta = {
//         location: item.location || item.name || item.placeId,
//         label: state === "overcrowded" ? "Overcrowded" : state === "lively" ? "Lively" : "Chill",
//         capacity: item.capacity,
//         visitors: item.visitors,
//         pressure: item.pressure,
//         density: item.density,
//         thresholds: item.thresholds,
//         popularity: item.normalized ?? item.score,
//         timestamp: item.timestamp || item.updatedAt,
//         badge,
//         flowRatePerMin: item.flow?.ratePerMin,
//         losComfort: LOS_C,
//       };

//       // Point (centroid heat)
//       const coord = pickCoord(item);
//       if (coord) {
//         const w = Number.isFinite(item.pressure)
//           ? normalizeWeight(item.pressure, pMin, pMax)
//           : normalizeWeight(item.density, dMin, dMax);

//         ptBuckets[state].push(
//           new Feature({
//             geometry: new Point(fromLonLat(coord)),
//             meta,
//             state,
//             weight: w,
//           })
//         );
//       }

//       // Polygon (if present)
//       const polyGeom = buildPolygonGeom(item);
//       if (polyGeom) polyBuckets[state].push(new Feature({ geometry: polyGeom, meta, state }));

//       // LineString (if present)
//       const lineGeom = buildLineGeom(item);
//       if (lineGeom) lineBuckets[state].push(new Feature({ geometry: lineGeom, meta, state }));
//     }

//     // Layer factories
//     const makeHeatLayer = (features, color, z) => {
//       if (!features.length) return null;
//       const source = new VectorSource({ features });
//       const layer = new HeatmapLayer({
//         source,
//         radius: TUNE.heatRadius,
//         blur: TUNE.heatBlur,
//         weight: "weight",
//         gradient: [color, color],
//         zIndex: z,
//         opacity: 1, // will be faded via blend
//       });
//       map.addLayer(layer);
//       return layer;
//     };

//     const makePolygonLayer = (features, color, z) => {
//       if (!features.length) return null;
//       const source = new VectorSource({ features });
//       const layer = new VectorLayer({
//         source,
//         zIndex: z,
//         style: () => {
//           const t = blendRef.current;
//           const alphaFill = 0.45 * t;
//           const alphaStroke = Math.max(0.9 * t, 0.2);
//           return new Style({
//             fill: new Fill({ color: withAlpha(color, alphaFill) }),
//             stroke: new Stroke({ color: withAlpha(color, alphaStroke), width: 1.5 }),
//           });
//         },
//       });
//       map.addLayer(layer);
//       return layer;
//     };

//     const makeLineLayer = (features, color, z) => {
//       if (!features.length) return null;
//       const source = new VectorSource({ features });
//       const layer = new VectorLayer({
//         source,
//         zIndex: z,
//         style: () => {
//           const t = blendRef.current;
//           const width = 2 + 3 * t;                 // thicker as you zoom in
//           const alpha = Math.max(0.2, 0.8 * t);    // fade in with zoom
//           return new Style({
//             stroke: new Stroke({ color: withAlpha(color, alpha), width }),
//           });
//         },
//       });
//       map.addLayer(layer);
//       return layer;
//     };

//     // Build layers
//     const heatLayers = [
//       makeHeatLayer(ptBuckets.chill, COLORS.chill, 1000),
//       makeHeatLayer(ptBuckets.lively, COLORS.lively, 1001),
//       makeHeatLayer(ptBuckets.overcrowded, COLORS.overcrowded, 1002),
//     ].filter(Boolean);

//     const polyLayers = [
//       makePolygonLayer(polyBuckets.chill, COLORS.chill, 1100),
//       makePolygonLayer(polyBuckets.lively, COLORS.lively, 1101),
//       makePolygonLayer(polyBuckets.overcrowded, COLORS.overcrowded, 1102),
//     ].filter(Boolean);

//     const lineLayers = [
//       makeLineLayer(lineBuckets.chill, COLORS.chill, 1150),
//       makeLineLayer(lineBuckets.lively, COLORS.lively, 1151),
//       makeLineLayer(lineBuckets.overcrowded, COLORS.overcrowded, 1152),
//     ].filter(Boolean);

//     layersRef.current = [...heatLayers, ...polyLayers, ...lineLayers];

//     // Zoom blend
//     const applyBlendForZoom = () => {
//       const zoom = map.getView().getZoom() ?? TUNE.blendStartZoom;
//       const t = Math.max(
//         0,
//         Math.min(
//           1,
//           (zoom - TUNE.blendStartZoom) /
//             Math.max(0.0001, TUNE.blendEndZoom - TUNE.blendStartZoom)
//         )
//       );
//       blendRef.current = t;
//       // points fade out
//       heatLayers.forEach((l) => l && l.setOpacity(1 - t));
//       // lines/polys restyle with new t
//       [...polyLayers, ...lineLayers].forEach((l) => l && l.changed());
//     };

//     applyBlendForZoom();
//     resKeyRef.current = map.getView().on("change:resolution", applyBlendForZoom);
//     moveEndKeyRef.current = map.on("moveend", applyBlendForZoom);

//     // Hover → popup meta
//     pointerKeyRef.current = map.on("pointermove", (e) => {
//       let sent = false;
//       map.forEachFeatureAtPixel(
//         e.pixel,
//         (feature) => {
//           const meta = feature.get("meta");
//           if (meta) {
//             onHover?.({
//               ...meta,
//               state: feature.get("state"),
//               coordinate: e.coordinate,
//             });
//             sent = true;
//             return true;
//           }
//           return false;
//         },
//         { hitTolerance: 5 }
//       );
//       if (!sent) onHover?.(null);
//     });

//     // Cleanup
//     return () => {
//       layersRef.current.forEach((l) => l && map.removeLayer(l));
//       layersRef.current = [];
//       if (pointerKeyRef.current) { unByKey(pointerKeyRef.current); pointerKeyRef.current = null; }
//       if (resKeyRef.current) { unByKey(resKeyRef.current); resKeyRef.current = null; }
//       if (moveEndKeyRef.current) { unByKey(moveEndKeyRef.current); moveEndKeyRef.current = null; }
//     };
//   }, [map, data, onHover]);

//   return null;
// }
