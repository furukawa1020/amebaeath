Ameba Earth backend - runtime config & world maps

This file documents the runtime endpoints and utilities added to the backend.

Runtime config endpoints

- GET /config/world
  - Returns current runtime values (WORLD_SIZE, GRID_RESOLUTION).

- POST /config/world
  - Body: JSON object with any of: WORLD_SIZE, GRID_RESOLUTION, NEIGHBOR_RADIUS, FOOD_CONSUMPTION_RATE, FOOD_ENERGY_GAIN
  - Applies configuration at runtime (cell size recalculated). No auth in MVP.

Quadtree autotune

- POST /config/quadtree/autotune
  - Runs bench/auto-tune.js as a child process and writes recommended config to backend/config/quadtree.json.
  - Optional body overrides: { sizes: [20,50], queries: 20 }

World maps persistence

- POST /world/maps/save
  - Persists current world maps (temperature/food/density) to backend/config/world_maps.json

- POST /world/maps/load
  - Loads persisted maps and replaces current runtime maps if present.

Utilities in `backend/world.js`

- createWorldMaps(resolution)
- saveWorldMaps(path, maps)
- loadWorldMaps(path)
- applyRuntimeConfig(conf)

Notes

- These endpoints are admin-level; no authentication in MVP. Use with care in production.
- Config are basic and intended for local testing and tuning.

