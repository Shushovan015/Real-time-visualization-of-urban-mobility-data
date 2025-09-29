function estimateComfortFromCrowdScience(row) {
  const baseLOSArea = 1.6; 
  let comfortPpm2 = 1 / baseLOSArea; 

  const popNorm = row.popularity?.normalized ?? 0;
  comfortPpm2 *= 1 + popNorm * 0.3; 

  const rating = row.popularity?.rating ?? 3;
  comfortPpm2 *= 1 + ((rating - 3) / 2) * 0.1; 

  const histDensity = row.density ?? 0;
  if (histDensity > 1.5) comfortPpm2 *= 1.1; 

  comfortPpm2 = Math.min(comfortPpm2, 3.5); 

  return comfortPpm2;
}

export function estimateCapacity(row) {
  if (row.capacity && row.capacity > 0) return row.capacity;
  const area = row.geometry_unit === "m²" ? row.geometry_value : null;
  if (!area) return 300; 
  return Math.round(area * estimateComfortFromCrowdScience(row));
}

const BASE = { chillMax: 0.35, livelyMax: 1.05 };

export function estimateWidthMeters(row) {
  if (Number.isFinite(row?.properties?.width_m)) return row.properties.width_m;
  if (Number.isFinite(row?.properties?.width)) return row.properties.width;

  if (row?.geometry_type === "linestring") return 6; 
  if (row?.geometry_type === "polygon") return 18; 
  return 10; 
}

export function adaptivePressureThresholds(row) {
  let { chillMax, livelyMax } = BASE;

  const area =
    row.geometry_unit === "m²" && Number.isFinite(row.geometry_value)
      ? row.geometry_value
      : null;
  const width = estimateWidthMeters(row);
  const pop = row.popularity?.normalized ?? 0; 
  const rate = row.popularity?.rating ?? 3; 

  if (row.geometry_type === "polygon") {
    livelyMax += 0.15;
  } else if (row.geometry_type === "linestring") {
    chillMax -= 0.05;
    livelyMax -= 0.15;
  }

  const widthFactor = Math.max(-0.25, Math.min(0.25, (width - 10) / 40)); 
  chillMax = Math.max(0.25, chillMax + widthFactor * 0.5); 
  livelyMax = Math.max(chillMax + 0.3, livelyMax + widthFactor); 

  if (row.geometry_type === "polygon" && area) {
    const areaFactor = Math.max(
      -0.2,
      Math.min(0.2, (Math.log10(area) - Math.log10(5000)) * 0.35)
    );
    livelyMax = Math.max(chillMax + 0.3, livelyMax + areaFactor);
  }

  const popNudge = pop * 0.1; 
  const rateNudge = ((rate - 3) / 2) * 0.05; 
  livelyMax = Math.max(chillMax + 0.3, livelyMax + popNudge + rateNudge);

  chillMax = Math.max(0.2, Math.min(chillMax, 0.8));
  livelyMax = Math.max(chillMax + 0.3, Math.min(livelyMax, 1.6));

  return { chillMax, livelyMax };
}

export function flowRatePerMin(history, capacity) {
  if (!Array.isArray(history) || history.length < 2 || !capacity) return 0;
  const a = history[history.length - 1];
  const b = history[0];
  const dtMin = Math.max(0.1, (a.t - b.t) / 60000);
  const dv = (a.visitors - b.visitors) / capacity; 
  return dv / dtMin; 
}

export function simpleBadge({ state, pressure, livelyMax, flowRatePerMin }) {
  const highPressure = pressure >= livelyMax;
  const risingFast = flowRatePerMin >= 0.02; 
  const easing = flowRatePerMin <= -0.01; 
  const stableHigh = Math.abs(flowRatePerMin) <= 0.01;

  const FLOW_OK = 0.015; 
  const FLOW_HIGH = 0.025; 
  const FLOW_VHIGH = 0.035; 

  const flowHigh = flowRatePerMin >= FLOW_HIGH;
  const flowVHigh = flowRatePerMin >= FLOW_VHIGH;
  const flowCaution = flowRatePerMin >= FLOW_OK;

  if (highPressure || flowHigh) {
    if (flowVHigh && risingFast) return "⚠️ Very High Flow — Increasing Fast";
    if (flowVHigh) return "⚠️ Very High Flow — Manage Lines";
    if (risingFast) return "Crowd Increasing Fast";
    if (stableHigh) return "Holding High";
    if (easing) return "Getting Quieter";
    return "Getting Busier";
  }

  if (state === "Lively") {
    if (flowCaution && risingFast) return "High Throughput — Getting Busier";
    if (flowCaution && easing) return "High Throughput — Easing";
    if (easing) return "Getting Quieter";
    if (risingFast) return "Getting Busier";
    return "Steady Crowd";
  }

  if (state === "Chill" || state === "Calm") {
    if (flowCaution) return "Calm but High Throughput";
    return "Calm & Steady";
  }

  return null;
}

export function worthVisiting(popPct, state) {
  if (popPct == null) return null;
  const popular = popPct >= 70; 
  const calmish = state === "Calm";
  const busyish = state !== "Calm";

  if (popular && calmish) return "Very Popular";
  if (popular && busyish) return "Popular & Busy";
  if (!popular && calmish) return "Hidden Gem";
  if (!popular && busyish) return "Currently Hyped"; 
  return "Worth a Look";
}
