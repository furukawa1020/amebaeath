const { buildSpatialHash, WORLD_SIZE } = require('../world')

function bench(N, queries = 1000) {
  const list = []
  for (let i = 0; i < N; i++) {
    list.push({ id: '' + i, position: { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE } })
  }
  const cellSize = WORLD_SIZE / 200
  const gridIndex = buildSpatialHash(list, cellSize, WORLD_SIZE)
  // force fallback quadtree by increasing threshold if supported
  const times = { grid: 0, quadtree: 0 }
  // measure queries
  const startGrid = Date.now()
  for (let i = 0; i < queries; i++) {
    const pos = { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE }
    gridIndex.query(pos, 50)
  }
  times.grid = Date.now() - startGrid

  // force quadtree by creating large list
  const q = buildSpatialHash(Array.from({length: N}, (_, i) => ({ id: 'q' + i, position: { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE } })), cellSize, WORLD_SIZE)
  const startQ = Date.now()
  for (let i = 0; i < queries; i++) {
    const pos = { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE }
    q.query(pos, 50)
  }
  times.quadtree = Date.now() - startQ

  console.log(`N=${N}, gridTime=${times.grid}ms, quadtreeTime=${times.quadtree}ms`)
}

const sizes = [50, 200, 500, 1000, 5000]
for (const s of sizes) bench(s)
