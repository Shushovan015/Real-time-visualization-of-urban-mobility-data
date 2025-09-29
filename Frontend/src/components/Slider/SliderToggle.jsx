import React, { useState } from "react";

export default function SliderToggle({ children }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        position: "absolute",
        bottom: "6.4em", 
        left: "1em",
        zIndex: 1001,
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        transition: "all 0.4s ease",
        overflow: "hidden",
        width: expanded ? "240px" : "38px",
        height: expanded ? "auto" : "38px",
        padding: expanded ? "10px" : "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {!expanded && (
        <span style={{ fontSize: "18px", padding: "4px" }}>🕘</span>
      )}
      {expanded && children}
    </div>
  );
}
