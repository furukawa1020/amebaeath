// world.js
// Lightweight world simulation utilities for MVP.

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

const ENERGY_DECAY_PER_SEC = 0.01
const MAX_SPEED = 2.0
const PREDATION_CONTACT_TIME = 1.0 // seconds
const HITBOX_SCALE = 8 // world scale factor for distance vs size
const NEIGHBOR_RADIUS = 100
const COHESION_FACTOR = 0.08
const ESCAPE_FACTOR = 0.18
const WORLD_SIZE = 2000
const GRID_RESOLUTION = 200
const CELL_SIZE = WORLD_SIZE / GRID_RESOLUTION
const TEMPERATURE_DECAY = 0.01 // per step
const FOOD_DECAY = 0.001
const FOOD_CONSUMPTION_RATE = 0.02 // how much food removed per second when feeding
const FOOD_ENERGY_GAIN = 0.06
const MIN_SURVIVAL_ENERGY = 0.02
const MIN_SIZE = 0.15

function updateOrganism(org, dt, world) {
  // Energy decay
  org.energy = clamp(org.energy - ENERGY_DECAY_PER_SEC * dt, 0, 1)
  if (org.energy < 0.1) {
    org.state = 'sleep'
  } else if (org.energy < 0.35) {
    org.state = 'low_energy'
  } else {
    org.state = 'normal'
  }

  // simple random wandering + basic cohesion
  const noiseX = (Math.random()-0.5) * 0.04
  const noiseY = (Math.random()-0.5) * 0.04
  org.velocity.vx += noiseX
  org.velocity.vy += noiseY

  // limit speed
  const speed = Math.hypot(org.velocity.vx, org.velocity.vy)
  if (speed > MAX_SPEED) {
    org.velocity.vx = (org.velocity.vx / speed) * MAX_SPEED
    org.velocity.vy = (org.velocity.vy / speed) * MAX_SPEED
  }

  // apply velocity
  org.position.x += org.velocity.vx * dt * 10
  org.position.y += org.velocity.vy * dt * 10

  // wrap around world edges (simple)
  const W = 2000
  if (org.position.x < 0) org.position.x += W
  if (org.position.x > W) org.position.x -= W
  if (org.position.y < 0) org.position.y += W
  if (org.position.y > W) org.position.y -= W

  org.lastUpdated = Date.now()
}

function simulateWorldStep(organisms, touchEvents, dt, contactMap = {}, worldMaps = null) {
  // For MVP: apply very light temperature attraction: organisms drift toward recent touches
  const heat = touchEvents.length ? touchEvents[touchEvents.length-1] : null
  // contact times for predation: map keys 'predatorId:victimId'
  const contactTimes = contactMap

  // spatial hash for neighbor queries
  const spatial = buildSpatialHash(organisms, CELL_SIZE)

  // climate maps updates
  if (worldMaps && worldMaps.temperatureMap) {
    // decay all cells slightly
    for (let gy = 0; gy < GRID_RESOLUTION; gy++) for (let gx = 0; gx < GRID_RESOLUTION; gx++) {
      worldMaps.temperatureMap[gy][gx] = Math.max(0, worldMaps.temperatureMap[gy][gx] - TEMPERATURE_DECAY * dt)
      worldMaps.foodMap[gy][gx] = Math.max(0, worldMaps.foodMap[gy][gx] - FOOD_DECAY * dt)
      worldMaps.densityMap[gy][gx] = 0
    }
    // apply touches as gaussian distributed heat
    for (const t of touchEvents) {
      for (let gy = 0; gy < GRID_RESOLUTION; gy++) {
        for (let gx = 0; gx < GRID_RESOLUTION; gx++) {
          const cx = gx * CELL_SIZE + CELL_SIZE / 2
          const cy = gy * CELL_SIZE + CELL_SIZE / 2
          const dx = cx - t.x
          const dy = cy - t.y
          const dist2 = dx*dx + dy*dy
          const sigma = t.sigma || 30
          const influence = (t.amplitude || 0.6) * Math.exp(-dist2/(2*sigma*sigma))
          worldMaps.temperatureMap[gy][gx] += influence * dt
        }
      }
    }
  }

  organisms.forEach(org => {
    // compute local density later via map building
    // Cohesion: head towards average of nearby neighbors
  const neighbors = spatial.query(org.position, NEIGHBOR_RADIUS)
    if (neighbors.length > 0) {
      const avgX = neighbors.reduce((s, n) => s + n.position.x, 0) / neighbors.length
      const avgY = neighbors.reduce((s, n) => s + n.position.y, 0) / neighbors.length
      const desiredX = avgX - org.position.x
      const desiredY = avgY - org.position.y
      org.velocity.vx += (desiredX * COHESION_FACTOR) * dt
      org.velocity.vy += (desiredY * COHESION_FACTOR) * dt
    }

    // Escape: if any predator larger than this agent is near, drift away
  const threats = spatial.query(org.position, NEIGHBOR_RADIUS).filter(o => o.size > org.size * 1.1)
    if (threats.length > 0) {
      const threatVecX = threats.reduce((s, t) => s + (org.position.x - t.position.x), 0)
      const threatVecY = threats.reduce((s, t) => s + (org.position.y - t.position.y), 0)
      org.velocity.vx += (threatVecX * ESCAPE_FACTOR) * dt
      org.velocity.vy += (threatVecY * ESCAPE_FACTOR) * dt
    }
    if (heat) {
      const dx = heat.x - org.position.x
      const dy = heat.y - org.position.y
      const dist2 = dx*dx + dy*dy
      const influence = Math.exp(-dist2 / (heat.sigma*heat.sigma + 1)) * heat.amplitude
      org.velocity.vx += (dx/dist2 || 0) * influence * 0.02
      org.velocity.vy += (dy/dist2 || 0) * influence * 0.02
    }
    updateOrganism(org, dt, null)
    org.age = (Date.now() - org.spawnedAt) / 1000
      // update density map cell for this organism
      if (worldMaps && worldMaps.densityMap) {
        const gx = Math.floor(org.position.x / CELL_SIZE)
        const gy = Math.floor(org.position.y / CELL_SIZE)
        if (gy >= 0 && gy < GRID_RESOLUTION && gx >= 0 && gx < GRID_RESOLUTION) {
          worldMaps.densityMap[gy][gx] += 1
          // animal consumes food from map if available
          const avail = worldMaps.foodMap[gy][gx]
          if (avail > 0) {
            const eaten = Math.min(avail, FOOD_CONSUMPTION_RATE * dt)
            worldMaps.foodMap[gy][gx] = Math.max(0, avail - eaten)
            org.energy = Math.min(1, org.energy + eaten * FOOD_ENERGY_GAIN)
          }
        }
      }
  })

  // Predation: naive O(n^2) collision check (MVP)
  const removedIds = new Set()
  const events = []
  // For performance, use neighbors from spatial index for collisions
  for (let i = 0; i < organisms.length; i++) {
    const a = organisms[i]
    if (!a || removedIds.has(a.id)) continue
    for (let j = 0; j < organisms.length; j++) {
      if (i === j) continue
  const b = organisms[j]
      if (!b || removedIds.has(b.id)) continue
      // decide larger predator
      const predator = a.size >= b.size ? a : b
      const victim = predator === a ? b : a
      // distance test
      const dx = predator.position.x - victim.position.x
      const dy = predator.position.y - victim.position.y
      const dist2 = dx*dx + dy*dy
      const minDist = (predator.size + victim.size) * HITBOX_SCALE
    if (dist2 <= minDist*minDist && predator.size > victim.size * 1.05) {
        const key = predator.id + ':' + victim.id
  contactTimes[key] = (contactTimes[key] || 0) + dt
        if (contactTimes[key] >= PREDATION_CONTACT_TIME) {
          // predator absorbs victim
          predator.dna_layers.push(...victim.dna_layers)
          predator.size += victim.size * 0.6
          predator.energy = Math.min(1, predator.energy + 0.4)
          // schedule removal
          removedIds.add(victim.id)
          events.push({ type: 'predation', predatorId: predator.id, victimId: victim.id, newSize: predator.size })
        }
      }
    }
  }
  // evolution pass
  for (const org of organisms) {
    tryEvolution(org, events)
  }

  // filter organisms array to remove victims
  if (removedIds.size > 0) {
    for (const id of removedIds) {
      const idx = organisms.findIndex(o => o.id === id)
      if (idx >= 0) organisms.splice(idx, 1)
    }
  }

  // expire organisms with no energy or below minimum size
  for (let i = organisms.length - 1; i >= 0; i--) {
    const o = organisms[i]
    if (o.energy <= MIN_SURVIVAL_ENERGY || o.size < MIN_SIZE) {
      removedIds.add(o.id)
      events.push({ type: 'expired', id: o.id })
      organisms.splice(i, 1)
    }
  }

  return { removedIds: Array.from(removedIds), events, contactMap, maps: worldMaps }
}

// Spatial hash helps find neighbors quickly
// Quadtree implementation (simple, non-optimized) for O(log n) neighbor queries
class QuadtreeNode {
  constructor(x, y, w, h, level = 0, maxLevel = 6, maxObjects = 8) {
    this.bounds = { x, y, w, h }
    this.objects = []
    this.nodes = []
    this.level = level
    this.maxLevel = maxLevel
    this.maxObjects = maxObjects
  }
  insert(obj) {
    if (this.nodes.length > 0) {
      const idx = this._getIndex(obj.position)
      if (idx !== -1) return this.nodes[idx].insert(obj)
    }
    this.objects.push(obj)
    if (this.objects.length > this.maxObjects && this.level < this.maxLevel) {
      if (this.nodes.length === 0) this._split()
      let i = 0
      while (i < this.objects.length) {
        const index = this._getIndex(this.objects[i].position)
        if (index !== -1) this.nodes[index].insert(this.objects.splice(i, 1)[0])
        else i++
      }
    }
  }
  queryRange(range, found = []) {
    if (!this._intersects(range, this.bounds)) return found
    for (const obj of this.objects) {
      if (this._pointInRange(obj.position, range)) found.push(obj)
    }
    for (const node of this.nodes) node.queryRange(range, found)
    return found
  }
  _split() {
    const { x, y, w, h } = this.bounds
    const hw = w/2, hh = h/2
    this.nodes.push(new QuadtreeNode(x, y, hw, hh, this.level+1, this.maxLevel, this.maxObjects))
    this.nodes.push(new QuadtreeNode(x+hw, y, hw, hh, this.level+1, this.maxLevel, this.maxObjects))
    this.nodes.push(new QuadtreeNode(x, y+hh, hw, hh, this.level+1, this.maxLevel, this.maxObjects))
    this.nodes.push(new QuadtreeNode(x+hw, y+hh, hw, hh, this.level+1, this.maxLevel, this.maxObjects))
  }
  _getIndex(pos) {
    const { x, y, w, h } = this.bounds
    const midX = x + w/2
    const midY = y + h/2
    const left = pos.x < midX, top = pos.y < midY
    if (left && top) return 0
    if (!left && top) return 1
    if (left && !top) return 2
    return 3
  }
  _intersects(a, b) { return !(a.x > b.x + b.w || a.x + a.w < b.x || a.y > b.y + b.h || a.y + a.h < b.y) }
  _pointInRange(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h }
}

function buildQuadtree(list, worldSize) {
  const q = new QuadtreeNode(0,0,worldSize,worldSize)
  for (const item of list) q.insert(item)
  return q
}

// Spatial hash: choose simple grid-based hash for small n, Quadtree for larger n
function buildSpatialHash(list, cellSize, worldSize = WORLD_SIZE) {
  if (!Array.isArray(list)) return { query: () => [] }
  // use quadtree for larger numbers to reduce overhead
  if (list.length > 128) {
    const q = buildQuadtree(list, worldSize)
    return {
      query: (pos, radius) => {
        // handle wrap around by querying mirrored positions when near edges
        const candidates = []
        const toQuery = [pos]
        if (pos.x - radius < 0) toQuery.push({ x: pos.x + worldSize, y: pos.y })
        if (pos.x + radius > worldSize) toQuery.push({ x: pos.x - worldSize, y: pos.y })
        if (pos.y - radius < 0) toQuery.push({ x: pos.x, y: pos.y + worldSize })
        if (pos.y + radius > worldSize) toQuery.push({ x: pos.x, y: pos.y - worldSize })
        // also corners
        if (pos.x - radius < 0 && pos.y - radius < 0) toQuery.push({ x: pos.x + worldSize, y: pos.y + worldSize })
        if (pos.x + radius > worldSize && pos.y + radius > worldSize) toQuery.push({ x: pos.x - worldSize, y: pos.y - worldSize })
        const found = new Map()
        for (const p of toQuery) {
          const res = q.query(p, radius)
          for (const o of res) found.set(o.id, o)
        }
        return Array.from(found.values())
      }
    }
  }

  // grid-based index
  const grid = new Map()
  const insert = (obj) => {
    const gx = Math.floor(obj.position.x / cellSize)
    const gy = Math.floor(obj.position.y / cellSize)
    const key = gx + ':' + gy
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key).push(obj)
  }
  for (const o of list) insert(o)

  return {
    query: (pos, radius) => {
      // handle wrap-around positions similarly to quadtree
      const toQuery = [pos]
      if (pos.x - radius < 0) toQuery.push({ x: pos.x + worldSize, y: pos.y })
      if (pos.x + radius > worldSize) toQuery.push({ x: pos.x - worldSize, y: pos.y })
      if (pos.y - radius < 0) toQuery.push({ x: pos.x, y: pos.y + worldSize })
      if (pos.y + radius > worldSize) toQuery.push({ x: pos.x, y: pos.y - worldSize })
      if (pos.x - radius < 0 && pos.y - radius < 0) toQuery.push({ x: pos.x + worldSize, y: pos.y + worldSize })
      if (pos.x + radius > worldSize && pos.y + radius > worldSize) toQuery.push({ x: pos.x - worldSize, y: pos.y - worldSize })
      const results = []
      const seen = new Set()
  // iterate over mirrored positions
  for (const qpos of toQuery) {
        const minX = Math.floor((qpos.x - radius) / cellSize)
        const maxX = Math.floor((qpos.x + radius) / cellSize)
        const minY = Math.floor((qpos.y - radius) / cellSize)
        const maxY = Math.floor((qpos.y + radius) / cellSize)
        for (let gx = minX; gx <= maxX; gx++) {
          for (let gy = minY; gy <= maxY; gy++) {
            const key = gx + ':' + gy
            const bucket = grid.get(key)
            if (!bucket) continue
            for (const obj of bucket) {
              if (seen.has(obj.id)) continue
              const dx = obj.position.x - qpos.x
              const dy = obj.position.y - qpos.y
              if (dx*dx + dy*dy <= radius*radius) {
                results.push(obj)
                seen.add(obj.id)
              }
            }
          }
        }
      }
      // cleaned up mirrored query; results are already accumulated
      return results
    }
  }
}

// Add a friendly query API onto the Quadtree
QuadtreeNode.prototype.query = function(pos, radius) {
  const range = { x: pos.x - radius, y: pos.y - radius, w: radius*2, h: radius*2 }
  return this.queryRange(range)
}

// Evolution: simple heuristic - if organism has high energy and large size and random chance
function tryEvolution(org, events) {
  // guard rails
  if (!org || !org.traits) return
  if (org.age < 20) return
  if (Math.random() > 0.0007) return
  // mutate: add a metaball and shift traits slightly
  const extra = { x: Math.random()*10 - 5, y: Math.random()*10 - 5, r: 6 + Math.random()*6 }
  org.metaballs.push([extra.x, extra.y, extra.r])
  org.traits.cohesion = clamp(org.traits.cohesion + (Math.random()-0.5)*0.05, 0, 1)
  org.traits.escape = clamp(org.traits.escape + (Math.random()-0.5)*0.05, 0, 1)
  // evolve eye state
  org.state = 'evolved'
  events.push({ type: 'evolve', id: org.id, traits: org.traits })
}

module.exports = { updateOrganism, simulateWorldStep, buildSpatialHash, QuadtreeNode, WORLD_SIZE }
