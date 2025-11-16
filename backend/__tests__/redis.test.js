jest.resetModules()
const request = require('supertest')

describe('Redis spawn rate-limit', () => {
  jest.setTimeout(20000)
  beforeAll(() => {
    // mock redis client module
  const incr = jest.fn()
    // first call -> 1, second call -> 2
    incr.mockImplementationOnce(() => Promise.resolve(1)).mockImplementationOnce(() => Promise.resolve(2))
  jest.doMock('redis', () => ({ createClient: () => ({ connect: () => Promise.resolve(), on: jest.fn(), incr, expire: jest.fn(), disconnect: jest.fn() }) }))
    process.env.REDIS_URL = 'redis://localhost:6379'
  })
  afterAll(() => {
    delete process.env.REDIS_URL
    jest.resetModules()
  })

  test('spawn respects redis limit and /health reports redis', async () => {
    const { app } = require('../server')
    const headers = { 'X-Forwarded-For': '10.0.0.1' }
    const r1 = await request(app).post('/spawn').set(headers).send({})
    expect([200,201]).toContain(r1.statusCode)
    const r2 = await request(app).post('/spawn').set(headers).send({})
    expect(r2.statusCode).toBe(429)

    const h = await request(app).get('/health')
    expect(h.statusCode).toBe(200)
    expect(h.body).toHaveProperty('redis', true)
  })
})
