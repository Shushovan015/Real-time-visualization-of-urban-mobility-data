import React, { useContext, useEffect } from "react";
import { MapContext } from "../MapContainer";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import { Fill, Style } from "ol/style";
import { fromLonLat } from "ol/proj";
import { createGridWithinBoundary } from "../Utils/gridUtils"; // 👈 import the grid helper

export default function BoundaryMaskLayer({ url }) {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) return;

    fetch(url)
      .then((res) => res.json())
      .then((geojson) => {
        const boundaryCoords = geojson.features[0].geometry.coordinates[0].map(
          (coord) => fromLonLat(coord)
        );

        // ✅ Create actual polygon for boundary
        const boundaryPolygon = new Polygon([boundaryCoords]);
        const boundaryFeature = new Feature(boundaryPolygon);

        // ✅ Create and add grid within boundary
        const gridLayer = createGridWithinBoundary(boundaryPolygon, 500); // 500 meter spacing
        map.addLayer(gridLayer);

        // 🔲 Create mask polygon
        const outer = [
          fromLonLat([-180, -90]),
          fromLonLat([180, -90]),
          fromLonLat([180, 90]),
          fromLonLat([-180, 90]),
          fromLonLat([-180, -90]),
        ];
        const maskPolygon = new Polygon([outer, boundaryCoords]);

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
      });
  }, [map, url]);

  return null;
}
