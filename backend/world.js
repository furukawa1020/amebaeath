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

function simulateWorldStep(organisms, touchEvents, dt, contactMap = {}) {
  // For MVP: apply very light temperature attraction: organisms drift toward recent touches
  const heat = touchEvents.length ? touchEvents[touchEvents.length-1] : null
  // contact times for predation: map keys 'predatorId:victimId'
  const contactTimes = contactMap

  organisms.forEach(org => {
    // Cohesion: head towards average of nearby neighbors
    const neighbors = organisms.filter(o => o.id !== org.id && Math.hypot(o.position.x - org.position.x, o.position.y - org.position.y) < NEIGHBOR_RADIUS)
    if (neighbors.length > 0) {
      const avgX = neighbors.reduce((s, n) => s + n.position.x, 0) / neighbors.length
      const avgY = neighbors.reduce((s, n) => s + n.position.y, 0) / neighbors.length
      const desiredX = avgX - org.position.x
      const desiredY = avgY - org.position.y
      org.velocity.vx += (desiredX * COHESION_FACTOR) * dt
      org.velocity.vy += (desiredY * COHESION_FACTOR) * dt
    }

    // Escape: if any predator larger than this agent is near, drift away
    const threats = organisms.filter(o => o.id !== org.id && o.size > org.size * 1.1 && Math.hypot(o.position.x - org.position.x, o.position.y - org.position.y) < NEIGHBOR_RADIUS)
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
  })

  // Predation: naive O(n^2) collision check (MVP)
  const removedIds = new Set()
  const events = []
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

  // filter organisms array to remove victims
  if (removedIds.size > 0) {
    for (const id of removedIds) {
      const idx = organisms.findIndex(o => o.id === id)
      if (idx >= 0) organisms.splice(idx, 1)
    }
  }

  return { removedIds: Array.from(removedIds), events, contactMap }
}

module.exports = { updateOrganism, simulateWorldStep }
