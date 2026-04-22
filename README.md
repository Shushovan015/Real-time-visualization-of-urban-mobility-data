# Urban Crowding Visualization for Tourists

An interactive map-based system that helps tourists avoid crowded areas by visualizing live crowd intensity, movement, and short-term recommendations.

## Problem It Solves

Tourists in popular cities often face two problems:
- They do not know which areas are currently crowded.
- They cannot easily decide where to go next based on live conditions.

This project solves that by combining simulated/live crowd data, historical trends, and map visualization so users can:
- See current crowd conditions by place.
- Inspect movement and trend patterns.
- Get "now-next" place suggestions nearby.

## Screenshots

Add project screenshots in `docs/screenshots/` and keep these file names:
- `home-map.png`
- `crowd-layer.png`
- `recommendations-panel.png`

![Home Map](docs/screenshots/home-map.png)
![Crowd Layer](docs/screenshots/crowd-layer.png)
![Recommendations Panel](docs/screenshots/recommendations-panel.png)

## Tech Stack

Frontend:
- React 19 + Vite
- OpenLayers (`ol`) for interactive geospatial map rendering
- Redux + Redux-Saga for state and async data orchestration
- Tailwind CSS + custom CSS
- Axios for API communication

Backend:
- Node.js + Express
- MongoDB (persistent crowd and movement history)
- Redis (short-lived live snapshots for fast reads)
- Mongoose ODM

Data and Enrichment:
- Historical Ariadne export data as baseline input
- Popularity enrichment pipeline using Google Places, Wikipedia pageviews, and OpenTripMap

DevOps:
- Docker + Docker Compose for local full-stack environment

## Architecture Overview

```text
Frontend (React + OpenLayers)
        |
        v
Backend API (Express)
  |                     |
  v                     v
Redis (live window)   MongoDB (historical records)
        ^
        |
Crowd simulator + popularity pipeline
```

Main runtime flow:
1. Backend simulator generates per-minute crowd snapshots.
2. Latest snapshots are cached in Redis for quick map updates.
3. Snapshots and movement events are persisted in MongoDB.
4. Frontend polls APIs and renders crowd layers, trends, and recommendations.

## Architecture Decisions

1. Redis + MongoDB split
- Decision: Use Redis for recent/live data and MongoDB for historical data.
- Why: Live map requests need low-latency reads, while analytics and history need durable storage.
- Tradeoff: Two datastores add operational complexity.

2. Polling-based frontend updates
- Decision: Poll live endpoints (instead of websockets).
- Why: Simpler implementation and sufficient for 1-minute simulation cadence.
- Tradeoff: Not true push real-time; updates are interval-based.

3. OpenLayers for map rendering
- Decision: Use OpenLayers as the map engine.
- Why: Strong support for vector overlays, layered controls, and custom styling for crowd visualization.
- Tradeoff: Slightly steeper learning curve than lightweight map libraries.

4. Redux + Saga for async orchestration
- Decision: Centralized state with saga-managed side effects.
- Why: Predictable flow for multiple parallel datasets (live, past, hourly, recommendations, places).
- Tradeoff: More boilerplate than local component state.

5. Hybrid recommendation scoring
- Decision: Rank nearby places using popularity, pressure (density/capacity), and short trend signals.
- Why: Improves recommendation quality beyond raw visitor count.
- Tradeoff: Heuristic weighting requires tuning.

## Project Structure

```text
.
|- Backend/
|  |- index.js
|  |- crowdSimulator.js
|  |- cron/nightlyPopularity.js
|  |- popularity/
|  |- models/
|  `- data/
|- Frontend/
|  |- src/components/Mapview/
|  |- src/sagas/
|  |- src/services/
|  `- src/store.js
|- docker-compose.yml
`- README.md
```

## Setup and Run

### Option A: Docker Compose (recommended)

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- MongoDB + Redis are started as internal services

### Option B: Local Development

Backend:
```bash
cd Backend
cp .env.example .env
npm install
npm run dev
```

Frontend:
```bash
cd Frontend
cp .env.example .env
npm install
npm run dev
```

## Environment Variables

Backend (`Backend/.env.example`):
- `PORT`
- `MONGO_URL`
- `REDIS_URL`
- `GOOGLE_PLACES_KEY`
- `OPENTRIPMAP_KEY`
- `TZ`
- `CITY_NAME`
- `WIKI_LANG`
- `WIKI_RADIUS`

Frontend (`Frontend/.env.example`):
- `VITE_API_TOKEN`
- `VITE_API_URL`
- `VITE_API_BASE_URL`
- `VITE_BACKEND_PROXY_TARGET`

## Notes

- The popularity build script is available as `npm run popularity:build` in `Backend`.
- The current system simulates minute-level crowd updates and stores both snapshot and movement data.
