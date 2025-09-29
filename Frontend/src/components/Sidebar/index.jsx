import React, { useState, useEffect } from "react";
import {
  FiSearch,
  FiFilter,
  FiChevronRight,
  FiChevronDown,
  FiMoreVertical,
} from "react-icons/fi";
import "./index.css";

const CATEGORIES = [
  // {
  //   title: "Administrative Boundaries",
  //   key: "admin-boundaries",
  //   items: ["City Boundary", "Districts", "Municipal Divisions"],
  // },
  {
    title: "Public Infrastructure",
    key: "public-infra",
    items: [
      "Bus Stops",
      // "Train Stations",
      // "Bicycle Parking",
      "Public Toilets",
    ],
  },

  {
    title: "Points of Interest",
    key: "poi",
    items: [
      "Tourist Attractions",
      "Historical Sites",
      "Churches",
      "Museums",
      "Parks & Gardens",
      "Viewpoints",
      "Cafés & Restaurants",
      "Shops",
    ],
  },
  // {
  //   title: "Crowd Data",
  //   key: "crowd-data",
  //   items: ["Heatmap", "Flow Lines", "Crowd Density Zones"],
  // },
  {
    title: "Tourism Services",
    key: "tourism-services",
    items: ["Hotels", "Tourist Info Centers", "Guided Tour Routes"],
  },
  // {
  //   title: "Natural Features",
  //   key: "natural-features",
  //   items: ["River Regnitz", "Green Areas", "Elevation Contours"],
  // },
  // {
  //   title: "Mobility & Roads",
  //   key: "mobility",
  //   items: ["Main Roads", "Pedestrian Zones", "Bike Paths", "Parking Areas"],
  // },
];

export default function Sidebar() {
  const [openCats, setOpenCats] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [startLabel, setStartLabel] = useState("");
  const [endLabel, setEndLabel] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const handleChange = (e) => {
    const value = parseInt(e.target.value);
    setMinutesAgo(value);
  };

  const resetToNow = () => {
    setMinutesAgo(0);
  };

  const toggleCat = (key) => setOpenCats((o) => ({ ...o, [key]: !o[key] }));
  const toggleItem = (key) =>
    setCheckedItems((c) => ({ ...c, [key]: !c[key] }));

  function formatTimestamp(date) {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    const now = new Date();
    const endTime = new Date(now.getTime() - minutesAgo * 60 * 1000);
    const startTime = new Date(endTime.getTime() - 30 * 60 * 1000);

    const format = (d) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setStartLabel(format(startTime));
    setEndLabel(format(endTime));
  }, [minutesAgo]);

  return (
    <div className="sidebar">
      {/* Search + Filter */}
      {/* <div className="search-filter">
        <div className="search-wrapper">
          <FiSearch className="icon-search" />
          <input
            type="text"
            className="search-input"
            placeholder="Search layers…"
          />
        </div>
        <button className="btn-filter">
          <FiFilter size={20} />
        </button>
      </div> */}

      <ul className="cats">
        {CATEGORIES.map((cat) => (
          <li key={cat.key}>
            <div className="cat-header" onClick={() => toggleCat(cat.key)}>
              {openCats[cat.key] ? (
                <FiChevronDown size={16} />
              ) : (
                <FiChevronRight size={16} />
              )}
              <span className="cat-title">{cat.title}</span>
              <span className="cat-count">({cat.items.length})</span>
            </div>

            {openCats[cat.key] && (
              <ul className="items">
                {cat.items.map((item) => (
                  <li key={item} className="item-row">
                    <label className="item-checkbox-label">
                      <input
                        type="checkbox"
                        checked={!!checkedItems[item]}
                        onChange={() => toggleItem(item)}
                      />
                      <span className="item-text">{item}</span>
                    </label>
                    <FiMoreVertical className="item-more-icon" />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="time-slider-container">
        <div className="time-label">
          {minutesAgo === 0 ? (
            <span className="live-label">Live</span>
          ) : (
            <span>
              Viewing <strong>{minutesAgo} minutes ago</strong>
            </span>
          )}
          {minutesAgo !== 0 && (
            <button className="reset-btn" onClick={resetToNow}>
              ⏱ Back to Live
            </button>
          )}
        </div>

        <input
          type="range"
          min="0"
          max="30"
          value={minutesAgo}
          onChange={handleChange}
          className="time-slider"
        />

        <div className="tick-labels">
          {["Now", "5m", "10m", "15m", "20m", "25m", "30m"].map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        <div className="last-updated-footer">
          Last updated: <strong>{formatTimestamp(lastUpdated)}</strong>
        </div>
      </div>
    </div>
  );
}
