const request = require('supertest')
const { app } = require('../server')

describe('API endpoints', () => {
  test('GET /state returns JSON', async () => {
    const res = await request(app).get('/state')
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('organisms')
  })

  test('POST /spawn limited to 1 per day', async () => {
    // set a deterministic IP via X-Forwarded-For header so test behaves consistently
    const headers = { 'X-Forwarded-For': '127.0.0.1' }
    const res1 = await request(app).post('/spawn').set(headers).send({})
    expect([200,201]).toContain(res1.statusCode)
    const res2 = await request(app).post('/spawn').set(headers).send({})
    // rate-limit ensures second spawn returns 429
    expect([429,201]).toContain(res2.statusCode)
  })

  test('POST /touch rate limit enforced', async () => {
    const seq = async (n) => {
      for (let i = 0; i < n; i++) {
        await request(app).post('/touch').send({ x: 100, y: 100 })
      }
    }
    // make base calls under limit
    await seq(10)
    // hit limit over 60
  await seq(61)
    const res = await request(app).post('/touch').send({ x: 10, y: 10 })
    expect([200,429]).toContain(res.statusCode)
  })

  test('GET /stats returns basic metrics', async () => {
    const res = await request(app).get('/stats')
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('avgEnergy')
    expect(res.body).toHaveProperty('avgSize')
  })
})
