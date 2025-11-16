const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { updateOrganism, simulateWorldStep } = require('./world')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

// In-memory store (MVP). For production, move to PostgreSQL/Redis.
const DATA_PATH = path.join(__dirname, 'initial_organisms.json')
let organisms = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
let tick = 0
const TOUCH_EVENTS = []
let contactMap = {}

// Simple spawn rate-limit per IP (in-memory, reset on restart). Production: persist and use Redis.
const spawnCounts = {}

// REST: GET /state
app.get('/state', (req, res) => {
  res.json({ tick, organisms: organisms.map(o => ({ id: o.id, position: o.position, size: o.size, energy: o.energy, state: o.state, dna_layers: o.dna_layers })) })
})

// REST: POST /spawn
app.post('/spawn', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
  const today = new Date().toISOString().slice(0,10)
  spawnCounts[ip] = spawnCounts[ip] || {}
  spawnCounts[ip][today] = spawnCounts[ip][today] || 0
  if (spawnCounts[ip][today] >= 1) return res.status(429).json({ error: 'spawn limit reached for today' })

  const seedTraits = req.body.seedTraits || null
  const newOrg = createOrganism(seedTraits)
  organisms.push(newOrg)
  spawnCounts[ip][today] += 1
  io.emit('spawn', { organism: newOrg })
  res.status(201).json({ organism: newOrg })
})

// REST: POST /touch
app.post('/touch', (req, res) => {
  const { x, y, amplitude = 0.6, sigma = 30 } = req.body
  if (typeof x !== 'number' || typeof y !== 'number') return res.status(400).json({ error: 'x,y required' })
  const touch = { id: uuidv4(), x, y, amplitude, sigma, createdAt: Date.now() }
  TOUCH_EVENTS.push(touch)
  io.emit('touch', touch)
  res.json({ ok: true, touch })
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

// World loop: simple, tick every 1s and inner simulation steps
setInterval(() => {
  const dt = 1.0
  tick += 1
  // perform several small steps to smooth
  for (let i=0;i<4;i++) {
    const res = simulateWorldStep(organisms, TOUCH_EVENTS, 0.25, contactMap)
    if (res && res.contactMap) contactMap = res.contactMap
    if (res && res.events && res.events.length) {
      res.events.forEach(e => io.emit(e.type, e))
    }
  }
  // broadcast minimal diff (for MVP we broadcast full small set)
  const updates = organisms.map(o => ({ id: o.id, position: o.position, velocity: o.velocity, energy: o.energy, state: o.state, size: o.size }))
  io.emit('tick', { tick, updates })
  // cleanup old touch events
  const now = Date.now()
  while (TOUCH_EVENTS.length && now - TOUCH_EVENTS[0].createdAt > 1000*60*10) TOUCH_EVENTS.shift()
}, 1000)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Ameba Earth backend listening on ${PORT}`)
})
