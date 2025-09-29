import { useEffect, useRef, useContext, useState } from "react";
import { MapContext } from "../MapContainer";
import { Control } from "ol/control";
import useWeather from "../../customHooks/useWeather";

export default function WeatherStripControl({ lat, lon, hours = 4 }) {
  const { map } = useContext(MapContext);
  const elRef = useRef(null);
  const ctrlRef = useRef(null);
  const { now, next, loading, error } = useWeather({ lat, lon, hours });
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    if (!map) return;
    if (ctrlRef.current) return;

    const el = document.createElement("div");
    el.className = "ol-unselectable ol-control crowd-weather-ctrl";
    elRef.current = el;

    const ctrl = new Control({ element: el });
    map.addControl(ctrl);
    ctrlRef.current = ctrl;

    return () => {
      if (ctrlRef.current) {
        map.removeControl(ctrlRef.current);
        ctrlRef.current = null;
      }
    };
  }, [map, isMobile]);

  useEffect(() => {
    if (isMobile) return;
    if (!elRef.current) return;

    elRef.current.innerHTML = `
      <div class="cw-title">Weather (now → next ${Math.min(hours, 4)}h)</div>
      <div class="cw-row">
        ${
          loading
            ? `<div class="cw-cell">Loading…</div>`
            : error
            ? `<div class="cw-cell">⚠️ ${error}</div>`
            : [
                now &&
                  `<div class="cw-cell">
                    <div class="cw-when">${now.hourLabel}</div>
                    <div class="cw-main">${now.icon} ${now.temp}°</div>
                    ${
                      now.rainTxt
                        ? `<div class="cw-sub">${now.rainTxt}</div>`
                        : ``
                    }
                  </div>`,
                ...next.map(
                  (n) => `<div class="cw-cell">
                    <div class="cw-when">${n.hourLabel}</div>
                    <div class="cw-main">${n.icon} ${n.temp}°</div>
                    ${n.rainTxt ? `<div class="cw-sub">${n.rainTxt}</div>` : ``}
                  </div>`
                ),
              ].join("")
        }
      </div>`;
  }, [now, next, loading, error, hours, isMobile]);

  if (isMobile) {
    return (
      <div className="fab-weather-wrap">
        {!open ? (
          <div className="fab fab-weather" onClick={() => setOpen(true)}>
            {loading || error || !now ? "☁️" : `${now.icon} ${now.temp}°`}
          </div>
        ) : (
          <div className="weather-dropdown">
            <button className="close-btn" onClick={() => setOpen(false)}>
              ✕
            </button>
            {next.map((n, i) => (
              <div className="cw-cell" key={i}>
                <div className="cw-when">{n.hourLabel}</div>
                <div className="cw-main">
                  {n.icon} {n.temp}°
                </div>
                {n.rainTxt && <div className="cw-sub">{n.rainTxt}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
