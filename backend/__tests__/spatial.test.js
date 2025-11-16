const { buildSpatialHash, WORLD_SIZE } = require('../world')

describe('Spatial index', () => {
  test('grid-based spatial hash finds neighbors across world wrap', () => {
    // two organisms across world wrap: x=1998 and x=5
    const a = { id: 'a', position: { x: 1998, y: 100 } }
    const b = { id: 'b', position: { x: 5, y: 105 } }
    const list = [a, b]
    const cellSize = WORLD_SIZE / 200
    const s = buildSpatialHash(list, cellSize, WORLD_SIZE)
    const found = s.query({ x: a.position.x, y: a.position.y }, 20)
    const ids = found.map(x => x.id)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
  })

  test('quadtree-based spatial hash finds neighbors across world wrap', () => {
    const a = { id: 'qa', position: { x: 1999, y: 150 } }
    const b = { id: 'qb', position: { x: 2, y: 152 } }
    const others = []
    for (let i = 0; i < 200; i++) others.push({ id: 'x' + i, position: { x: Math.random()*WORLD_SIZE, y: Math.random()*WORLD_SIZE } })
    const list = [a, b, ...others]
    const cellSize = WORLD_SIZE / 200
    const s = buildSpatialHash(list, cellSize, WORLD_SIZE)
    const found = s.query({ x: a.position.x, y: a.position.y }, 50)
    const ids = found.map(x => x.id)
    expect(ids).toContain('qa')
    expect(ids).toContain('qb')
  })
})
