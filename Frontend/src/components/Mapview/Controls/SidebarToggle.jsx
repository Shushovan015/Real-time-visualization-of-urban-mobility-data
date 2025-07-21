import React from "react";

export default function SidebarToggle({ isOpen, toggleSidebar }) {
  return (
    <button
      onClick={toggleSidebar}
      aria-label="Toggle sidebar"
      className="sidebar-toggle"
      style={{
        position: "absolute",
        top: "1em",
        left: "1em",
        width: "32px",
        height: "32px",
        backgroundColor: "#007bff",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      {isOpen ? "<" : ">"}
    </button>
  );
}
