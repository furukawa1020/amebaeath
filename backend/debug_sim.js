const { simulateWorldStep } = require('./world')
const org = { id: 'o', position: { x: 100, y: 100 }, velocity: { vx: 0, vy: 0 }, size: 0.6, metaballs: [], traits: {}, dna_layers: ['#fff'], energy: 0.2, state: 'normal', spawnedAt: Date.now(), lastUpdated: Date.now() }
const worldMaps = {
  temperatureMap: Array.from({length: 200}, () => Array(200).fill(0)),
  foodMap: Array.from({length: 200}, () => Array(200).fill(0)),
  densityMap: Array.from({length: 200}, () => Array(200).fill(0))
}
const gx = Math.floor(org.position.x / (2000/200))
const gy = Math.floor(org.position.y / (2000/200))
worldMaps.foodMap[gy][gx] = 1.0
console.log('before energy', org.energy)
const res = simulateWorldStep([org], [], 1.0, {}, worldMaps)
console.log('after energy', org.energy)
console.log('food', worldMaps.foodMap[gy][gx])
console.log('events', res.events)
