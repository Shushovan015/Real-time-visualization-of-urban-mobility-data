import React from "react";

function Slider({ minutes, onMinutesChange }) {
  const handleChange = (e) => {
    onMinutesChange(Number(e.target.value));
  };

  return (
    <div style={{ width: "100%", textAlign: "center", marginTop: "10px" }}>
      <input
        type="range"
        min="0"
        max="30"
        step="1"
        value={minutes}
        onChange={handleChange}
      />
      <div style={{ fontSize: "14px", marginTop: "5px" }}>
        Showing data from last <strong>{minutes}</strong> minute
        {minutes !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default Slider;
