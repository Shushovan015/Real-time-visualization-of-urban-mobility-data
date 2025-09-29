import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  makeStateClassifier,
  DEFAULT_THRESHOLDS,
} from "../../../utils/crowdClassifier";
import "./crowd-alert.css";

const getId = (d) => d.location || d.name || d.placeId || String(d._id || "");
const getTs = (d) => {
  const t = new Date(d.timestamp || d.updatedAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};
const finite = (n) => (Number.isFinite(n) ? n : NaN);

export default function CrowdAlertPopup({ data, duration = 9000 }) {
  const timersRef = useRef({});
  const [alerts, setAlerts] = useState([]); 

  const latestRows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const m = new Map();
    for (const d of data) {
      const id = getId(d);
      if (!id) continue;
      const prev = m.get(id);
      if (!prev || getTs(d) > getTs(prev)) m.set(id, d);
    }
    return [...m.values()];
  }, [data]);

  const classify = useMemo(() => {
    const pressures = latestRows
      .map((d) => finite(d?.pressure))
      .filter(Number.isFinite);
    const seed = pressures.length ? pressures : [0, 0.2, 0.4, 0.8, 1.2];
    return makeStateClassifier(seed, DEFAULT_THRESHOLDS);
  }, [latestRows]);

  const overcrowded = useMemo(
    () =>
      latestRows
        .filter(
          (d) =>
            classify(finite(d?.pressure) || 0, d?.thresholds) === "overcrowded"
        )
        .map((d) => ({ id: getId(d), label: getId(d), since: getTs(d) })),
    [latestRows, classify]
  );

  useEffect(() => {
    const nextIds = new Set(overcrowded.map((a) => a.id));
    setAlerts((curr) => {
      const currIds = new Set(curr.map((a) => a.id));
      const added = overcrowded
        .filter((a) => !currIds.has(a.id))
        .map((a) => ({ ...a, addedAt: Date.now() }));
      for (const a of added) {
        if (timersRef.current[a.id]) continue;
        timersRef.current[a.id] = setTimeout(() => dismiss(a.id), duration);
      }
      const kept = curr.filter((a) => nextIds.has(a.id));
      return [...kept, ...added];
    });
    for (const id of Object.keys(timersRef.current)) {
      if (!nextIds.has(id)) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    }
  }, [overcrowded, duration]);

  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    },
    []
  );

  const dismiss = (id) => {
    setAlerts((c) => c.filter((x) => x.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };

  if (!alerts.length) return null;

  return createPortal(
    <div
      className="crowdToast__container"
      aria-live="polite"
      aria-atomic="true"
    >
      {alerts.map((a, i) => (
        <div key={a.id} className="crowdToast" role="status">
          <div className="crowdToast__icon" aria-hidden>
            ⚠️
          </div>
          <div className="crowdToast__content">
            <div className="crowdToast__title">Overcrowded</div>
            <div className="crowdToast__desc">
              {a.label} — expect congestion
            </div>
          </div>
          <button
            className="crowdToast__close"
            onClick={() => dismiss(a.id)}
            aria-label="Dismiss alert"
          >
            ×
          </button>
          <div
            className="crowdToast__progress"
            style={{
              "--crowdToastProgress": `${Math.min(
                1,
                (Date.now() - a.addedAt) / duration
              )}`,
            }}
          />
        </div>
      ))}
    </div>,
    document.body
  );
}
