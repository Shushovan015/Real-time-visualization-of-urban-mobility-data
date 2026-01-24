import React, { useState, useMemo, useCallback } from "react";
import MapContainer from "./MapContainer";
import BoundaryMaskLayer from "./Layers/BoundaryMaskLayer";
import ZoomControl from "./Controls/ZoomControl";
import Scalebar from "./Controls/Scalebar";
import CrowdLayerSwitcher from "./Layers/CrowdLayerSwitcher";
import LayerSwitcherControl from "./Controls/LayerSwitcherControl";
import CrowdAlertPopup from "./Utils/CrowdAlertPopup";
import ChartPopup from "./Utils/ChartPopup";
import WeatherStripControl from "./Layers/WeatherStripControl";
import MapLegend from "./Legend/MapLegend";
import Slider from "../Slider";
import SliderToggle from "../Slider/SliderToggle";
import RecommendationsPanel from "./RecommendationPanel";
import "./map.css";
import POILayer from "./Layers/POILayers";

const ALL_CATS = [
  "park",
  "church",
  "toilet",
  "beergarden",
  "attraction",
  "cruise",
  "museum",
  "viewpoint",
  "playground",
  "squares",
  "theatre",
  "castle",
  "other",
];

export default function MapView({
  sidebarOpen,
  toggleSidebar,
  data,
  minutes,
  onMinutesChange,
}) {
  const [hoverInfo, setHoverInfo] = useState(null);
  const [mode, setMode] = useState("heatmap");
  // Start with POIs disabled to reduce initial load lag.
  const [visibleCats, setVisibleCats] = useState(() => new Set());

  const toggleCat = useCallback((cat) => {
    setVisibleCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const setAll = useCallback(
    (on) => setVisibleCats(on ? new Set(ALL_CATS) : new Set()),
    []
  );

  const cats = useMemo(() => ALL_CATS, []);
  const city = useMemo(() => ({ lat: 49.8926, lon: 10.8879 }), []);

  return (
    <div className="map-root">
      <MapContainer center={[10.9, 49.9]} zoom={12}>
        <BoundaryMaskLayer url="/data/bamberg-boundary.geojson" />
        <ZoomControl />
        <Scalebar />
        <LayerSwitcherControl />
        <CrowdLayerSwitcher
          data={data?.data}
          onHover={setHoverInfo}
          mode={mode}
          setMode={setMode}
          poiCats={cats}
          visibleCats={visibleCats}
          toggleCat={toggleCat}
          setAllCats={setAll}
        />
        <CrowdAlertPopup data={data?.data} />
        <ChartPopup hoverInfo={hoverInfo} />
        <MapLegend mode={mode} />
        <WeatherStripControl lat={city.lat} lon={city.lon} hours={4} />
        <RecommendationsPanel />
        {visibleCats.size > 0 ? (
          <POILayer url="/data/POI.json" visibleCats={visibleCats} />
        ) : null}
      </MapContainer>

      {/* Bottom time slider (unchanged) */}
      {/* <div className="map-slider-wrap">
        <SliderToggle>
          <Slider minutes={minutes} onMinutesChange={onMinutesChange} />
        </SliderToggle>
      </div> */}
    </div>
  );
}
