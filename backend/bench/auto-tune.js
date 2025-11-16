const { spawnSync } = require('child_process')
const { buildSpatialHash, buildGridIndex, WORLD_SIZE } = require('../world')

function measure(N, queries = 2000) {
  const list = []
  for (let i = 0; i < N; i++) list.push({ id: '' + i, position: { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE } })
  const cellSize = WORLD_SIZE / 200
  const grid = buildGridIndex(list, cellSize, WORLD_SIZE)
  const t0 = Date.now()
  for (let i = 0; i < queries; i++) grid.query({ x: Math.random()*WORLD_SIZE, y: Math.random()*WORLD_SIZE }, 50)
  const gridTime = Date.now() - t0
  const q = buildSpatialHash(list, cellSize, WORLD_SIZE)
  const t1 = Date.now()
  for (let i = 0; i < queries; i++) q.query({ x: Math.random()*WORLD_SIZE, y: Math.random()*WORLD_SIZE }, 50)
  const quadTime = Date.now() - t1
  return { N, gridTime, quadTime }
}

async function autotune() {
  const envSizes = process.env.AUTOTUNE_SIZES
  const envQueries = process.env.AUTOTUNE_QUERIES
  const sizes = envSizes ? envSizes.split(',').map(s => Number(s.trim())) : [50, 200, 400, 800, 1600, 3200]
  const queries = envQueries ? parseInt(envQueries, 10) : 1000
  console.log('Auto tuning quadtree... running microbench')
  const results = []
  for (const s of sizes) {
    const r = measure(s, queries)
    console.log(`N=${s} grid=${r.gridTime}ms quad=${r.quadTime}ms`)
    results.push(r)
  }
  // find first size where quad faster
  const better = results.find(r => r.quadTime < r.gridTime)
  if (better) {
    const rec = Math.max(1, better.N - 20)
    console.log(`Recommend QUADTREE_THRESHOLD <= ${rec}`)
    // persist recommendation to config file
    const conf = { threshold: rec, maxObjects: parseInt(process.env.QUADTREE_MAX_OBJECTS || '8'), maxLevel: parseInt(process.env.QUADTREE_MAX_LEVEL || '6') }
    const p = require('path').join(__dirname, '..', 'config', 'quadtree.json')
    require('fs').writeFileSync(p, JSON.stringify(conf, null, 2), 'utf8')
    console.log('Written recommended config to', p)
  } else {
    console.log('Quadtree not advantageous for these sizes; recommend higher threshold')
  }
}

autotune()
