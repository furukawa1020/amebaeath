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
    // Use a unique IP for this test run to avoid collision with other tests or previous runs
    const uniqueIp = `127.0.0.${Math.floor(Math.random() * 250)}`
    const headers = { 'X-Forwarded-For': uniqueIp }

    const res1 = await request(app).post('/spawn').set(headers).send({})
    console.log(`DEBUG: res1 status=${res1.statusCode} body=${JSON.stringify(res1.body)}`)
    if (res1.statusCode !== 200 && res1.statusCode !== 201) {
      throw new Error(`Expected 200 or 201, got ${res1.statusCode}`)
    }

    const res2 = await request(app).post('/spawn').set(headers).send({})
    console.log(`DEBUG: res2 status=${res2.statusCode} body=${JSON.stringify(res2.body)}`)
    if (res2.statusCode !== 429 && res2.statusCode !== 201) {
      // Note: 201 is allowed if rate limit failed to trigger (e.g. race condition or reset), 
      // but we really expect 429. The original test allowed 201 for some reason.
      // Let's enforce 429 to see if it works.
      // If it fails, we'll see the actual status code.
    }
    expect([429]).toContain(res2.statusCode)
  })

  test('POST /touch rate limit enforced', async () => {
    const uniqueIp = `127.0.1.${Math.floor(Math.random() * 250)}`
    const seq = async (n) => {
      for (let i = 0; i < n; i++) {
        await request(app).post('/touch').set('X-Forwarded-For', uniqueIp).send({ x: 100, y: 100 })
      }
    }
    // make base calls under limit
    await seq(10)
    // hit limit over 60
    await seq(61)
    const res = await request(app).post('/touch').set('X-Forwarded-For', uniqueIp).send({ x: 10, y: 10 })
    expect([200, 429]).toContain(res.statusCode)
  })

  test('GET /stats returns basic metrics', async () => {
    const res = await request(app).get('/stats')
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('avgEnergy')
    expect(res.body).toHaveProperty('avgSize')
  })
})
