// const fs = require("fs");
// const levenshtein = require("fast-levenshtein");
// const client = require("./redisClient");

// const crowdData = require("./data/ariadne_export.json");
// const placeData = require("./data/grid-places.json");

// // Match location names to coordinates
// const getPlaceCoordinates = (locationName) => {
//   const placeNames = placeData.map((p) => p.place.split(",")[0].trim());
//   let bestMatch = null;
//   let minDistance = Infinity;

//   for (const name of placeNames) {
//     const dist = levenshtein.get(locationName, name);
//     if (dist < minDistance) {
//       minDistance = dist;
//       bestMatch = name;
//     }
//   }

//   if (minDistance > 15) return null;

//   const matched = placeData.find((p) =>
//     p.place.toLowerCase().includes(bestMatch.toLowerCase())
//   );
//   return matched ? { lat: matched.lat, lon: matched.lon } : null;
// };

// // Gaussian visitor distribution
// const generate1MinDistribution = (total) => {
//   const intervals = 1440;
//   const hours = Array.from({ length: intervals }, (_, i) => i / 60);
//   const mean = 12,
//     std = 4;
//   const weights = hours.map((h) => Math.exp(-0.5 * ((h - mean) / std) ** 2));
//   const sum = weights.reduce((a, b) => a + b, 0);
//   return weights.map((w) => Math.round((w / sum) * total));
// };

// // Haversine distance
// function haversineDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371;
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos((lat1 * Math.PI) / 180) *
//       Math.cos((lat2 * Math.PI) / 180) *
//       Math.sin(dLon / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

// // Cluster locations within a certain radius (km)
// function clusterLocations(locations, radiusKm = 0.15) {
//   const clusters = [];

//   locations.forEach((loc) => {
//     let added = false;

//     for (const cluster of clusters) {
//       const distance = haversineDistance(
//         loc.lat,
//         loc.lon,
//         cluster.center.lat,
//         cluster.center.lon
//       );
//       if (distance <= radiusKm) {
//         cluster.locations.push(loc);
//         cluster.center.lat =
//           (cluster.center.lat * (cluster.locations.length - 1) + loc.lat) /
//           cluster.locations.length;
//         cluster.center.lon =
//           (cluster.center.lon * (cluster.locations.length - 1) + loc.lon) /
//           cluster.locations.length;
//         cluster.visitors += loc.visitors;

//         // Update label if this location has more visitors
//         if (loc.visitors > cluster.topVisitorCount) {
//           cluster.topLocation = loc.location;
//           cluster.topVisitorCount = loc.visitors;
//         }

//         added = true;
//         break;
//       }
//     }

//     if (!added) {
//       clusters.push({
//         center: { lat: loc.lat, lon: loc.lon },
//         visitors: loc.visitors,
//         locations: [loc],
//         topLocation: loc.location,
//         topVisitorCount: loc.visitors,
//       });
//     }
//   });

//   return clusters;
// }

// // Simulate movement between clusters
// const simulateMovements = (clusters) => {
//   const movements = [];
//   const active = clusters.filter((c) => c.visitors > 0);

//   for (let i = 0; i < active.length; i++) {
//     const from = active[i];
//     if (from.visitors < 1) continue;

//     const nearby = active.filter((c) => {
//       const distance = haversineDistance(
//         from.center.lat,
//         from.center.lon,
//         c.center.lat,
//         c.center.lon
//       );
//       return c !== from && distance > 0 && distance < 0.8;
//     });

//     if (!nearby.length) continue;

//     const to = nearby[Math.floor(Math.random() * nearby.length)];
//     const maxTransfer = Math.min(from.visitors, 25);
//     const count = Math.floor(Math.random() * maxTransfer) + 1;

//     if (count <= 0 || from.visitors < count) continue;

//     from.visitors -= count;
//     to.visitors += count;

//     movements.push({
//       from: {
//         location: from.topLocation,
//         lat: from.center.lat,
//         lon: from.center.lon,
//       },
//       to: {
//         location: to.topLocation,
//         lat: to.center.lat,
//         lon: to.center.lon,
//       },
//       visitors: count,
//       timestamp: Date.now(),
//     });
//   }

//   return movements.sort((a, b) => b.visitors - a.visitors).slice(0, 30);
// };

// // Main simulation function
// async function storeSimulatedData() {
//   const now = new Date();
//   const currentTime = new Date();
//   currentTime.setSeconds(0, 0);
//   const timestamp = currentTime.toISOString();
//   const dataToStore = [];
//   let unmatchedCount = 0;

//   crowdData.publicData.areas.forEach((area) => {
//     const locationName = area.name;
//     const history = area.data || [];
//     const filtered = history.filter(Boolean);
//     if (!filtered.length) return;

//     const avgVisitors = Math.round(
//       filtered.reduce((sum, d) => sum + d.visitors, 0) / filtered.length
//     );

//     const boostedVisitors = Math.max(1000, avgVisitors * 20);
//     const distribution = generate1MinDistribution(boostedVisitors);

//     const coords = getPlaceCoordinates(locationName);
//     if (!coords) {
//       unmatchedCount++;
//       console.warn(`⚠️ Unmatched: ${locationName}`);
//       return;
//     }

//     const hour = currentTime.getHours();
//     const min = currentTime.getMinutes();
//     const index = hour * 60 + min;
//     const baseVisitors = distribution[index] || 0;
//     const fluctuation = Math.floor(Math.random() * 200);
//     const visitors = Math.max(50, baseVisitors + fluctuation);

//     dataToStore.push({
//       location: locationName,
//       lat: coords.lat,
//       lon: coords.lon,
//       timestamp,
//       visitors,
//     });
//   });
//   console.log(`📍 Matched locations: ${dataToStore.length}`);
//   console.log(`⚠️ Unmatched locations: ${unmatchedCount}`);

//   const clusters = clusterLocations(dataToStore);
//   const clusteredPoints = clusters.map((c) => ({
//     location: c.topLocation, // 👈 real name
//     lat: c.center.lat,
//     lon: c.center.lon,
//     visitors: c.visitors,
//     timestamp,
//   }));

//   const movement = simulateMovements(clusters);

//   await client.set(
//     `crowd:${timestamp}`,
//     JSON.stringify({ timestamp, data: clusteredPoints, movement }),
//     { EX: 60 * 30 }
//   );

//   console.log(
//     `🟢 [${timestamp}] Stored ${clusteredPoints.length} points + ${movement.length} movements`
//   );
// }

// module.exports = storeSimulatedData;

// crowdSimulator.js (merged with agent-based real-time simulation)
const fs = require("fs");
const levenshtein = require("fast-levenshtein");
const client = require("./redisClient");

const CrowdData = require("./models/CrowdData");
const MovementData = require("./models/MovementData");
const crowdData = require("./data/ariadne_export.json");
const placeData = require("./data/grid-places.json");

const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const getPlaceGeometry = (locationName) => {
  const normalizedTarget = normalize(locationName);
  let bestIndex = -1;
  let minDistance = Infinity;

  placeData.forEach((p, i) => {
    const normName = normalize(p.name);
    const dist = levenshtein.get(normalizedTarget, normName);
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
    }
  });

  if (bestIndex === -1) return null;

  const matched = placeData[bestIndex];
  const type = matched.geometry_type?.toLowerCase();
  let geometry = null;
  let centroid = null;

  if (type === "point") {
    const [lon, lat] = matched.coordinates || [];
    if (typeof lat === "number" && typeof lon === "number") {
      geometry = matched.coordinates;
      centroid = { lat, lon };
    }
  } else if (type === "polygon") {
    const coords = matched.coordinates?.[0];
    if (Array.isArray(coords) && coords.length >= 3) {
      geometry = coords;
      const [sumLon, sumLat] = coords.reduce(
        ([lonSum, latSum], [lon, lat]) => [lonSum + lon, latSum + lat],
        [0, 0]
      );
      centroid = { lon: sumLon / coords.length, lat: sumLat / coords.length };
    }
  } else if (type === "linestring") {
    const coords = matched.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      geometry = coords;
      const [sumLon, sumLat] = coords.reduce(
        ([lonSum, latSum], [lon, lat]) => [lonSum + lon, latSum + lat],
        [0, 0]
      );
      centroid = { lon: sumLon / coords.length, lat: sumLat / coords.length };
    }
  }

  return centroid
    ? {
      name: matched.name,
      centroid,
      geometry_type: type,
      geometry,
      properties: matched.properties || matched,
    }
    : null;
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const clusterLocations = (locations, radiusKm = 0.15) => {
  const clusters = [];
  locations.forEach((loc) => {
    let added = false;
    for (const cluster of clusters) {
      const distance = haversineDistance(
        loc.lat,
        loc.lon,
        cluster.center.lat,
        cluster.center.lon
      );
      if (distance <= radiusKm) {
        cluster.locations.push(loc);
        cluster.center.lat =
          (cluster.center.lat * (cluster.locations.length - 1) + loc.lat) /
          cluster.locations.length;
        cluster.center.lon =
          (cluster.center.lon * (cluster.locations.length - 1) + loc.lon) /
          cluster.locations.length;
        cluster.visitors += loc.visitors;
        if (loc.visitors > cluster.topVisitorCount) {
          cluster.topLocation = loc.location;
          cluster.topVisitorCount = loc.visitors;
        }
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push({
        center: { lat: loc.lat, lon: loc.lon },
        visitors: loc.visitors,
        locations: [loc],
        topLocation: loc.location,
        topVisitorCount: loc.visitors,
      });
    }
  });
  return clusters;
};

const simulateMovements = (currentClusters, prevSnapshot) => {
  if (!prevSnapshot || !prevSnapshot.data?.length) return [];
  const prevMap = new Map(prevSnapshot.data.map((d) => [d.location, d]));
  const movements = [];
  for (const curr of currentClusters) {
    const prev = [...prevMap.values()].find(
      (p) =>
        haversineDistance(p.lat, p.lon, curr.center.lat, curr.center.lon) < 0.05
    );
    if (!prev) continue;
    const diff = curr.visitors - prev.visitors;
    if (Math.abs(diff) < 1) continue;
    if (diff > 0) {
      const sources = currentClusters.filter(
        (c) => c !== curr && c.visitors > diff
      );
      if (!sources.length) continue;
      const from = sources[Math.floor(Math.random() * sources.length)];
      from.visitors -= diff;
      movements.push({
        from: {
          location: from.topLocation,
          lat: from.center.lat,
          lon: from.center.lon,
        },
        to: {
          location: curr.topLocation,
          lat: curr.center.lat,
          lon: curr.center.lon,
        },
        visitors: diff,
        timestamp: Date.now(),
      });
    } else {
      const destinations = currentClusters.filter((c) => c !== curr);
      if (!destinations.length) continue;
      const to = destinations[Math.floor(Math.random() * destinations.length)];
      to.visitors += -diff;
      movements.push({
        from: {
          location: curr.topLocation,
          lat: curr.center.lat,
          lon: curr.center.lon,
        },
        to: {
          location: to.topLocation,
          lat: to.center.lat,
          lon: to.center.lon,
        },
        visitors: -diff,
        timestamp: Date.now(),
      });
    }
  }
  return movements.slice(0, 30);
};

// ========== Main Real-Time Simulation Function ==========
async function storeSimulatedData(simulatedTime = new Date()) {
  const currentTime = new Date(simulatedTime);
  currentTime.setSeconds(0, 0);
  const timestamp = currentTime.toISOString();

  const prevRaw = await client.get("crowd:last");
  const prevSnapshot = prevRaw ? JSON.parse(prevRaw) : null;

  const dataToStore = [];
  const formatDate = (dateStr) => dateStr.slice(0, 10);
  const dayOfWeek = currentTime.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Precompute hourly fractions and average durations for each area
  const areaStats = {};

  for (const area of crowdData.publicData.areas) {
    // Aggregate subareas for visitors
    const subAreasVisitors = crowdData.publicData.areas.filter(a =>
      a.name === area.name || a.name.includes(area.name)
    );

    // Aggregate subareas for duration
    const subAreasDuration = crowdData.areaDurationsData.areas.filter(a =>
      a.name.includes(area.name)
    );

    if (!subAreasVisitors.length || !subAreasDuration.length) continue;

    const hourlyTotals = Array.from({ length: 24 }, () => []);
    const hourlyDurations = Array.from({ length: 24 }, () => []);

    // Loop through all historical days (all 3 months)
    for (const sub of subAreasVisitors) {
      if (!sub.data || !Array.isArray(sub.data)) continue;

      for (const rec of sub.data) {
        if (!rec.date) continue;

        const recDate = new Date(rec.date);
        const recDayOfWeek = recDate.getDay();
        const recIsWeekend = recDayOfWeek === 0 || recDayOfWeek === 6;
        if (recIsWeekend !== isWeekend) continue; // separate weekday/weekend patterns

        const visitors = rec.visitors || 0;

        // Find matching duration record safely
        let durationRec = null;
        for (const durSub of subAreasDuration) {
          if (!durSub.data || !Array.isArray(durSub.data)) continue;
          const match = durSub.data.find(dd => dd.date && dd.date.slice(0,10) === rec.date.slice(0,10));
          if (match) {
            durationRec = match;
            break;
          }
        }
        const avgDuration = durationRec && durationRec.avg_time ? durationRec.avg_time : 30; // fallback

        // Simple hourly distribution assumption: uniform if no finer data
        for (let h = 0; h < 24; h++) {
          const fraction = 1 / 24;
          hourlyTotals[h].push(visitors * fraction);
          hourlyDurations[h].push(avgDuration);
        }
      }
    }

    // Compute average per hour
    const avgHourlyVisitors = hourlyTotals.map(arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
    const avgHourlyDuration = hourlyDurations.map(arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 30);

    // Normalize to fractions for this area
    const sumHourly = avgHourlyVisitors.reduce((a,b)=>a+b,0) || 1;
    const hourlyFractions = avgHourlyVisitors.map(v => v / sumHourly);

    areaStats[area.name] = { hourlyFractions, avgHourlyDuration };
  }

  // Now simulate per-minute visitors for current timestamp
  for (const area of crowdData.publicData.areas) {
    const geometry = getPlaceGeometry(area.name);
    if (!geometry) continue;
    const stats = areaStats[area.name];
    if (!stats) continue;

    const { hourlyFractions, avgHourlyDuration } = stats;

    // Aggregate daily visitors from all subareas
    const matchingVisitorAreas = crowdData.publicData.areas.filter(a =>
      a.name === area.name || a.name.includes(area.name)
    );
    let dailyVisitors = 0;
    for (const ma of matchingVisitorAreas) {
      if (!ma.data || !Array.isArray(ma.data)) continue;
      const nearestRec = ma.data.reduce((prev, curr) => {
        const diffPrev = Math.abs(new Date(prev.date) - currentTime);
        const diffCurr = Math.abs(new Date(curr.date) - currentTime);
        return diffCurr < diffPrev ? curr : prev;
      });
      dailyVisitors += nearestRec.visitors || 0;
    }

    const totalMinutes = 24 * 60;
    const baseVisitors = new Array(totalMinutes).fill(0);

    // Distribute visitors per hour according to hourly fractions
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = hour * 60;
      const visitorsThisHour = Math.floor(dailyVisitors * hourlyFractions[hour]);
      const avgDurationMinutes = Math.max(1, Math.floor(avgHourlyDuration[hour]));

      for (let v = 0; v < visitorsThisHour; v++) {
        const startMinute = hourStart + Math.floor(Math.random() * 60);
        for (let m = 0; m < avgDurationMinutes; m++) {
          const idx = (startMinute + m) % totalMinutes;
          baseVisitors[idx] += 1;
        }
      }
    }

    // Apply weekend / after-office boosts and random noise
    const enhancedVisitors = baseVisitors.map((count, idx) => {
      const hour = Math.floor(idx / 60);
      const afterOfficeBoost = (hour >= 17 && hour <= 20) ? 1.1 : 1.0;
      const weekendBoost = isWeekend ? 1.15 : 1.0;
      const noise = Math.floor(Math.random() * 3);
      return Math.max(1, Math.floor(count * weekendBoost * afterOfficeBoost + noise));
    });

    const currentMinuteOfDay = currentTime.getHours() * 60 + currentTime.getMinutes();
    const visitorsThisMinute = enhancedVisitors[currentMinuteOfDay];

    dataToStore.push({
      location: geometry.name,
      lat: geometry.centroid.lat,
      lon: geometry.centroid.lon,
      timestamp,
      visitors: visitorsThisMinute,
      geometry: geometry.geometry,
      properties: geometry.properties,
    });
  }

  if (!dataToStore.length) {
    console.warn("No data to store. Check historical dataset.");
    return;
  }

  const clusters = clusterLocations(dataToStore);
  const movement = simulateMovements(clusters, prevSnapshot);

  await client.set(`crowd:${timestamp}`, JSON.stringify({ timestamp, data: dataToStore, movement }), { EX: 60 * 30 });
  await client.set("crowd:last", JSON.stringify({ data: dataToStore }), { EX: 60 * 60 });

  await CrowdData.insertMany(dataToStore.map(p => ({ ...p, timestamp: new Date(p.timestamp) })));
  await MovementData.insertMany(movement.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));

  console.log(`[${timestamp}] Stored ${dataToStore.length} points + ${movement.length} movements`);
  const top = [...dataToStore].sort((a, b) => b.visitors - a.visitors).slice(0, 3);
  console.log("🏙️ Top 3 locations:");
  top.forEach((loc, i) => console.log(`${i+1}. ${loc.location} — ${loc.visitors} visitors`));
}
module.exports = storeSimulatedData;
