// MapContainer.jsx
import React, { useRef, useEffect, useState, createContext } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { defaults as defaultControls } from "ol/control";
import { fromLonLat } from "ol/proj";
import { baseLayers } from "../Layers/BaseLayer";
import { overlayLayers } from "../Layers/OverlayLayers";

export const MapContext = createContext(null);

export default function MapContainer({ children, center, zoom }) {
  const mapRef = useRef();
  const [map, setMap] = useState(null);

  useEffect(() => {
    const mapInstance = new Map({
      target: mapRef.current,
      view: new View({
        center: fromLonLat(center),
        zoom,
        maxZoom: 18, 
        minZoom: 13.5,
      }),
      layers: [...baseLayers, ...overlayLayers],
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
    });
    // force OL to recalc its size after CSS/layout settles
    setTimeout(() => mapInstance.updateSize(), 0);
    // this *will* cause a rerender
    setMap(mapInstance);
    return () => mapInstance.setTarget(undefined);
  }, [center, zoom]);

  return (
    <div ref={mapRef} style={{ width: "100%", height: "100%" }}>
      <MapContext.Provider value={{ map }}>{children}</MapContext.Provider>
    </div>
  );
}
