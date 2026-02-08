import { useEffect, useState } from "react";

const ICON = (code, temp) => {
  const map = {
    0: "☀️", 
    1: "🌤️", 2: "🌥️", 3: "☁️", 
    45: "🌫️", 48: "🌫️", 
    51: "🌦️", 53: "🌦️", 55: "🌦️", 
    61: "🌧️", 63: "🌧️", 65: "🌧️", 
    71: "🌨️", 73: "🌨️", 75: "🌨️",
    80: "🌦️", 81: "🌧️", 82: "🌧️", 
    95: "⛈️", 96: "⛈️", 99: "⛈️", 
  };
  return map[code] || (temp > 28 ? "🌞" : "🌡️");
};

export default function useWeather({ lat, lon, hours = 4 }) {
  const [data, setData] = useState({ now: null, next: [], error: null, loading: true });

  useEffect(() => {
    if (!lat || !lon) return;
    let cancelled = false;

    (async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weathercode&forecast_days=1&timezone=auto`;
        const res = await fetch(url);
        const json = await res.json();

        const hoursData = json?.hourly;
        if (!hoursData) throw new Error("No forecast data");

        const { time, temperature_2m, precipitation_probability, weathercode } = hoursData;

        const nowISO = new Date().toISOString().slice(0, 13); 
        const nowIndex = time.findIndex(t => t.startsWith(nowISO));
        if (nowIndex === -1) throw new Error("No current hour data");

        const nowItem = {
          hourLabel: "Now",
          temp: Math.round(temperature_2m[nowIndex]),
          pop: precipitation_probability[nowIndex],
          icon: ICON(weathercode[nowIndex], temperature_2m[nowIndex]),
        };

        const nextItems = [];
        for (let i = 1; i <= hours; i++) {
          const idx = nowIndex + i;
          if (idx >= time.length) break;
          nextItems.push({
            hourLabel: `+${i}h`,
            temp: Math.round(temperature_2m[idx]),
            pop: precipitation_probability[idx],
            icon: ICON(weathercode[idx], temperature_2m[idx]),
          });
        }

        if (!cancelled) setData({ now: nowItem, next: nextItems, error: null, loading: false });
      } catch (e) {
        if (!cancelled) setData({ now: null, next: [], error: e.message, loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [lat, lon, hours]);

  return data;
}
