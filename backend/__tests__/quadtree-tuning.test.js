const { buildSpatialHash, buildGridIndex, QUADTREE_THRESHOLD } = require('../world')

describe('Quadtree tuning behavior', () => {
  test('switches to quadtree when list size exceeds threshold', () => {
    const small = Array.from({length: Math.max(1, QUADTREE_THRESHOLD-10)}, (_, i) => ({ id: ''+i, position: { x: Math.random()*2000, y: Math.random()*2000 } }))
    const smallIndex = buildSpatialHash(small, 10, 2000)
    // small should be grid-like (no _isQuadtree true)
    expect(smallIndex._isQuadtree).toBeFalsy()

    const big = Array.from({length: QUADTREE_THRESHOLD + 50}, (_, i) => ({ id: 'b'+i, position: { x: Math.random()*2000, y: Math.random()*2000 } }))
    const bigIndex = buildSpatialHash(big, 10, 2000)
    expect(bigIndex._isQuadtree).toBeTruthy()
  })
})
