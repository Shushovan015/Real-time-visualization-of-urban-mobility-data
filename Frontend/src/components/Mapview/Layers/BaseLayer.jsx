import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";

export const baseLayers = [
  new TileLayer({
    title: "OpenStreetMap",
    type: "base",
    visible: true,
    source: new OSM(),
  }),
  new TileLayer({
    title: "OSM Humanitarian",
    type: "base",
    visible: false,
    source: new XYZ({
      url: "https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      attributions:
        "© OpenStreetMap contributors, Tiles style by Humanitarian OSM Team",
      crossOrigin: "anonymous",
    }),
  }),
  new TileLayer({
    title: "Stamen Toner",
    type: "base",
    visible: false,
    source: new XYZ({
      url: "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",
      attributions:
        'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      crossOrigin: "anonymous",
    }),
  }),
];
