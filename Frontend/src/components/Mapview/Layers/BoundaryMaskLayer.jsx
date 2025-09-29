import React, { useContext, useEffect } from "react";
import { MapContext } from "../MapContainer";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import MultiPolygon from "ol/geom/MultiPolygon";
import { Fill, Stroke, Style } from "ol/style";
import { fromLonLat } from "ol/proj";
// import { createGridWithinBoundary } from "../Utils/gridUtils";

export default function BoundaryMaskLayer({ url }) {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) return;

    fetch(url)
      .then((res) => res.json())
      .then((geojson) => {
        const feature = geojson.features?.[0];
        const geometry = feature?.geometry;

        if (!geometry || geometry.type !== "MultiPolygon") {
          console.error(
            "Invalid or unsupported geometry type:",
            geometry?.type
          );
          return;
        }

        const coordinates = geometry.coordinates;

        const transformed = coordinates.map((polygon, i) =>
          polygon.map((ring, j) => {
            if (!Array.isArray(ring) || !ring.length || !Array.isArray(ring[0]))
              return [];
            return ring.map((coord) => {
              if (coord.length !== 2 || typeof coord[0] !== "number")
                return [0, 0];
              return fromLonLat(coord);
            });
          })
        );

        const boundaryMultiPolygon = new MultiPolygon(transformed);
        const boundaryFeature = new Feature(boundaryMultiPolygon);

        const boundaryLayer = new VectorLayer({
          source: new VectorSource({
            features: [boundaryFeature],
          }),
          style: new Style({
            stroke: new Stroke({ color: "black", width: 2 }),
            fill: new Fill({ color: "rgba(0, 0, 0, 0)" }), 
          }),
        });
        map.addLayer(boundaryLayer);

        // const firstPolygon = new Polygon(transformed[0]);
        // const gridLayer = createGridWithinBoundary(firstPolygon, 100); // 500m grid
        // map.addLayer(gridLayer);

        const outerRing = [
          fromLonLat([-180, -90]),
          fromLonLat([180, -90]),
          fromLonLat([180, 90]),
          fromLonLat([-180, 90]),
          fromLonLat([-180, -90]),
        ];

        const holes = transformed.flatMap((polygon) => polygon.slice(0, 1)); 

        const maskPolygon = new Polygon([outerRing, ...holes]);
        const maskFeature = new Feature(maskPolygon);

        const maskLayer = new VectorLayer({
          source: new VectorSource({
            features: [maskFeature],
          }),
          style: new Style({
            fill: new Fill({ color: "rgba(0, 0, 0, 0.4)" }), 
          }),
        });
        map.addLayer(maskLayer);

        map.getView().fit(boundaryMultiPolygon.getExtent(), {
          padding: [20, 20, 20, 20],
          duration: 1000,
        });
      })
      .catch((err) => {
        console.error("Failed to load or parse boundary GeoJSON:", err);
      });
  }, [map, url]);

  return null;
}
