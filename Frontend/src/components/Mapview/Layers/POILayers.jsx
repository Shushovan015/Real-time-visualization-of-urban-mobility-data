import { useContext, useEffect, useMemo, useRef, useCallback } from "react";
import { MapContext } from "../MapContainer";
import { Vector as VectorLayer } from "ol/layer";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Text } from "ol/style";
import { Point } from "ol/geom";
import Overlay from "ol/Overlay";

const CATEGORY_ALIASES = {
  parks: "park",
  "parks & green": "park",
  "cathedral, churches": "church",
  cathedrals: "church",
  churches: "church",
  tioltes: "toilet",
  wc: "toilet",
  biergarten: "beergarden",
  attractions: "attraction",
  ferry: "cruise",
  museums: "museum",
  viewpoints: "viewpoint",
  playgrounds: "playground",
};

const EMOJI = {
  park: "🌳",
  church: "⛪",
  toilet: "🚻",
  beergarden: "🍺",
  attraction: "⭐",
  cruise: "🛳️",
  museum: "🏛️",
  viewpoint: "🔭",
  playground: "🛝",
  other: "📍",
  squares: "🏞️",
  theatre: "🎭",
  castle: "🏰",
};

function normalizeCategory(group) {
  if (!group) return "other";
  const k = String(group).trim().toLowerCase();
  return CATEGORY_ALIASES[k] || k || "other";
}

function centroidOf(feature) {
  const g = feature.getGeometry();
  if (g.getType() === "Point") return g;
  const [minX, minY, maxX, maxY] = g.getExtent();
  return new Point([(minX + maxX) / 2, (minY + maxY) / 2]);
}

export default function POILayer({ url = "/data/POI.json", visibleCats }) {
  const { map } = useContext(MapContext);
  const layerRef = useRef(null);
  const overlayRef = useRef(null);
  const tooltipElRef = useRef(null);
  const normVisibleRef = useRef(null);

  const styleCache = useMemo(() => {
    const cache = {};
    const font =
      "25px system-ui, Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji";
    Object.entries(EMOJI).forEach(([cat, glyph]) => {
      cache[cat] = new Style({
        text: new Text({ text: glyph, font, offsetY: -6 }),
      });
    });
    return cache;
  }, []);

  const normVisible = useMemo(() => {
    if (!visibleCats) return null;
    const s = new Set();
    for (const c of visibleCats) s.add(normalizeCategory(c));
    return s;
  }, [visibleCats]);

  const styleFn = useCallback(
    (f) => {
      const cat = f.get("poi_cat");
      const vis = normVisibleRef.current;
      if (vis && !vis.has(cat)) return null;
      return styleCache[cat] || styleCache.other;
    },
    [styleCache]
  );

  useEffect(() => {
    if (!map) return;

    const source = new VectorSource();
    const format = new GeoJSON();
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        const all = [];
        Object.entries(json).forEach(([group, fc]) => {
          const cat = normalizeCategory(group);
          const feats = format.readFeatures(fc, {
            featureProjection: "EPSG:3857",
          });
          feats.forEach((f) => {
            const name =
              f.get("name") ||
              f.get("Name") ||
              f.get("amenity") ||
              f.get("leisure") ||
              f.get("tourism") ||
              group;
            const iconF = f.clone();
            iconF.setGeometry(centroidOf(f));
            iconF.set("poi_cat", cat);
            iconF.set("label", name);
            all.push(iconF);
          });
        });
        source.addFeatures(all);
      })
      .catch((err) => {
        if (err && err.name === "AbortError") return;
      });

    const layer = new VectorLayer({
      source,
      properties: { id: "poi-layer" },
      style: styleFn,
      renderMode: "image",
      declutter: true,
      updateWhileAnimating: false,
      updateWhileInteracting: false,
    });

    const tooltipEl = document.createElement("div");
    tooltipEl.className = "poi-tooltip";
    tooltipElRef.current = tooltipEl;

    const overlay = new Overlay({
      element: tooltipEl,
      offset: [0, -18],
      positioning: "bottom-center",
      stopEvent: false,
    });

    map.addLayer(layer);
    map.addOverlay(overlay);

    let raf = 0;
    let lastPixel = null;
    const handleMove = () => {
      raf = 0;
      if (!lastPixel) return;
      if (!layer.getVisible()) {
        tooltipEl.style.display = "none";
        return;
      }
      const feat = map.forEachFeatureAtPixel(
        lastPixel,
        (f, l) => (l === layer ? f : null),
        { hitTolerance: 4 }
      );
      if (feat) {
        const cat = feat.get("poi_cat");
        const vis = normVisibleRef.current;
        if (vis && !vis.has(cat)) {
          tooltipEl.style.display = "none";
          return;
        }
        overlay.setPosition(feat.getGeometry().getCoordinates());
        tooltipEl.textContent = feat.get("label") || "";
        tooltipEl.style.display = "block";
      } else {
        tooltipEl.style.display = "none";
      }
    };

    const onMove = (evt) => {
      lastPixel = evt.pixel;
      if (!raf) raf = requestAnimationFrame(handleMove);
    };

    map.on("pointermove", onMove);
    layerRef.current = layer;
    overlayRef.current = overlay;

    return () => {
      controller.abort();
      if (raf) cancelAnimationFrame(raf);
      map.un("pointermove", onMove);
      map.removeOverlay(overlay);
      map.removeLayer(layer);
    };
  }, [map, url, styleFn]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    normVisibleRef.current = normVisible;
    layer.setVisible(!normVisible || normVisible.size > 0);
    layer.changed();

    if (overlayRef.current && tooltipElRef.current) {
      tooltipElRef.current.style.display = "none";
    }
  }, [normVisible]);

  return null;
}
