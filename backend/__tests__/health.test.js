const request = require('supertest')
const { app } = require('../server')

describe('/health endpoint', () => {
  test('health returns ok and flags', async () => {
    const res = await request(app).get('/health')
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('ok', true)
    expect(res.body).toHaveProperty('db')
    expect(res.body).toHaveProperty('redis')
  })
})
