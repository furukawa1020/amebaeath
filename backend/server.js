const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { updateOrganism, simulateWorldStep } = require('./world')
const fetch = require('node-fetch')

const app = express()
const morgan = require('morgan')
// limit CORS to frontend host if provided, otherwise allow all for dev
const FRONTEND_HOST = process.env.FRONTEND_HOST
if (FRONTEND_HOST) app.use(cors({ origin: FRONTEND_HOST }))
else app.use(cors())
app.use(express.json())
app.use(morgan('tiny'))

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

// In-memory store (MVP). For production, move to PostgreSQL/Redis.
const DATA_PATH = path.join(__dirname, 'initial_organisms.json')
let organisms = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
let tick = 0
const TOUCH_EVENTS = []
let contactMap = {}
// world maps (temperature/food/density) - used for climate and visualization
function makeEmptyGrid(res) {
  const grid = []
  for (let y = 0; y < res; y++) grid.push(Array.from({length: res}, () => 0))
  return grid
}
const GRID_RESOLUTION = 200
const worldMaps = {
  temperatureMap: makeEmptyGrid(GRID_RESOLUTION),
  foodMap: makeEmptyGrid(GRID_RESOLUTION),
  densityMap: makeEmptyGrid(GRID_RESOLUTION)
}

const RUST_URL = process.env.RUST_URL || 'http://localhost:4001'
const USE_RUST = process.env.USE_RUST === 'true'
const { Pool } = require('pg')
const DATABASE_URL = process.env.DATABASE_URL
let dbPool = null
if (DATABASE_URL) dbPool = new Pool({ connectionString: DATABASE_URL })
// optional redis for distributed/cluster spawn counting and pub/sub
let redisClient = null
const REDIS_URL = process.env.REDIS_URL
if (REDIS_URL) {
  try {
    const { createClient } = require('redis')
    redisClient = createClient({ url: REDIS_URL })
    redisClient.connect().catch((err) => { console.warn('redis connect failed', err); redisClient = null })
  } catch (err) {
    console.warn('redis init failed', err)
    redisClient = null
  }
}
const { saveQuadtreeConfig, reloadQuadtreeConfig } = require('./world')
const { execFile } = require('child_process')

// Simple spawn rate-limit per IP (in-memory, reset on restart). Production: persist and use Redis.
const spawnCounts = {}
const touchCounts = {}

// REST: GET /state
app.get('/state', async (req, res) => {
  if (USE_RUST) {
    try {
      const r = await fetch(`${RUST_URL}/state`)
      const json = await r.json()
      return res.json(json)
    } catch (err) {
      console.error('Failed to fetch rust state', err)
    }
  }
  res.json({ tick, organisms: organisms.map(o => ({ id: o.id, position: o.position, size: o.size, energy: o.energy, state: o.state, dna_layers: o.dna_layers })) })
})

// lightweight stats endpoint for dashboards
app.get('/stats', (req, res) => {
  const total = organisms.length
  const avgEnergy = total ? organisms.reduce((s,o) => s + (o.energy||0), 0) / total : 0
  const avgSize = total ? organisms.reduce((s,o) => s + (o.size||0), 0) / total : 0
  const largest = organisms.slice().sort((a,b)=>b.size-a.size).slice(0,5).map(o => ({ id: o.id, size: o.size }))
  res.json({ tick, total, avgEnergy, avgSize, largest })
})

// lightweight health endpoint exposing DB/Redis status
app.get('/health', (req, res) => {
  const db = !!dbPool
  const redis = !!redisClient
  res.json({ ok: true, db, redis, tick })
})

// Admin: get/update quadtree config (no auth in MVP)
app.get('/config/quadtree', (req, res) => {
  try {
    const p = path.join(__dirname, 'config', 'quadtree.json')
    if (!fs.existsSync(p)) return res.status(404).json({ error: 'not found' })
    const c = JSON.parse(fs.readFileSync(p, 'utf8'))
    return res.json(c)
  } catch (e) { return res.status(500).json({ error: 'read failed' }) }
})

app.post('/config/quadtree', (req, res) => {
  const { threshold, maxObjects, maxLevel } = req.body
  try {
    saveQuadtreeConfig({ threshold, maxObjects, maxLevel })
    reloadQuadtreeConfig()
    return res.json({ ok: true })
  } catch (e) { return res.status(500).json({ error: e.toString() }) }
})

// Admin endpoint: run autotune (writes recommended config to config/quadtree.json)
app.post('/config/quadtree/autotune', (req, res) => {
  // This endpoint executes the bench script as a child process and returns the result.
  const script = path.join(__dirname, 'bench', 'auto-tune.js')
  // allow optional overrides via body for sizes and queries to make the endpoint testable
  const sizes = req.body && req.body.sizes ? req.body.sizes.join(',') : undefined
  const queries = req.body && req.body.queries ? String(req.body.queries) : undefined

  const env = Object.assign({}, process.env)
  if (sizes) env.AUTOTUNE_SIZES = sizes
  if (queries) env.AUTOTUNE_QUERIES = queries
  execFile(process.execPath, [script], { env, cwd: path.join(__dirname, '.') }, (err, stdout, stderr) => {
    if (err) {
      console.error('autotune failed', err, stderr)
      return res.status(500).json({ error: 'autotune failed', reason: err.message })
    }
    // read recommended file
    const p = path.join(__dirname, 'config', 'quadtree.json')
    try {
      const conf = JSON.parse(fs.readFileSync(p, 'utf8'))
      // reload into runtime
      reloadQuadtreeConfig()
      return res.json({ ok: true, recommended: conf, output: stdout })
    } catch (e) {
      return res.status(500).json({ error: 'no-config-written', reason: e.message, output: stdout })
    }
  })
})

// REST: POST /spawn
app.post('/spawn', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown')
  console.log('POST /spawn ip', ip, 'DB?', !!dbPool)
  const today = new Date().toISOString().slice(0,10)
  try {
    // Use Redis if available for distributed counters
    if (redisClient) {
      try {
        const key = `spawn:${ip}:${today}`
        const count = await redisClient.incr(key)
        if (Number(count) === 1) {
          // set expiry until midnight
          const now = new Date()
          const ttl = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()+1) - now) / 1000)
          await redisClient.expire(key, ttl)
        }
        if (Number(count) > 1) return res.status(429).json({ error: 'spawn limit reached for today (redis)' })
      } catch (err) {
        console.warn('redis error on spawn, falling back', err)
        // disable redis for future tries to avoid repeated timeouts
        try { if (redisClient) redisClient.disconnect() } catch(e){}
        redisClient = null
      }
    }
    // Try DB-backed daily spawn counter first (atomic upsert)
    if (dbPool) {
      const sql = `INSERT INTO spawn_counts (ip, day, count) VALUES ($1, $2, 1)
        ON CONFLICT (ip, day) DO UPDATE SET count = spawn_counts.count + 1
        RETURNING count`;
      try {
        const result = await dbPool.query(sql, [ip, today])
        if (result && result.rows && result.rows[0] && result.rows[0].count > 1) {
          return res.status(429).json({ error: 'spawn limit reached for today (db)' })
        }
      } catch (dbErr) {
        // Database may not be available in test env; fallback to in-memory
        console.warn('db spawn upsert failed; using in-memory fallback', dbErr && dbErr.message)
        spawnCounts[ip] = spawnCounts[ip] || {}
        spawnCounts[ip][today] = spawnCounts[ip][today] || 0
        if (spawnCounts[ip][today] >= 1) return res.status(429).json({ error: 'spawn limit reached for today' })
        spawnCounts[ip][today] += 1
      }
    } else {
      // No DB: use in-memory per-ip/day counter (reset on restart)
      spawnCounts[ip] = spawnCounts[ip] || {}
      spawnCounts[ip][today] = spawnCounts[ip][today] || 0
      if (spawnCounts[ip][today] >= 1) return res.status(429).json({ error: 'spawn limit reached for today' })
      spawnCounts[ip][today] += 1
    }

    // Make or proxy a spawn
    const seedTraits = req.body && req.body.seedTraits ? req.body.seedTraits : null
    if (USE_RUST) {
      const resp = await fetch(`${RUST_URL}/spawn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seedTraits }) })
      const parsed = await resp.json()
      const newOrg = parsed.organism || parsed
      io.emit('spawn', { organism: newOrg })
      return res.status(201).json({ organism: newOrg })
    }

    // Local spawn (Node simulation)
    const newOrg = createOrganism(seedTraits)
    organisms.push(newOrg)
    if (dbPool) {
      try {
        await dbPool.query('INSERT INTO organisms (id, data, created_at, updated_at) VALUES ($1,$2,now(),now())', [newOrg.id, JSON.stringify(newOrg)])
      } catch (err) { console.warn('db spawn insert failed', err && err.message) }
    }
    io.emit('spawn', { organism: newOrg })
    return res.status(201).json({ organism: newOrg })
  } catch (err) {
    console.error('spawn proxy error', err)
    return res.status(500).json({ error: 'backend spawn failed' })
  }
})

// REST: POST /touch
app.post('/touch', (req, res) => {
  const { x, y, amplitude = 0.6, sigma = 30 } = req.body
  if (typeof x !== 'number' || typeof y !== 'number') return res.status(400).json({ error: 'x,y required' })
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
  const tnow = Date.now()
  touchCounts[ip] = touchCounts[ip] || []
  touchCounts[ip] = touchCounts[ip].filter(ts => tnow - ts < 60000)
  if (touchCounts[ip].length > 60) return res.status(429).json({ error: 'touch rate limit exceeded' })
  touchCounts[ip].push(tnow)
  (async () => {
    try {
      if (USE_RUST) {
        const resp = await fetch(`${RUST_URL}/touch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x, y, amplitude, sigma }) })
        const parsed = await resp.json()
  const touch = parsed.touch || parsed
  TOUCH_EVENTS.push(touch)
  io.emit('touch', touch)
  if (dbPool) { try { await dbPool.query('INSERT INTO touches (id,x,y,amplitude,sigma,created_at) VALUES ($1,$2,$3,$4,$5,now())', [touch.id, touch.x, touch.y, touch.amplitude, touch.sigma]) } catch (err) { console.error('db touch err', err) } }
  return res.json({ ok: true, touch })
      } else {
  const touch = { id: uuidv4(), x, y, amplitude, sigma, createdAt: Date.now() }
  TOUCH_EVENTS.push(touch)
  io.emit('touch', touch)
  if (dbPool) { try { await dbPool.query('INSERT INTO touches (id,x,y,amplitude,sigma,created_at) VALUES ($1,$2,$3,$4,$5,now())', [touch.id, touch.x, touch.y, touch.amplitude, touch.sigma]) } catch (err) { console.error('db touch err', err) } }
  return res.json({ ok: true, touch })
      }
    } catch (err) {
      console.error('touch proxy error', err)
      return res.status(500).json({ error: 'backend touch failed' })
    }
  })()
})

function createOrganism(seedTraits) {
  const id = uuidv4()
  const pos = { x: Math.random() * 2000, y: Math.random() * 2000 }
  const metaballs = [ [0,0,16 + Math.random()*8], [8,5,10 + Math.random()*6], [-7,6,8+Math.random()*5] ]
  const color = randomColor()
  const traits = seedTraits || {
    cohesion: parseFloat((0.3 + Math.random()*0.5).toFixed(2)),
    escape: parseFloat((0.15 + Math.random()*0.6).toFixed(2)),
    predation: parseFloat((0.1 + Math.random()*0.5).toFixed(2)),
    warmth_preference: parseFloat((0.2 + Math.random()*0.8).toFixed(2))
  }
  return {
    id,
    position: pos,
    velocity: { vx: (Math.random()-0.5)*0.4, vy: (Math.random()-0.5)*0.4 },
    size: 0.8 + Math.random()*0.7,
    metaballs,
    traits,
    dna_layers: [color],
    energy: 0.7 + Math.random()*0.3,
    state: 'normal',
    age: 0,
    spawnedAt: Date.now(),
    lastUpdated: Date.now()
    ,expiresAt: Date.now() + (24*3600*1000) + Math.random() * 24*3600*1000 // 24-48h
  }
}

function randomColor() {
  const palette = ['#88c1ff','#ffccaa','#b8f4a6','#f4b6c2','#ffeeaa','#c8a2ff','#ffd1dc','#aaffc3','#ffe4b5','#ffd27f']
  return palette[Math.floor(Math.random()*palette.length)]
}

// socket.io connections
io.on('connection', (socket) => {
  console.log('client connected', socket.id)
  // send init snapshot (lightweight)
  socket.emit('init', { tick, organisms: organisms.map(o => ({ id: o.id, position: o.position, size: o.size, energy: o.energy, state: o.state, dna_layers: o.dna_layers })) })
  socket.on('requestSpawn', (data) => {
    // basic cloak: redirect to REST endpoint recommended
    const newOrg = createOrganism(data && data.seedTraits)
    organisms.push(newOrg)
    io.emit('spawn', { organism: newOrg })
  })
})

// World loop: fetch authoritative state from Rust simulation and broadcast
let tickInterval = null
function startWorldLoop() {
  if (tickInterval) return
  tickInterval = setInterval(async () => {
  tick += 1
  try {
    if (USE_RUST) {
      const resp = await fetch(`${RUST_URL}/state`)
      const parsed = await resp.json()
      const updates = (parsed.organisms || []).map(o => ({ id: o.id, position: o.position, velocity: o.velocity, energy: o.energy, state: o.state, size: o.size }))
      organisms = (parsed.organisms || []).map(o => ({ ...o }))
  // include maps if available
  const maps = parsed.maps || parsed.worldMaps || null
  io.emit('tick', { tick, updates, maps })
  } else {
      // run local simulation steps
      for (let i = 0; i < 4; i++) {
  const res = simulateWorldStep(organisms, TOUCH_EVENTS, 0.25, contactMap, worldMaps)
        if (res && res.events && res.events.length) {
          for (const e of res.events) {
            io.emit(e.type, e)
            // persist predation and evolve to DB if available
            if (dbPool && e.type === 'predation') {
              try {
                await dbPool.query('DELETE FROM organisms WHERE id = $1', [e.victimId])
                await dbPool.query('UPDATE organisms SET data = $1, updated_at = now() WHERE id = $2', [ JSON.stringify(organisms.find(o=>o.id===e.predatorId) || {}), e.predatorId ])
              } catch (err) { console.error('db predation persist error', err) }
            }
            if (dbPool && e.type === 'evolve') {
              try {
                await dbPool.query('UPDATE organisms SET data = $1, updated_at = now() WHERE id = $2', [ JSON.stringify(organisms.find(o=>o.id===e.id) || {}), e.id ])
              } catch (err) { console.error('db evolve persist error', err) }
            }
              if (dbPool && e.type === 'expired') {
                try {
                  await dbPool.query('DELETE FROM organisms WHERE id = $1', [e.id])
                } catch (err) { console.error('db expire persist error', err) }
              }
          }
        }
      }
      const updates = organisms.map(o => ({ id: o.id, position: o.position, velocity: o.velocity, energy: o.energy, state: o.state, size: o.size }))
      io.emit('tick', { tick, updates, maps: worldMaps })
    }
  } catch (e) {
    console.error('tick loop error', e && e.stack ? e.stack : e.toString())
  }
  }, 1000)
}

function stopWorldLoop() {
  if (!tickInterval) return
  clearInterval(tickInterval)
  tickInterval = null
}

// persist to DB every minute
let persistInterval = null
function startPersistLoop() {
  if (persistInterval) return
  persistInterval = setInterval(async () => {
  if (!dbPool) return
  try {
  await dbPool.query('INSERT INTO world_state (tick, temperature_map, food_map, density_map, last_tick_at) VALUES ($1,$2,$3,$4,NOW())', [tick, JSON.stringify(worldMaps.temperatureMap), JSON.stringify(worldMaps.foodMap), JSON.stringify(worldMaps.densityMap)])
  } catch (e) {
    console.error('persist error', e)
  }
  }, 60 * 1000)
}

function stopPersistLoop() {
  if (!persistInterval) return
  clearInterval(persistInterval)
  persistInterval = null
}

const PORT = process.env.PORT || 3001
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Ameba Earth backend listening on ${PORT}`)
  })
  // start loops only for real server runs
  startWorldLoop()
  startPersistLoop()
}

// export app for unit testing
// export app and loop control to allow tests to configure environment
module.exports = { app, startWorldLoop, stopWorldLoop, startPersistLoop, stopPersistLoop, redisClient };
