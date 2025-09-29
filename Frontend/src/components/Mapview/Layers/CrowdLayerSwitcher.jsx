import { useEffect, useRef, useState } from "react";
import { FaSlidersH } from "react-icons/fa";
import CrowdHeatmapLayer from "./heatmapLayer";
import CrowdIconLayer from "./CrowdIconHeatmap";
import KDEHeatmapLayer from "./KDEHeatmapLater";

function useIsMobile() {
  const [m, setM] = useState(
    typeof window !== "undefined" &&
      window.matchMedia("(max-width:640px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width:640px)");
    const h = (e) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}

export default function CrowdLayerSwitcher({
  data,
  onHover,
  mode,
  setMode,
  poiCats,
  visibleCats,
  toggleCat,
  setAllCats,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) =>
      panelRef.current &&
      !panelRef.current.contains(e.target) &&
      setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (val) => setMode(val);

  return (
    <>
      <div className="style-switcher" ref={panelRef}>
        <button
          type="button"
          className="switcher-trigger"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <FaSlidersH aria-hidden />
          <span>Style & POIs</span>
        </button>

        {open && (
          <div className={`switcher-panel ${isMobile ? "sheet" : ""}`}>
            {isMobile && (
              <div className="sheet-header">
                <div className="sheet-handle" />
                <div className="sheet-title">Map options</div>
                <button className="sheet-close" onClick={() => setOpen(false)}>
                  ✕
                </button>
              </div>
            )}

            <div className="section">
              <div className="section-title">Style</div>
              <div className="section-body">
                <label className="check">
                  <input
                    type="radio"
                    name="mode"
                    value="heatmap"
                    checked={mode === "heatmap"}
                    onChange={() => choose("heatmap")}
                  />
                  Colored
                </label>
                <label className="check">
                  <input
                    type="radio"
                    name="mode"
                    value="kde"
                    checked={mode === "kde"}
                    onChange={() => choose("kde")}
                  />
                  KDE
                </label>
                <label className="check">
                  <input
                    type="radio"
                    name="mode"
                    value="icon"
                    checked={mode === "icon"}
                    onChange={() => choose("icon")}
                  />
                  Icons
                </label>
              </div>
            </div>

            <div className="section">
              <div className="section-title with-actions">
                <span>POIs</span>
                <div className="title-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setAllCats(true)}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setAllCats(false)}
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="poi-grid">
                {poiCats?.map((cat) => (
                  <label key={cat} className="check">
                    <input
                      type="checkbox"
                      checked={visibleCats.has(cat)}
                      onChange={() => toggleCat(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {mode === "heatmap" && (
        <CrowdHeatmapLayer data={data} onHover={onHover} />
      )}
      {mode === "kde" && <KDEHeatmapLayer data={data} onHover={onHover} />}
      {mode === "icon" && <CrowdIconLayer data={data} onHover={onHover} />}
    </>
  );
}
