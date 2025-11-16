const request = require('supertest')
const fs = require('fs')
const path = require('path')

describe('Autotune endpoint', () => {
  jest.setTimeout(20000)
  test('POST /config/quadtree/autotune writes config file', async () => {
    const { app } = require('../server')
    const p = path.join(__dirname, '..', 'config', 'quadtree.json')
    // remove existing config to ensure script writes
    try { if (fs.existsSync(p)) fs.unlinkSync(p) } catch(e) {}

    // call autotune with small sizes to keep it fast
    const res = await request(app).post('/config/quadtree/autotune').send({ sizes: [20, 50], queries: 20 })
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('ok', true)
    // confirm file exists
    expect(fs.existsSync(p)).toBeTruthy()
    const conf = JSON.parse(fs.readFileSync(p, 'utf8'))
    expect(conf).toHaveProperty('threshold')
    // check runtime reload applied
    const configResp = await request(app).get('/config/quadtree')
    expect(configResp.statusCode).toBe(200)
    expect(configResp.body).toEqual(conf)
  })
})
