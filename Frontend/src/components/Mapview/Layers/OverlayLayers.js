import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Fill, Stroke } from "ol/style";

export const overlayLayers = [
  new VectorLayer({
    title: "City Boundary",
    type: "overlay",
    visible: true,
    source: new VectorSource({
      url: "/data/bamberg-boundary.geojson",
      format: new GeoJSON(),
    }),
    style: new Style({
      stroke: new Stroke({ color: "#333", width: 2 }),
      fill: new Fill({ color: "rgba(0, 0, 255, 0.1)" }),
    }),
  }),
];
