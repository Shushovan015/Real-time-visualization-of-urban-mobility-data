import { useContext, useEffect, useMemo, useRef } from "react";
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

  const styleCache = useMemo(() => {
    const cache = {};
    const font =
      "25px system-ui, Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji";
    Object.entries(EMOJI).forEach(([cat, glyph]) => {
      cache[cat] = new Style({ text: new Text({ text: glyph, font, offsetY: -6 }) });
    });
    return cache;
  }, []);

  const normVisible = useMemo(() => {
    if (!visibleCats) return null;
    const s = new Set();
    for (const c of visibleCats) s.add(normalizeCategory(c));
    return s;
  }, [visibleCats]);

  useEffect(() => {
    if (!map) return;

    const source = new VectorSource();
    const format = new GeoJSON();

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        Object.entries(json).forEach(([group, fc]) => {
          const cat = normalizeCategory(group);
          const feats = format.readFeatures(fc, { featureProjection: "EPSG:3857" });
          feats.forEach((f) => {
            const name =
              f.get("name") || f.get("Name") || f.get("amenity") ||
              f.get("leisure") || f.get("tourism") || group;
            const iconF = f.clone();
            iconF.setGeometry(centroidOf(f));
            iconF.set("poi_cat", cat);
            iconF.set("label", name);
            source.addFeature(iconF);
          });
        });
      });

    const layer = new VectorLayer({
      source,
      properties: { id: "poi-layer" },
      style: (f) => styleCache[f.get("poi_cat")] || styleCache.other,
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

    const onMove = (evt) => {
      const feat = map.forEachFeatureAtPixel(evt.pixel, (f, l) => (l === layer ? f : null));
      if (feat) {
        overlay.setPosition(feat.getGeometry().getCoordinates());
        tooltipEl.textContent = feat.get("label") || "";
        tooltipEl.style.display = "block";
      } else {
        tooltipEl.style.display = "none";
      }
    };

    map.on("pointermove", onMove);
    layerRef.current = layer;
    overlayRef.current = overlay;

    return () => {
      map.un("pointermove", onMove);
      map.removeOverlay(overlay);
      map.removeLayer(layer);
    };
  }, [map, url, styleCache]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    layer.setStyle((f) => {
      const cat = f.get("poi_cat");
      if (normVisible && !normVisible.has(cat)) return null;
      return styleCache[cat] || styleCache.other;
    });

    layer.changed(); 
    if (overlayRef.current && tooltipElRef.current) {
      tooltipElRef.current.style.display = "none";
    }
  }, [normVisible, styleCache]);

  return null;
}
