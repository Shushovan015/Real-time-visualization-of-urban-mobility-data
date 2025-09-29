import React, { useContext, useEffect } from "react";
import LayerSwitcher from "ol-layerswitcher";
import "ol-layerswitcher/dist/ol-layerswitcher.css";
import { MapContext } from "../MapContainer";

export default function LayerSwitcherControl() {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) return;

    const ctrl = new LayerSwitcher({
      activationMode: "click",
      startActive: false,
      tipLabel: "Layers",
      groupSelectStyle: "children",
    });
    map.addControl(ctrl);

    const el = ctrl.element; 
    el.setAttribute("aria-label", "Layer switcher");

    const mq = window.matchMedia("(max-width: 640px)");
    const applyMode = () => {
      el.classList.toggle("ls-mobile", mq.matches);
      el.classList.toggle("ls-desktop", !mq.matches);
    };
    applyMode();
    mq.addEventListener("change", applyMode);

    const onDocClick = (e) => {
      if (!el.classList.contains("shown")) return;
      if (!el.contains(e.target)) el.classList.remove("shown");
    };
    const onKey = (e) => {
      if (e.key === "Escape") el.classList.remove("shown");
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", applyMode);
      map.removeControl(ctrl);
    };
  }, [map]);

  return null;
}
