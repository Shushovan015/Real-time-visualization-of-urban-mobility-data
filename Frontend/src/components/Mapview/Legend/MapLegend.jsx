import low from "../../../assets/body-low.svg";
import medium from "../../../assets/body-medium.svg";
import high from "../../../assets/body-high.svg";
import React, { useEffect, useState } from "react";
import "../map.css";

const COLORS = {
  chill: "#2dc653",
  lively: "#ffc107",
  overcrowded: "#dc3545",
};

function ColorChip({ color, label, note }) {
  return (
    <div className="legend-row">
      <span className="chip" style={{ background: color }} />
      <div className="legend-col">
        <span className="legend-label">{label}</span>
        {note ? <span className="legend-note">{note}</span> : null}
      </div>
    </div>
  );
}

const LegendRow = ({ iconSrc, count, size, label }) => (
  <div className="legend-row">
    <div className="legend-icons">
      {Array.from({ length: count }).map((_, i) => (
        <img
          key={i}
          src={iconSrc}
          style={{ width: size, height: "auto" }}
          alt=""
        />
      ))}
    </div>
    <span className="legend-note">{label}</span>
  </div>
);

export default function MapLegend({ mode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  if (isMobile) {
    return (
      <>
        <div className="fab fab-legend" onClick={() => setOpen(true)}>
          📊
        </div>

        {open && (
          <div className="panel-sheet">
            <button className="close-btn" onClick={() => setOpen(false)}>
              ✕
            </button>
            <h3>Legend</h3>

            {mode === "heatmap" ? (
              <>
                <ColorChip
                  color={COLORS.chill}
                  label="Chill"
                  note="≈ bottom 25% pressure"
                />
                <ColorChip
                  color={COLORS.lively}
                  label="Lively"
                  note="≈ middle 50% pressure"
                />
                <ColorChip
                  color={COLORS.overcrowded}
                  label="Overcrowded"
                  note="≈ top 25% pressure"
                />
              </>
            ) : mode === "kde" ? (
              <>
                <div className="kde-bar">
                  <span>Calm</span>
                  <div className="kde-grad" />
                  <span>Packed</span>
                </div>
              </>
            ) : (
              <>
                <LegendRow iconSrc={low} count={2} size={22} label="Chill" />
                <LegendRow
                  iconSrc={medium}
                  count={4}
                  size={28}
                  label="Lively"
                />
                <LegendRow
                  iconSrc={high}
                  count={6}
                  size={34}
                  label="Overcrowded"
                />
              </>
            )}

            <div className="legend-section">
              <div className="label-title">🕒 Time Slider</div>
              <div className="legend-note">
                Use the slider at the bottom right to explore visitor data from
                past 30 days.
              </div>
            </div>

            <div className="legend-section">
              <div className="label-title">Chart on Hover</div>
              <p className="legend-note">
                Tap a location to view hourly visitor trends (last 7 days)
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="map-legend bottom-right">
      <h3>Crowd Visualization Legend</h3>
      {mode === "heatmap" ? (
        <div className="legend-section">
          <div className="label-title">Crowd State (pressure percentiles)</div>
          <ColorChip
            color={COLORS.chill}
            label="Chill"
            note="≈ bottom 25% pressure"
          />
          <ColorChip
            color={COLORS.lively}
            label="Lively"
            note="≈ middle 50% pressure"
          />
          <ColorChip
            color={COLORS.overcrowded}
            label="Overcrowded"
            note="≈ top 25% pressure"
          />
          <div className="legend-note mt-4">
            Colors reflect relative crowding (recomputed per refresh).
          </div>
        </div>
      ) : mode === "kde" ? (
        <div className="legend-section">
          <div className="label-title">KDE Heatmap (density-based)</div>
          <div className="kde-bar">
            <span>Calm</span>
            <div className="kde-grad" />
            <span>Packed</span>
          </div>
          <div className="legend-note">
            Gradient shows relative crowd density: green = low, yellow = medium,
            red = very high.
          </div>
        </div>
      ) : (
        <div className="legend-section">
          <div className="label-title">Crowd State (icons)</div>
          <LegendRow
            iconSrc={low}
            count={2}
            size={22}
            label="Chill (few, small icons)"
          />
          <LegendRow
            iconSrc={medium}
            count={4}
            size={28}
            label="Lively (more, medium icons)"
          />
          <LegendRow
            iconSrc={high}
            count={6}
            size={34}
            label="Overcrowded (many, large icons)"
          />
          <div className="legend-note mt-4">
            Icon <strong>count</strong> and <strong>size</strong> scale with
            pressure.
          </div>
        </div>
      )}
    </div>
  );
}
