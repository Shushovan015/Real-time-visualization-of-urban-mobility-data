// CrowdAlertPopup.jsx
import React, { useEffect, useState } from "react";

export default function CrowdAlertPopup({ data }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (data) {
      const crowded = data.filter((d) => d.visitors > 200);
      if (crowded.length > 0) {
        const alertList = crowded.map((d) => ({
          id: d.location,
          message: `⚠️ High crowd at ${d.location} (${d.visitors} visitors)`,
        }));
        setAlerts(alertList);

        const timer = setTimeout(() => {
          setAlerts([]);
        }, 5000);

        return () => clearTimeout(timer);
      } else {
        setAlerts([]);
      }
    }
  }, [data]);

  return (
    <>
      {alerts.map((alert, i) => (
        <div
          key={alert.id}
          style={{
            position: "absolute",
            top: `${1 + i * 3.5}em`,
            right: "1em",
            backgroundColor: "#ff4d4f",
            color: "white",
            padding: "8px 12px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            zIndex: 2000,
            fontWeight: "bold",
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          {alert.message}
        </div>
      ))}
    </>
  );
}
