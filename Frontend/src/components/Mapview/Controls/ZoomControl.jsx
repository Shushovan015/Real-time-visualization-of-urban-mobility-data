import React, { useContext, useEffect } from "react";
import Zoom from "ol/control/Zoom";
import { MapContext } from "../MapContainer";

export default function ZoomControl() {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) return;
    const ctrl = new Zoom();
    map.addControl(ctrl);
    return () => map.removeControl(ctrl);
  }, [map]);

  return null; // it’s purely imperative
}
