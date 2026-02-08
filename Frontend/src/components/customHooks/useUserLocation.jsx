import { useEffect, useState } from "react";

export default function useUserLocation() {
  const [coords, setCoords] = useState(null); 
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    const onOk = (pos) => {
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    };
    const onErr = (err) => setError(err.message || "Location error");

    navigator.geolocation.getCurrentPosition(onOk, onErr, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    });

    const watchId = navigator.geolocation.watchPosition(onOk, () => {}, {
      enableHighAccuracy: false,
      maximumAge: 120000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { coords, error };
}
