# Ameba Earth

This workspace contains an MVP for 'Ameba Earth' — front-end in `frontend` (Next.js + p5.js), and a backend in `backend` (Node/Express + socket.io). An optional high-performance simulation microservice is in `backend/rust` (actix-web).

Quick start (local):

1. Backend
Or using Docker Compose (db + backend):

```powershell
docker compose up --build
```


```powershell
cd backend
npm install
npm start
# optional: run rust sim
cd backend/rust
cargo run
```

2. Frontend

```powershell
cd frontend
npm install
npm run dev
# open http://localhost:3000
```

Environment variables (local/prod):
- `NEXT_PUBLIC_BACKEND_URL` : Backend API endpoint (default http://localhost:3001)
- `NEXT_PUBLIC_WS_URL` : Websocket endpoint (default http://localhost:3001)
- `USE_RUST` (in backend): when true, Node will proxy and fetch world state from Rust sim at `RUST_URL`.

Deployment notes
---------------

Frontend (Netlify static export)
- In Netlify site settings set `NEXT_PUBLIC_BACKEND_URL` to your backend URL (Railway URL).
- Build command: `npm run build && npm run export` (run in `frontend` folder)
- Publish directory: `out`

Backend (Railway)
- Set environment variables in Railway: `DATABASE_URL`, `REDIS_URL` (optional), `ADMIN_TOKEN`, `PORT`.
- Start command: `npm start` (server uses `process.env.PORT || 3001`).

Local quick deploy
------------------
- `docker compose up --build` will bring up db, backend and frontend (see `docker-compose.yml`).

Admin UI
- Visit `/admin` on the frontend and supply `ADMIN_TOKEN` if the backend has one configured.

