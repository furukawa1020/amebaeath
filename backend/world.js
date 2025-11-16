// world.js
// Lightweight world simulation utilities for MVP.

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

const ENERGY_DECAY_PER_SEC = 0.01
const MAX_SPEED = 2.0

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

function simulateWorldStep(organisms, touchEvents, dt) {
  // For MVP: apply very light temperature attraction: organisms drift toward recent touches
  const heat = touchEvents.length ? touchEvents[touchEvents.length-1] : null
  organisms.forEach(org => {
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
}

module.exports = { updateOrganism, simulateWorldStep }
