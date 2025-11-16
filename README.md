# Ameba Earth

This workspace contains an MVP for 'Ameba Earth' — front-end in `frontend` (Next.js + p5.js), and a backend in `backend` (Node/Express + socket.io). An optional high-performance simulation microservice is in `backend/rust` (actix-web).

Quick start (local):

1. Backend

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
