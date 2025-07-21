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

const fs = require("fs");
const levenshtein = require("fast-levenshtein");
const client = require("./redisClient");

const CrowdData = require("./models/CrowdData");
const MovementData = require("./models/MovementData");
const crowdData = require("./data/ariadne_export.json");
const placeData = require("./data/grid-places.json");

// Match location names to coordinates
const getPlaceCoordinates = (locationName) => {
  const placeNames = placeData.map((p) => p.place.split(",")[0].trim());
  let bestMatch = null;
  let minDistance = Infinity;

  for (const name of placeNames) {
    const dist = levenshtein.get(locationName, name);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = name;
    }
  }

  if (minDistance > 15) return null;

  const matched = placeData.find((p) =>
    p.place.toLowerCase().includes(bestMatch.toLowerCase())
  );
  return matched ? { lat: matched.lat, lon: matched.lon } : null;
};

// Gaussian visitor distribution
const generate1MinDistribution = (total) => {
  const intervals = 1440;
  const hours = Array.from({ length: intervals }, (_, i) => i / 60);
  const mean = 12,
    std = 4;
  const weights = hours.map((h) => Math.exp(-0.5 * ((h - mean) / std) ** 2));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((w / sum) * total));
};

// Haversine distance
function haversineDistance(lat1, lon1, lat2, lon2) {
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
}

// Cluster locations within a radius
function clusterLocations(locations, radiusKm = 0.15) {
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
}

// Simulate movement based on visitor change
function simulateMovements(currentClusters, prevSnapshot) {
  if (!prevSnapshot || !prevSnapshot.data?.length) {
    console.warn("⚠️ No previous snapshot loaded.");
    return [];
  }

  const prevMap = new Map(prevSnapshot.data.map((d) => [d.location, d]));
  const movements = [];

  console.log("▶ Current cluster count:", currentClusters.length);

  for (const curr of currentClusters) {
    const prev = [...prevMap.values()].find(
      (p) =>
        haversineDistance(p.lat, p.lon, curr.center.lat, curr.center.lon) < 0.05
    );

    if (!prev) {
      console.log(`❌ No matching previous cluster for: ${curr.topLocation}`);
      continue;
    }

    const diff = curr.visitors - prev.visitors;
    console.log(
      `[🔍 DIFF] ${curr.topLocation}: now=${curr.visitors}, prev=${prev.visitors}, diff=${diff}`
    );

    if (Math.abs(diff) < 1) {
      console.log(`⏭️ Skipping ${curr.topLocation} — no significant change`);
      continue;
    }

    if (diff > 0) {
      const sources = currentClusters.filter(
        (c) => c !== curr && c.visitors > diff
      );
      if (!sources.length) {
        console.log(`⚠️ No valid sources for ${curr.topLocation}`);
        continue;
      }
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

  console.log(`✅ Simulated ${movements.length} movement(s).`);
  return movements.slice(0, 30);
}

// Main function
async function storeSimulatedData() {
  const now = new Date();
  const currentTime = new Date();
  currentTime.setSeconds(0, 0);
  const timestamp = currentTime.toISOString();
  const dataToStore = [];
  let unmatchedCount = 0;

  const prevRaw = await client.get("crowd:last");
  const prevSnapshot = prevRaw ? JSON.parse(prevRaw) : null;

  crowdData.publicData.areas.forEach((area) => {
    const locationName = area.name;
    const history = area.data || [];
    const filtered = history.filter(Boolean);
    if (!filtered.length) return;

    const avgVisitors = Math.round(
      filtered.reduce((sum, d) => sum + d.visitors, 0) / filtered.length
    );

    const boostedVisitors = Math.max(1000, avgVisitors * 20);
    const distribution = generate1MinDistribution(boostedVisitors);

    const coords = getPlaceCoordinates(locationName);
    if (!coords) {
      unmatchedCount++;
      console.warn(`⚠️ Unmatched: ${locationName}`);
      return;
    }

    const hour = currentTime.getHours();
    const min = currentTime.getMinutes();
    const index = hour * 60 + min;
    const baseVisitors = distribution[index] || 0;
    const fluctuation = Math.floor(Math.random() * 200);
    const visitors = Math.max(50, baseVisitors + fluctuation);

    dataToStore.push({
      location: locationName,
      lat: coords.lat,
      lon: coords.lon,
      timestamp,
      visitors,
    });
  });

  console.log(`📍 Matched locations: ${dataToStore.length}`);
  console.log(`⚠️ Unmatched locations: ${unmatchedCount}`);

  const clusters = clusterLocations(dataToStore);
  const clusteredPoints = clusters.map((c) => ({
    location: c.topLocation,
    lat: c.center.lat,
    lon: c.center.lon,
    visitors: c.visitors,
    timestamp,
  }));

  const movement = simulateMovements(clusters, prevSnapshot);

  await client.set(
    `crowd:${timestamp}`,
    JSON.stringify({ timestamp, data: clusteredPoints, movement }),
    { EX: 60 * 30 }
  );

  await client.set("crowd:last", JSON.stringify({ data: clusteredPoints }), {
    EX: 60 * 60,
  });

  await CrowdData.insertMany(
    clusteredPoints.map((p) => ({
      ...p,
      timestamp: new Date(p.timestamp),
    }))
  );

  await MovementData.insertMany(
    movement.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }))
  );

  console.log(
    `🟢 [${timestamp}] Stored ${clusteredPoints.length} points + ${movement.length} movements`
  );
}

module.exports = storeSimulatedData;
