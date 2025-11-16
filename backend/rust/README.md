# Rust Simulation Service

This microservice runs the world simulation in Rust (actix-web). It provides simple REST endpoints used by the Node backend:

- GET /state : returns current world snapshot
- POST /spawn : spawn an organism
- POST /touch : record a touch (for future scheduling)

Usage (local):

1. Navigate into `backend/rust`
2. `cargo run` (requires Rust toolchain)

By default, the Node backend at `localhost:3001` will proxy to this service when `USE_RUST=true` and `RUST_URL` is set appropriately.
