import { useEffect, useRef, useContext } from "react";
import { Vector as VectorLayer } from "ol/layer";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { Style, Icon } from "ol/style";
import { MapContext } from "../MapContainer";
import { unByKey } from "ol/Observable";
import personMono from "../../../assets/body.png";

const LOS_B = 0.43,
  LOS_C = 0.54,
  LOS_D = 0.72;
const DEFAULT_THRESHOLDS = {
  chillMax: LOS_B / LOS_C,
  livelyMax: LOS_D / LOS_C,
};
const COLORS = { chill: "#2dc653", lively: "#ffc107", overcrowded: "#dc3545" };
const TUNE = {
  chillFloorFrac: 0.2,
  livelyCapFrac: 0.85,
  nearEps: 0.05,
  overBoostPct: 0.15,
};

const buildQuantileFn = (values) => {
  const arr = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!arr.length) return () => 0;
  return (p) => arr[Math.floor(Math.max(0, Math.min(1, p)) * (arr.length - 1))];
};

const makeStateClassifier = (pressures) => {
  const q = buildQuantileFn(pressures);
  const q20 = q(TUNE.chillFloorFrac);
  const q85 = q(TUNE.livelyCapFrac);

  return (p, thresholds) => {
    const chillMax = thresholds?.chillMax ?? DEFAULT_THRESHOLDS.chillMax;
    const livelyMax = thresholds?.livelyMax ?? DEFAULT_THRESHOLDS.livelyMax;
    if (!Number.isFinite(p)) return "chill";
    if (p <= chillMax * (1 - TUNE.nearEps)) return "chill";
    if (p <= q20) return "chill";
    if (p <= q85) return "lively";
    if (p > livelyMax * (1 + TUNE.overBoostPct)) return "overcrowded";
    if (p >= livelyMax * (1 - TUNE.nearEps)) return "overcrowded";
    return "lively";
  };
};

const badgeFromStateAndFlow = (state, flowRatePerMin = 0) => {
  if (state !== "overcrowded") {
    if (state === "lively") {
      if (flowRatePerMin <= -0.01) return "Good-busy";
      if (flowRatePerMin >= 0.02) return "Watch";
    }
    return null;
  }
  if (flowRatePerMin >= 0.02) return "Watch";
  if (Math.abs(flowRatePerMin) <= 0.01) return "Strain";
  return "Good-busy";
};

const normalize = (v, min, max) => {
  if (!Number.isFinite(v) || min === max) return 1;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
};

const pickCoord = (item) => {
  if (typeof item.lon === "number" && typeof item.lat === "number")
    return [item.lon, item.lat];
  if (
    item.centroid &&
    Number.isFinite(item.centroid.lon) &&
    Number.isFinite(item.centroid.lat)
  )
    return [item.centroid.lon, item.centroid.lat];
  return null;
};

export default function CrowdIconLayer({ data, onHover }) {
  const { map } = useContext(MapContext);
  const layerRef = useRef(null);
  const pointerKeyRef = useRef(null);

  useEffect(() => {
    if (!map || !Array.isArray(data) || data.length === 0) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (pointerKeyRef.current) {
      unByKey(pointerKeyRef.current);
      pointerKeyRef.current = null;
    }

    const pressures = data.map((d) => d?.pressure).filter(Number.isFinite);
    const pMin = pressures.length ? Math.min(...pressures) : 0;
    const pMax = pressures.length ? Math.max(...pressures) : 1;
    const classifyState = makeStateClassifier(pressures);

    const features = [];

    for (const item of data) {
      const coord = pickCoord(item);
      if (!coord) continue;

      const state = classifyState(item.pressure, item.thresholds);
      const label =
        state === "overcrowded"
          ? "Overcrowded"
          : state === "lively"
          ? "Lively"
          : "Chill";

      const norm = normalize(item.pressure, pMin, pMax);
      const iconCount = Math.round(3 + norm * 9);
      const scale = 0.05 + norm * 0.07;

      const base = fromLonLat(coord);
      for (let i = 0; i < iconCount; i++) {
        const angle = (2 * Math.PI * i) / iconCount;
        const spread = 8 + norm * 18;
        const jitter = 3 * Math.random();
        const r = spread + jitter;
        const shifted = [
          base[0] + r * Math.cos(angle),
          base[1] + r * Math.sin(angle),
        ];

        const feature = new Feature({
          geometry: new Point(shifted),
          meta: {
            location: item.location || item.name || item.placeId,
            label,
            capacity: item.capacity,
            visitors: item.visitors,
            pressure: item.pressure,
            density: item.density,
            thresholds: item.thresholds,
            popularity: item.normalized ?? item.score,
            timestamp: item.timestamp || item.updatedAt,
            badge: item.badge,
            flowRatePerMin: item.flow?.ratePerMin,
            kind: item?.kind,
            subKind: item?.subkind,
          },
          state,
        });

        feature.setStyle(
          new Style({
            image: new Icon({
              src: personMono,
              color: COLORS[state],
              scale,
              anchor: [0.5, 1],
            }),
          })
        );

        features.push(feature);
      }
    }

    const vectorLayer = new VectorLayer({
      source: new VectorSource({ features }),
      zIndex: 1100,
    });
    map.addLayer(vectorLayer);
    layerRef.current = vectorLayer;

    pointerKeyRef.current = map.on("pointermove", (e) => {
      let sent = false;
      map.forEachFeatureAtPixel(
        e.pixel,
        (feature) => {
          const meta = feature.get("meta");
          if (meta) {
            onHover?.({ ...meta, coordinate: e.coordinate });
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
      if (layerRef.current) map.removeLayer(layerRef.current);
      if (pointerKeyRef.current) {
        unByKey(pointerKeyRef.current);
        pointerKeyRef.current = null;
      }
    };
  }, [map, data, onHover]);

  return null;
}
