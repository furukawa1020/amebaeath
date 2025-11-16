const { updateOrganism, simulateWorldStep } = require('../world')

describe('World simulation', () => {
  test('energy decays over time', () => {
    const org = {
      id: 'test1',
      position: { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 },
      size: 1,
      metaballs: [],
      traits: {},
      dna_layers: ['#fff'],
      energy: 1.0,
      state: 'normal',
      spawnedAt: Date.now(),
      lastUpdated: Date.now()
    }
    updateOrganism(org, 1.0, null)
    expect(org.energy).toBeLessThan(1.0)
    expect(org.energy).toBeGreaterThanOrEqual(0)
  })

  test('predation removes victim after contact time and increases predator size', () => {
    const predator = {
      id: 'pred',
      position: { x: 100, y: 100 },
      velocity: { vx: 0, vy: 0 },
      size: 2,
      metaballs: [],
      traits: {},
      dna_layers: ['#abc'],
      energy: 0.5,
      state: 'normal',
      spawnedAt: Date.now(),
      lastUpdated: Date.now()
    }
    const victim = {
      id: 'vict',
      position: { x: 101, y: 101 },
      velocity: { vx: 0, vy: 0 },
      size: 0.5,
      metaballs: [],
      traits: {},
      dna_layers: ['#123'],
      energy: 0.5,
      state: 'normal',
      spawnedAt: Date.now(),
      lastUpdated: Date.now()
    }
    const organisms = [predator, victim]
    let contactMap = {}
    // simulate enough steps to exceed PREDATION_CONTACT_TIME
    for (let i=0;i<20;i++) {
      const res = simulateWorldStep(organisms, [], 0.1, contactMap)
      contactMap = res.contactMap
      if (res.events && res.events.length) {
        // break after predation event
        break
      }
    }
    // After predation, victim should be removed
    const found = organisms.find(o => o.id === 'vict')
    expect(found).toBeUndefined()
    // predator should have grown and absorbed dna layers
    const pred = organisms.find(o => o.id === 'pred')
    expect(pred).toBeDefined()
    expect(pred.size).toBeGreaterThan(2)
    expect(pred.dna_layers).toContain('#123')
  })

  test('temperature map increases with touch events', () => {
    const organisms = [
      { id: 'o1', position: { x: 100, y: 100 }, velocity: { vx: 0, vy: 0 }, size: 1.0, metaballs: [], traits: {}, dna_layers: ['#fff'], energy: 1.0, state: 'normal', spawnedAt: Date.now(), lastUpdated: Date.now() }
    ]
    const worldMaps = {
      temperatureMap: Array.from({length: 200}, () => Array(200).fill(0)),
      foodMap: Array.from({length: 200}, () => Array(200).fill(0)),
      densityMap: Array.from({length: 200}, () => Array(200).fill(0))
    }
    const touch = { id: 't1', x: 110, y: 110, amplitude: 0.7, sigma: 20, createdAt: Date.now() }
    expect(worldMaps.temperatureMap[11][11]).toBe(0)
    const res = simulateWorldStep(organisms, [touch], 0.25, {}, worldMaps)
    expect(res.maps).toBeDefined()
    // after step some cell near the touch has value > 0
    const gx = Math.floor(touch.x / (2000/200))
    const gy = Math.floor(touch.y / (2000/200))
    expect(worldMaps.temperatureMap[gy][gx]).toBeGreaterThan(0)
  })

  test('organisms consume food and may expire', () => {
    const org = { id: 'o', position: { x: 100, y: 100 }, velocity: { vx: 0, vy: 0 }, size: 0.6, metaballs: [], traits: {}, dna_layers: ['#fff'], energy: 0.2, state: 'normal', spawnedAt: Date.now(), lastUpdated: Date.now() }
    const worldMaps = {
      temperatureMap: Array.from({length: 200}, () => Array(200).fill(0)),
      foodMap: Array.from({length: 200}, () => Array(200).fill(0)),
      densityMap: Array.from({length: 200}, () => Array(200).fill(0))
    }
    const gx = Math.floor(org.position.x / (2000/200))
    const gy = Math.floor(org.position.y / (2000/200))
    worldMaps.foodMap[gy][gx] = 1.0
    const res = simulateWorldStep([org], [], 1.0, {}, worldMaps)
    // ensure food was eaten and energy rose
    expect(worldMaps.foodMap[gy][gx]).toBeLessThan(1.0)
    expect(org.energy).toBeGreaterThan(0.2)
    // now deplete energy and force expire
    org.energy = 0.01
    const res2 = simulateWorldStep([org], [], 1.0, {}, worldMaps)
    expect(res2.events.some(e => e.type === 'expired')).toBeTruthy()
  })
})
