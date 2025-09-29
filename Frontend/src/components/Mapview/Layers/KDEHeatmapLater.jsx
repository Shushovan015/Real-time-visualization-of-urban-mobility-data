import { useEffect, useRef, useContext } from "react";
import { Heatmap as HeatmapLayer } from "ol/layer";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { MapContext } from "../MapContainer";
import { unByKey } from "ol/Observable";

const KDE_BANDWIDTH_M = 80; 
const HEAT_RADIUS_PX = 42;
const HEAT_BLUR_PX = 24;

const KDE_SAMPLES_MIN = 3;
const KDE_SAMPLES_MAX = 12;

const GRADIENT = [
  "rgba(45,198,83,1)", 
  "rgba(255,193,7,0.9)", 
  "rgba(220,53,69,0.9)", 
];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const metersToMapUnits = (m) => m; 
function pickCoord(item) {
  if (Number.isFinite(item.lon) && Number.isFinite(item.lat))
    return [item.lon, item.lat];
  if (
    item?.centroid &&
    Number.isFinite(item.centroid.lon) &&
    Number.isFinite(item.centroid.lat)
  )
    return [item.centroid.lon, item.centroid.lat];

  const coords = item?.properties?.coordinates || item?.geometry;
  if (Array.isArray(coords) && coords.length && Array.isArray(coords[0])) {
    let sx = 0,
      sy = 0,
      n = 0;
    for (const c of coords)
      if (Array.isArray(c) && isFinite(c[0]) && isFinite(c[1])) {
        sx += c[0];
        sy += c[1];
        n++;
      }
    if (n > 0) return [sx / n, sy / n];
  }
  return null;
}

function percentile(arr, p) {
  const a = arr
    .filter(Number.isFinite)
    .slice()
    .sort((x, y) => x - y);
  if (a.length === 0) return NaN;
  const idx = clamp((a.length - 1) * p, 0, a.length - 1);
  const lo = Math.floor(idx),
    hi = Math.ceil(idx);
  if (lo === hi) return a[lo];
  const w = idx - lo;
  return a[lo] * (1 - w) + a[hi] * w;
}

function samplesFor(item) {
  const p = Number(item.pressure) ? item.pressure : 0;
  const lm = item?.thresholds?.livelyMax || 1.0;
  const r = lm > 0 ? p / lm : p;
  const t = clamp(r, 0, 1.6); // cap
  const n = Math.round(
    KDE_SAMPLES_MIN + t * (KDE_SAMPLES_MAX - KDE_SAMPLES_MIN)
  );
  return clamp(n, KDE_SAMPLES_MIN, KDE_SAMPLES_MAX);
}

function weightFor(item, n) {
  const p = Number(item.pressure) ? item.pressure : 0;
  const lm = item?.thresholds?.livelyMax || 1.0;
  const r = lm > 0 ? p / lm : p;
  const mass = clamp(r, 0.08, 1.2);
  return clamp((mass / n) * 3.5, 0.1, 0.55);
}

export default function KDEHeatmapLayer({
  data,
  onHover,
  bandwidthM = KDE_BANDWIDTH_M,
}) {
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

    const ratios = data
      .map((item) => {
        const p = Number(item.pressure) || 0;
        const lm = item?.thresholds?.livelyMax || 1.0;
        return lm > 0 ? p / lm : p;
      })
      .filter(Number.isFinite);

    const redCut = percentile(ratios, 0.99); 
    const yellowCut = percentile(ratios, 0.8); 
    const HARD_RED_RATIO = 1.8;

    const sigma = metersToMapUnits(bandwidthM);
    const features = [];

    for (const item of data) {
      const coord = pickCoord(item);
      if (!coord) continue;

      const p = Number(item.pressure) || 0;
      const lm = item?.thresholds?.livelyMax || 1.0;
      const ratio = lm > 0 ? p / lm : p;

      let state = "chill";
      if (ratio >= HARD_RED_RATIO || ratio >= redCut) state = "overcrowded";
      else if (ratio >= yellowCut) state = "lively";

      const base = fromLonLat(coord);
      const n = samplesFor(item);
      const w = weightFor(item, n);
      for (let i = 0; i < n; i++) {
        const dx = randn() * sigma;
        const dy = randn() * sigma;
        const f = new Feature({
          geometry: new Point([base[0] + dx, base[1] + dy]),
          weight: w,
        });
        f.set("meta", {
          location: item.location || item.name || item.placeId,
          label: state,
          capacity: item.capacity,
          visitors: item.visitors,
          pressure: item.pressure,
          density: item.density,
          thresholds: item.thresholds,
          popularity: item.popularity ?? item.score,
          ratio,
          timestamp: item.timestamp || item.updatedAt,
          badge: item.badge,
          flowRatePerMin: item.flow?.ratePerMin,
          kind: item?.kind,
          subKind: item?.subkind,
        });
        features.push(f);
      }
    }

    const heatSrc = new VectorSource({ features });
    const heatLayer = new HeatmapLayer({
      source: heatSrc,
      radius: HEAT_RADIUS_PX,
      blur: HEAT_BLUR_PX,
      weight: "weight",
      gradient: GRADIENT,
      zIndex: 1000,
      opacity: 0.95,
    });
    map.addLayer(heatLayer);
    layersRef.current = [heatLayer];

    map.getView().on("change:resolution", () => {
      const zoom = map.getView().getZoom();
      const radius = Math.max(28, 76 - zoom * 2.7);
      const blur = Math.max(20, 52 - zoom * 2.0);
      heatLayer.setRadius(radius);
      heatLayer.setBlur(blur);
    });

    pointerKeyRef.current = map.on("pointermove", (e) => {
      let sent = false;
      map.forEachFeatureAtPixel(
        e.pixel,
        (feature, layer) => {
          if (layer !== heatLayer) return false;
          const meta = feature.get("meta");
          if (meta) {
            onHover?.({ ...meta, coordinate: e.coordinate });
            sent = true;
            return true;
          }
          return false;
        },
        { hitTolerance: 20 }
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
  }, [map, data, onHover, bandwidthM]);

  return null;
}
