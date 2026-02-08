import { Feature } from "ol";
import { LineString } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import { Stroke, Style } from "ol/style";
import * as turf from "@turf/turf";

export function createGridWithinBoundary(boundaryPolygon, spacing = 100) {
  const extent = boundaryPolygon.getExtent();
  const features = [];

  const turfBoundary = turf.polygon([
    boundaryPolygon
      .clone()
      .transform("EPSG:3857", "EPSG:4326")
      .getCoordinates()[0],
  ]);

  for (let x = extent[0]; x <= extent[2]; x += spacing) {
    const line = new LineString([
      [x, extent[1]],
      [x, extent[3]],
    ]);

    const turfLine = turf.lineString(
      line.clone().transform("EPSG:3857", "EPSG:4326").getCoordinates()
    );

    if (turf.booleanIntersects(turfLine, turfBoundary)) {
      features.push(new Feature(line));
    }
  }

  for (let y = extent[1]; y <= extent[3]; y += spacing) {
    const line = new LineString([
      [extent[0], y],
      [extent[2], y],
    ]);

    const turfLine = turf.lineString(
      line.clone().transform("EPSG:3857", "EPSG:4326").getCoordinates()
    );

    if (turf.booleanIntersects(turfLine, turfBoundary)) {
      features.push(new Feature(line));
    }
  }

  return new VectorLayer({
    source: new VectorSource({ features }),
    style: new Style({
      stroke: new Stroke({
        color: "rgba(0, 0, 0, 0.2)",
        width: 1,
      }),
    }),
  });
}
