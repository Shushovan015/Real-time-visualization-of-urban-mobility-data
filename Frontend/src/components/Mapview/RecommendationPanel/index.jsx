import { useSelector } from "react-redux";
import { nowNextRecommendationsSelector } from "../../../selectors/home";
import React, { useEffect, useState } from "react";

export default function RecommendationsPanel() {
  const recommendations = useSelector(nowNextRecommendationsSelector);
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
        <div className="fab fab-recs" onClick={() => setOpen(true)}>
          🧭
        </div>

        {open && (
          <div className="panel-sheet">
            <button className="close-btn" onClick={() => setOpen(false)}>
              ✕
            </button>
            <h3>Suggested Destinations</h3>

            <div className="recommend-list">
              {recommendations.map((p, i) => (
                <div className="place-row" key={i}>
                  <div className="place-info">
                    <div className="place-name">{p.location}</div>
                    <div className="place-meta">
                      {Math.round(p.popularity.score * 100)}% •{" "}
                      {p.visitors.toLocaleString()} /{" "}
                      {p.capacity.toLocaleString()}
                    </div>
                  </div>
                  <div
                    className={`badge ${p.badge
                      ?.toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {p.badge}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="now-next-card">
      <h3>Now and Next Recommendations</h3>
      {recommendations.map((p, i) => (
        <div className="place-row" key={i}>
          <div className="place-info">
            <div className="place-name">{p.location}</div>
            <div className="place-meta">
              {Math.round(p?.popularity?.score * 100)}% popular •{" "}
              {p.visitors.toLocaleString()} / {p?.capacity?.toLocaleString()}{" "}
              ppl/cap
            </div>
          </div>
          <div className={`badge ${p?.badge?.toLowerCase().replace(" ", "-")}`}>
            {p.badge}
          </div>
        </div>
      ))}
    </div>
  );
}
