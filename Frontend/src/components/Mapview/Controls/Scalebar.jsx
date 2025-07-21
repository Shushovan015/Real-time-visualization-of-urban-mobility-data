import { useContext, useEffect } from "react";
import { ScaleLine } from "ol/control";

import { MapContext } from "../MapContainer";

const Scalebar = () => {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) return () => {};

    const scaleBarcontrol = new ScaleLine({
      units: "metric",
      // bar: true,
      // steps: 4,
      // text: true,
      // minWidth: 140,
    });

    map.controls.push(scaleBarcontrol);

    return () => map.controls.remove(scaleBarcontrol);
  }, [map]);

  return null;
};

export default Scalebar;
