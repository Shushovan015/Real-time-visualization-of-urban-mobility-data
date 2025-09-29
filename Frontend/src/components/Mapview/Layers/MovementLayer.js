import { useEffect, useRef, useContext } from "react";
import { Vector as VectorLayer } from "ol/layer";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LineString } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { Style, Stroke } from "ol/style";
import Overlay from "ol/Overlay";
import { MapContext } from "../MapContainer";

export default function MovementLayer({ movement }) {
  const { map } = useContext(MapContext);
  const layerRef = useRef();
  const overlayRef = useRef();
  const animationRef = useRef();

  useEffect(() => {
    if (!map || !movement?.length) return;

    if (layerRef.current) map.removeLayer(layerRef.current);
    if (overlayRef.current) map.removeOverlay(overlayRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const features = [];
    const now = Date.now();

    movement.forEach(({ from, to, visitors, timestamp }) => {
      if (from.lat === to.lat && from.lon === to.lon) return;

      const fromCoord = fromLonLat([from.lon, from.lat]);
      const toCoord = fromLonLat([to.lon, to.lat]);
      const thickness = Math.min(Math.max(visitors / 25, 1), 8); 
      const alpha = Math.min(1, Math.max(0.2, visitors / 320)); 

      const mainLine = new LineString([fromCoord, toCoord]);
      const mainFeature = new Feature({
        geometry: mainLine,
        visitors,
      });

      const animatedStroke = new Stroke({
        color: `rgba(0, 76, 255, ${alpha})`,
        width: thickness,
        lineCap: "round",
        lineDash: [10, 10],
        lineDashOffset: 0,
      });

      const style = new Style({ stroke: animatedStroke });
      mainFeature.setStyle(style);
      mainFeature._dashStroke = animatedStroke; 
      features.push(mainFeature);

      const lineLength = Math.hypot(
        toCoord[0] - fromCoord[0],
        toCoord[1] - fromCoord[1]
      );
      const arrowLength = Math.min(lineLength * 0.025, 200); 

      const angle = Math.atan2(
        toCoord[1] - fromCoord[1],
        toCoord[0] - fromCoord[0]
      );

      const left = [
        toCoord[0] - arrowLength * Math.cos(angle - Math.PI / 6),
        toCoord[1] - arrowLength * Math.sin(angle - Math.PI / 6),
      ];
      const right = [
        toCoord[0] - arrowLength * Math.cos(angle + Math.PI / 6),
        toCoord[1] - arrowLength * Math.sin(angle + Math.PI / 6),
      ];

      const leftArrow = new Feature(new LineString([toCoord, left]));
      const rightArrow = new Feature(new LineString([toCoord, right]));

      const arrowStyle = new Style({
        stroke: new Stroke({
          color: `rgba(0, 76, 255, ${alpha})`,
          width: thickness,
        }),
      });

      leftArrow.setStyle(arrowStyle);
      rightArrow.setStyle(arrowStyle);
      features.push(leftArrow, rightArrow);
    });

    const source = new VectorSource({ features });
    const layer = new VectorLayer({ source, zIndex: 1500 });
    map.addLayer(layer);
    layerRef.current = layer;

    const tooltipEl = document.createElement("div");
    tooltipEl.className = "tooltip";
    tooltipEl.style.cssText =
      "background:#fff;padding:4px 8px;border-radius:4px;border:1px solid #ccc;font-size:12px;white-space:nowrap";
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
        if (feature.getGeometry().getType() === "LineString") {
          const visitors = feature.get("visitors");
          if (visitors) {
            tooltipEl.innerHTML = `${visitors} visitors moved`;
            overlay.setPosition(e.coordinate);
            tooltipEl.style.display = "block";
            found = true;
          }
        }
      });
      if (!found) tooltipEl.style.display = "none";
    });

    let dashOffset = 0;
    const animate = () => {
      dashOffset -= 1;
      features.forEach((f) => {
        if (f._dashStroke) {
          f._dashStroke.setLineDashOffset(dashOffset);
        }
      });
      map.render();
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
      if (overlayRef.current) map.removeOverlay(overlayRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [map, movement]);

  return null;
}
