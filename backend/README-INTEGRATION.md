# Integration: Java/Go sims with Node backend (local)

This file explains how to run the Java and Go simulators together with the Node backend using Docker Compose.

Prerequisites
- Docker Desktop running (Linux/Windows/Mac)
- Ports 3001, 4001, 5001 available

Quick run (from repo root):

PowerShell
```powershell
# build images and bring up services
docker compose build java-sidecar go-sim backend
docker compose up -d

# check health
Invoke-RestMethod 'http://localhost:4001/health'
Invoke-RestMethod 'http://localhost:5001/health'
Invoke-RestMethod 'http://localhost:3001/health'
```

Linux/macOS
```bash
docker compose build java-sidecar go-sim backend
docker compose up -d
curl http://localhost:4001/health
curl http://localhost:5001/health
curl http://localhost:3001/health
```

APIs
- Java sidecar
  - GET /state — world snapshot (organisms + maps)
  - POST /spawn — spawn organism (body: seedTraits)
  - POST /touch — create touch event
  - GET /metrics — runtime metrics (population, births, deaths)
  - GET /events — recent events
  - GET /config/world — read runtime tunables
  - POST /config/world — apply runtime tunables (JSON)

- Go sim (mirrors Java APIs)
  - GET /state
  - POST /spawn
  - POST /touch
  - GET /metrics
  - GET /events
  - GET/POST /config

Notes
- The Node backend is configured in `docker-compose.yml` to prefer the Java sidecar and Go sim when `USE_JAVA` / `USE_GO` flags are set. It will proxy `/state`, `/spawn`, and `/touch` accordingly.
- If you change code, rebuild images with `docker compose build <service>` and then `docker compose up -d` to restart with the new images.

Next steps
- Add Gradle wrapper to `backend/java-sidecar` for reproducible local builds without Docker.
- Add persistent configuration storage for runtime tunables (config files or DB).
- Expand event retention and metrics aggregation (Prometheus exporter).

---

Additional notes (added features)

- Runtime config persistence: both Java sidecar and Go sim persist runtime tunables to `config/world.json` by default. Override with the `WORLD_CONFIG_PATH` environment variable.
- Prometheus-compatible text metrics:
  - Java: `http://localhost:4001/metrics/prometheus`
  - Go:   `http://localhost:5001/metrics/prometheus`

Windows PowerShell quick commands:

```powershell
docker compose build java-sidecar go-sim backend --progress=plain
docker compose up -d
Invoke-RestMethod http://localhost:4001/health | ConvertTo-Json
Invoke-RestMethod http://localhost:5001/health | ConvertTo-Json
Invoke-RestMethod -UseBasicParsing http://localhost:4001/metrics/prometheus
Invoke-RestMethod -UseBasicParsing http://localhost:5001/metrics/prometheus
```
