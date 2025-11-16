Quadtree and Grid benchmark

Run this from the `backend` folder to measure grid vs quadtree spatial query times:

```powershell
cd backend
npm run bench
```

It prints timings for several population sizes. Use environment variables to tune the Quadtree:
Note: `npm run autotune` will run a short microbenchmark and write a recommended threshold to `backend/config/quadtree.json`.

```powershell
$env:QUADTREE_THRESHOLD=300; npm run bench
$env:QUADTREE_MAX_OBJECTS=12; npm run bench
```
