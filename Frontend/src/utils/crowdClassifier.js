export const DEFAULT_THRESHOLDS = {
  chillMax: 0.35,
  livelyMax: 1.05,
};

const TUNE = {
  chillFloorFrac: 0.2,
  livelyCapFrac: 0.85,
  nearEps: 0.05,
  overBoostPct: 0.15,
};

const buildQuantileFn = (values) => {
  const arr = values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if (!arr.length) return () => 0;
  return (p) => {
    if (p <= 0) return arr[0];
    if (p >= 1) return arr[arr.length - 1];
    const idx = Math.floor(p * (arr.length - 1));
    return arr[idx];
  };
};

export const makeStateClassifier = (pressures, globalThresholds = DEFAULT_THRESHOLDS) => {
  const q = buildQuantileFn(pressures);
  const q20 = q(TUNE.chillFloorFrac);
  const q85 = q(TUNE.livelyCapFrac);

  return (p, localThresholds) => {
    const base = { ...globalThresholds, ...(localThresholds || {}) };
    const chillMax = Number.isFinite(base.chillMax) ? base.chillMax : DEFAULT_THRESHOLDS.chillMax;
    const livelyMax = Number.isFinite(base.livelyMax) ? base.livelyMax : DEFAULT_THRESHOLDS.livelyMax;

    if (!Number.isFinite(p)) return "chill";
    if (p <= chillMax * (1 - TUNE.nearEps)) return "chill";
    if (p <= q20) return "chill";
    if (p <= q85) return "lively";
    if (p > livelyMax * (1 + TUNE.overBoostPct)) return "overcrowded";
    if (p >= livelyMax * (1 - TUNE.nearEps)) return "overcrowded";
    return "lively";
  };
};
