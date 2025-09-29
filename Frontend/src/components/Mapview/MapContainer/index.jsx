// MapContainer.jsx
import React, { useRef, useEffect, useState, createContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { defaults as defaultControls } from "ol/control";
import { fromLonLat } from "ol/proj";
import { baseLayers } from "../Layers/BaseLayer";
import { overlayLayers } from "../Layers/OverlayLayers";
import homeActions from "../../../actions/home";

import useUserLocation from "../../customHooks/useUserLocation";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Circle as CircleStyle, Fill, Stroke } from "ol/style";

export const MapContext = createContext(null);

export default function MapContainer({ children, center, zoom }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const dispatch = useDispatch();

  const { coords: userLocation, error: locError } = useUserLocation();
  useEffect(() => {
    const mapInstance = new Map({
      target: mapRef.current,
      view: new View({
        center: fromLonLat(center),
        zoom,
        maxZoom: 18,
        minZoom: 12,
      }),
      layers: [
        new TileLayer({ source: new OSM() }),
        ...baseLayers,
        ...overlayLayers,
      ],
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
    });

    setTimeout(() => mapInstance.updateSize(), 0);
    setMap(mapInstance);
    return () => mapInstance.setTarget(undefined);
  }, []);

  useEffect(() => {
    if (!map || !userLocation) return;

    if (!map._userLayer) {
      const src = new VectorSource();
      const layer = new VectorLayer({
        source: src,
        zIndex: 9999,
        style: new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: "#2563eb" }), 
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          }),
        }),
      });
      map.addLayer(layer);
      map._userLayer = layer;
      map._userFeature = new Feature();
      src.addFeature(map._userFeature);
    }

    const coord3857 = fromLonLat([userLocation.lon, userLocation.lat]);
    map._userFeature.setGeometry(new Point(coord3857));

    if (!map._flewToUser) {
      map.getView().animate({
        center: coord3857,
        zoom: Math.max(14, map.getView().getZoom() || 14),
        duration: 600,
      });
      map._flewToUser = true;
    }
    dispatch(homeActions.storeUserLocation(userLocation));
  }, [map, userLocation]);

  return (
    <>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      <MapContext.Provider
        value={{ map, userLocation, locationError: locError }}
      >
        {children}
      </MapContext.Provider>

      {locError && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background: "#111827",
            color: "white",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            opacity: 0.9,
          }}
        >
          ⚠️ Location unavailable: {locError}. Using default city center.
        </div>
      )}
    </>
  );
}
