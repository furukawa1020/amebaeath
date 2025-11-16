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
})
