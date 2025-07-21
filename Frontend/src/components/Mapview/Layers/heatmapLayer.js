import { useEffect, useRef, useContext } from "react";
import { Heatmap as HeatmapLayer } from "ol/layer";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import Overlay from "ol/Overlay";
import { MapContext } from "../MapContainer";

export default function CrowdHeatmapLayer({ data }) {
  const { map } = useContext(MapContext);
  const layerRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!map || !data?.length) return;

    // Remove existing layer and overlay if present
    if (layerRef.current) map.removeLayer(layerRef.current);
    if (overlayRef.current) map.removeOverlay(overlayRef.current);

    const maxVisitors = Math.max(...data.map((p) => p.visitors), 1);

    const features = data.map((point) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([point.lon, point.lat])),
        location: point.location,
        visitors: point.visitors,
      });

      let weight = point.visitors / maxVisitors;
      weight = Math.pow(weight, 0.85); // visibility boost
      weight = Math.max(0.2, Math.min(1, weight)); // clamp between 0.2–1

      feature.set("weight", weight);
      return feature;
    });

    const source = new VectorSource({ features });

    const heatmap = new HeatmapLayer({
      source,
      radius: 35,
      blur: 25,
      weight: "weight",
      zIndex: 1000,
    });

    map.addLayer(heatmap);
    layerRef.current = heatmap;

    // Create tooltip element
    const tooltipEl = document.createElement("div");
    tooltipEl.className = "heatmap-tooltip";
    tooltipEl.style.cssText = `
      background: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #ccc;
      font-size: 12px;
      white-space: nowrap;
      position: relative;
      pointer-events: none;
    `;

    const overlay = new Overlay({
      element: tooltipEl,
      offset: [0, -10],
      positioning: "bottom-center",
    });
    map.addOverlay(overlay);
    overlayRef.current = overlay;

    map.on("pointermove", (e) => {
      let found = false;
      map.forEachFeatureAtPixel(e.pixel, (feature) => {
        const location = feature.get("location");
        const visitors = feature.get("visitors");

        if (location && visitors != null) {
          tooltipEl.innerHTML = `
            <strong>${location}</strong><br />
            ${visitors} visitors
          `;
          overlay.setPosition(e.coordinate);
          tooltipEl.style.display = "block";
          found = true;
        }
      });

      if (!found) {
        tooltipEl.style.display = "none";
      }
    });

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
      if (overlayRef.current) map.removeOverlay(overlayRef.current);
    };
  }, [map, data]);

  return null;
}
