import React, { useContext, useEffect } from "react";
import LayerSwitcher from "ol-layerswitcher";
import "ol-layerswitcher/dist/ol-layerswitcher.css";
import { MapContext } from "../MapContainer";

export default function LayerSwitcherControl() {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) return;

    const switcher = new LayerSwitcher({
      activationMode: "click",
      startActive: false,
      tipLabel: "Layers",
      groupSelectStyle: "children",
    });

    map.addControl(switcher);

    return () => {
      map.removeControl(switcher);
    };
  }, [map]);

  return null;
}
