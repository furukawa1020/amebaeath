import React, { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [token, setToken] = useState('')
  const [world, setWorld] = useState({ WORLD_SIZE: 2000, GRID_RESOLUTION: 200, NEIGHBOR_RADIUS: 100, COHESION_FACTOR: 0.08, ESCAPE_FACTOR: 0.18, FOOD_CONSUMPTION_RATE: 1.2, FOOD_ENERGY_GAIN: 0.5 })
  const [quadtree, setQuadtree] = useState({ threshold: 128, maxObjects: 8, maxLevel: 6 })

  useEffect(() => {
    async function load() {
      try {
        const r1 = await fetch(`${API_BASE}/config/world`)
        if (r1.ok) {
          const j = await r1.json()
          // server returns { ok: true, config: { ... } }
          const cfg = j && j.config ? j.config : j
          setWorld(w => ({ ...w, ...cfg }))
        }
        const r2 = await fetch(`${API_BASE}/config/quadtree`)
        if (r2.ok) {
          const q = await r2.json()
          if (q && q.threshold) setQuadtree(q)
        }
      } catch (e) {
        console.error('admin load err', e)
        setMsg('Failed to load config: ' + e.toString())
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const updateWorld = (k, v) => setWorld(w => ({ ...w, [k]: v }))
  const updateQuad = (k, v) => setQuadtree(q => ({ ...q, [k]: v }))

  const saveWorld = async () => {
    setMsg('Saving...')
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['x-admin-token'] = token
      const res = await fetch(`${API_BASE}/config/world`, { method: 'POST', headers, body: JSON.stringify(world) })
      const j = await res.json()
      setMsg(JSON.stringify(j))
    } catch (e) { setMsg('save failed: ' + e.toString()) }
  }

  const persistWorld = async () => {
    setMsg('Persisting...')
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['x-admin-token'] = token
      const res = await fetch(`${API_BASE}/config/world/persist`, { method: 'POST', headers, body: JSON.stringify(world) })
      const j = await res.json()
      setMsg(JSON.stringify(j))
    } catch (e) { setMsg('persist failed: ' + e.toString()) }
  }

  const loadPersisted = async () => {
    setMsg('Loading persisted...')
    try {
      const headers = {}
      if (token) headers['x-admin-token'] = token
      const res = await fetch(`${API_BASE}/config/world/persist/load`, { headers })
      const j = await res.json()
      if (res.ok && j.loaded) setWorld(w => ({ ...w, ...j.loaded }))
      setMsg(JSON.stringify(j))
    } catch (e) { setMsg('load failed: ' + e.toString()) }
  }

  const saveQuadtree = async () => {
    setMsg('Saving quadtree...')
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['x-admin-token'] = token
      const res = await fetch(`${API_BASE}/config/quadtree`, { method: 'POST', headers, body: JSON.stringify(quadtree) })
      const j = await res.json()
      setMsg(JSON.stringify(j))
    } catch (e) { setMsg('save quad failed: ' + e.toString()) }
  }

  const runAutotune = async () => {
    setMsg('Running autotune...')
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['x-admin-token'] = token
      const res = await fetch(`${API_BASE}/config/quadtree/autotune`, { method: 'POST', headers, body: JSON.stringify({ sizes: [20,50,100], queries: 80 }) })
      const j = await res.json()
      setMsg(JSON.stringify(j))
      // fetch latest config
      const conf = await (await fetch(`${API_BASE}/config/quadtree`, { headers })).json()
      setQuadtree(conf)
    } catch (e) { setMsg('autotune failed: ' + e.toString()) }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h2>AmebaEarth Admin</h2>
      <p>Backend: <code>{API_BASE}</code></p>
      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ width: 300 }}>
            <h3>Admin Token</h3>
            <p>Set <code>ADMIN_TOKEN</code> in backend to enable auth. Leave blank for no auth.</p>
            <input style={{ width: '100%', padding: 6 }} value={token} onChange={e => setToken(e.target.value)} placeholder="admin token" />
          </div>
          <div style={{ width: 420 }}>
            <h3>World Runtime</h3>
            {Object.entries({ WORLD_SIZE: 'number', GRID_RESOLUTION: 'number', NEIGHBOR_RADIUS: 'number', COHESION_FACTOR: 'number', ESCAPE_FACTOR: 'number', FOOD_CONSUMPTION_RATE: 'number', FOOD_ENERGY_GAIN: 'number' }).map(([k,t]) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 13 }}>{k}</label>
                <input style={{ width: '100%', padding: 6 }} value={world[k] ?? ''} onChange={e => updateWorld(k, isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))} />
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <button onClick={saveWorld} style={{ marginRight: 8 }}>Apply</button>
              <button onClick={persistWorld} style={{ marginRight: 8 }}>Persist</button>
              <button onClick={loadPersisted}>Load Persisted</button>
            </div>
          </div>

          <div style={{ width: 420 }}>
            <h3>Quadtree</h3>
            <div style={{ marginBottom: 8 }}>
              <label>threshold</label>
              <input value={quadtree.threshold || ''} onChange={e => updateQuad('threshold', Number(e.target.value))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>maxObjects</label>
              <input value={quadtree.maxObjects || ''} onChange={e => updateQuad('maxObjects', Number(e.target.value))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>maxLevel</label>
              <input value={quadtree.maxLevel || ''} onChange={e => updateQuad('maxLevel', Number(e.target.value))} />
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={saveQuadtree} style={{ marginRight: 8 }}>Save Quadtree</button>
              <button onClick={runAutotune}>Run Autotune</button>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h3>Status</h3>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f8fa', padding: 12, borderRadius: 6 }}>{msg}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
