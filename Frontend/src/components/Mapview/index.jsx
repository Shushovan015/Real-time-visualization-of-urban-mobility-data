import React from "react";
import MapContainer from "./MapContainer";
import BoundaryMaskLayer from "./Layers/BoundaryMaskLayer";
import ZoomControl from "./Controls/ZoomControl";
import SidebarToggle from "./Controls/SidebarToggle";
import Scalebar from "./Controls/Scalebar";
import CrowdHeatmapLayer from "./Layers/heatmapLayer";
import MovementLayer from "./Layers/MovementLayer";
// import BaseLayer from "./Layers/BaseLayer";
import "./map.css";
import LayerSwitcherControl from "./Controls/LayerSwitcherControl";
import CrowdAlertPopup from "./Utils/CrowdAlertPopup";
export default function MapView({ sidebarOpen, toggleSidebar, data }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer center={[10.9, 49.9]} zoom={13.5}>
        {/* <BaseLayer /> */}
        <BoundaryMaskLayer url="/data/bamberg-boundary.geojson" />
        <ZoomControl />
        <Scalebar />
        <SidebarToggle isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <LayerSwitcherControl />
        <CrowdHeatmapLayer data={data.data} />
        <MovementLayer movement={data.movement} />
        <CrowdAlertPopup data={data?.data} />
      </MapContainer>
    </div>
  );
}
