import * as turf from "@turf/turf";

export function enrichCrowdData(input) {
  if (input && Array.isArray(input.data)) {
    return {
      ...input,
      data: input.data.map(enrichItem),
    };
  }

  if (Array.isArray(input)) {
    return input.map((frame) => ({
      ...frame,
      data: frame.data?.map(enrichItem) || [],
    }));
  }

  console.warn("enrichCrowdData() received invalid input");
  return input;
}

function enrichItem(item) {
  const geometryType = item.properties?.geometry_type?.toLowerCase();
  const coords = item.geometry;
  const visitors = item.visitors || 0;

  let geometry_value = null;
  let geometry_unit = null;
  let density = null;

  try {
    if (geometryType === "polygon" && Array.isArray(coords)) {
      const polygon = turf.polygon([coords]);
      geometry_value = turf.area(polygon);
      geometry_unit = "m²";
      density = visitors / geometry_value;
    } else if (geometryType === "linestring" && Array.isArray(coords)) {
      const line = turf.lineString(coords);
      geometry_value = turf.length(line, { units: "kilometers" }) * 1000;
      geometry_unit = "m";
      density = visitors / geometry_value;
    }
  } catch (err) {
    console.warn(`Failed to calculate for ${item.location}`, err);
  }

  return {
    ...item,
    geometry_value: geometry_value ? +geometry_value.toFixed(2) : null,
    geometry_unit,
    density: density ? +density.toFixed(4) : null,
  };
}
