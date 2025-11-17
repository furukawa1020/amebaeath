import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'

export default function P5Canvas({ wsUrl }) {
  const canvasRef = useRef(null)
  const socketRef = useRef(null)
  const [showFood, setShowFood] = useState(false)
  const [smoothMetaballs, setSmoothMetaballs] = useState(false)
  const showFoodRef = useRef(false)

  useEffect(() => { showFoodRef.current = showFood }, [showFood])

  useEffect(() => {
    let p5Instance = null
    let p5 = null
    let anime = null

    async function initP5() {
      if (typeof window === 'undefined') return
      try {
        // client-only dynamic imports (avoid SSR/runtime import issues)
        const p5mod = await import('p5')
        p5 = p5mod && p5mod.default ? p5mod.default : p5mod
        const animemod = await import('animejs/lib/anime.es.js')
        anime = animemod && animemod.default ? animemod.default : animemod
      } catch (e) {
        console.error('Failed to dynamically import p5 or animejs', e)
        return
      }

      p5Instance = new p5((s) => {
        s.setup = () => {
          const el = canvasRef.current
          const w = window.innerWidth
          const h = window.innerHeight
          s.createCanvas(w, h)
          s.noStroke()
        }

        s.windowResized = () => {
          s.resizeCanvas(window.innerWidth, window.innerHeight)
        }

  let organisms = []
  let pulses = []
  let selected = null
  let touches = []
  // maps holds optional heat/food maps sent from the server (temperatureMap, foodMap)
  let maps = null

  socketRef.current = io(wsUrl)
  // socket handlers registered after anime is available
        socketRef.current.on('init', (data) => {
          organisms = data.organisms || []
          // initialize local visual state
          organisms.forEach((o, idx) => { o._scale = 1; o._blinkTimer = 0 })
        })
        socketRef.current.on('touch', (data) => {
          // touch data: {x,y,amplitude,sigma}
          const worldX = (data.x / 2000) * s.width
          const worldY = (data.y / 2000) * s.height
          touches.push({ x: worldX, y: worldY, amplitude: data.amplitude || 0.6, createdAt: Date.now() })
        })
        socketRef.current.on('spawn', (data) => {
          organisms.push(data.organism)
        })
        socketRef.current.on('tick', (payload) => {
          const updates = payload.updates || []
          if (payload.maps) maps = payload.maps
          updates.forEach(u => {
            const i = organisms.findIndex(x => x.id === u.id)
            if (i >= 0) {
              organisms[i].position = u.position
              organisms[i].velocity = u.velocity
              organisms[i].energy = u.energy
              // keep client-side state in sync with server authoritative state
              organisms[i].state = u.state || organisms[i].state
              organisms[i].size = u.size || organisms[i].size
              organisms[i].dna_layers = u.dna_layers || organisms[i].dna_layers
            } else {
              organisms.push({ id: u.id, position: u.position, size: u.size })
            }
            // animate breathing using anime.js on update (anime is client-only)
            const target = organisms.find(x => x.id === u.id)
            if (target && typeof anime === 'function') {
              try { anime.remove(target) } catch(e) { /* ignore */ }
              try { anime({ targets: target, _scale: [1.0, 1.06, 1.0], duration: 900, easing: 'easeInOutSine' }) } catch(e) { /* ignore */ }
            }
          })
        })

        // map organism state to visual color
        function stateToColor(state) {
          switch ((state || '').toString()) {
            case 'flee': return [255, 90, 70]
            case 'hunt': return [220, 80, 180]
            case 'forage': return [120, 220, 140]
            case 'low_energy': return [200, 180, 90]
            case 'sleep': return [80, 120, 200]
            case 'evolved': return [200, 140, 255]
            case 'alert': return [255, 200, 80]
            default: return [200, 150, 220]
          }
        }
        socketRef.current.on('spawn', (payload) => {
          const o = payload.organism
          if (!o) return
          organisms.push(o)
          o._scale = 1
          try { if (typeof anime === 'function') anime({ targets: o, _scale: [0.4, 1.0], duration: 700, easing: 'easeOutBack' }) } catch(e) {}
        })
        socketRef.current.on('touch', (payload) => {
          // visual pulse
          const p = { x: payload.x, y: payload.y, amplitude: payload.amplitude || 0.6, createdAt: Date.now() }
          pulses.push(p)
        })
        socketRef.current.on('predation', (payload) => {
          // payload: { predatorId, victimId, newSize }
          try {
            const { predatorId, victimId, newSize } = payload
            const pred = organisms.find(o => o.id === predatorId)
            const vicIdx = organisms.findIndex(o => o.id === victimId)
            if (pred && typeof newSize === 'number') pred.size = newSize
            if (vicIdx >= 0) organisms.splice(vicIdx, 1)
          } catch (e) { console.error('predation handling', e) }
        })
        socketRef.current.on('evolve', (payload) => {
          const id = payload.id
          const o = organisms.find(x => x.id === id)
          if (o) {
            o.state = 'evolved'
            // small glow/tween
            anime({ targets: o, _scale: [1, 1.2, 1], duration: 700, easing: 'easeOutExpo' })
          }
        })

        s.mouseClicked = () => {
          const api = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
          const wx = (s.mouseX / s.width) * 2000
          const wy = (s.mouseY / s.height) * 2000
          // select organism if near
          const nearest = organisms.reduce((best, o) => {
            const d = Math.hypot(o.position.x - wx, o.position.y - wy)
            if (!best || d < best.d) return { o, d }
            return best
          }, null)
          if (nearest && nearest.d < (nearest.o.size || 1) * 20) selected = nearest.o
          fetch(`${api}/touch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: wx, y: wy }) })
            .then(r => r.json()).then(d => console.log('touch', d)).catch(e=>console.error(e))
        }

        // Simple marching squares implementation for metaball smoothing
        function computeField(orgs, cols, rows) {
          const grid = Array.from({length: rows+1}, () => Array(cols+1).fill(0))
          for (let gy = 0; gy <= rows; gy++) {
            for (let gx = 0; gx <= cols; gx++) {
              const x = (gx / cols) * 2000
              const y = (gy / rows) * 2000
              let val = 0
              for (const o of orgs) {
                const balls = o.metaballs || []
                for (const b of balls) {
                  const bx = (o.position.x + b[0])
                  const by = (o.position.y + b[1])
                  const r = b[2]
                  const dx = x - bx
                  const dy = y - by
                  val += Math.exp(-(dx*dx + dy*dy)/(r*r*2))
                }
              }
              grid[gy][gx] = val
            }
          }
          return grid
        }

        function marchingSquares(grid, cols, rows, threshold) {
          const polys = []
          const lerp = (a,b,t) => ({x:a.x + (b.x-a.x)*t, y:a.y + (b.y-a.y)*t})
          const corners = [[0,0],[1,0],[1,1],[0,1]]
          for (let gy=0; gy<rows; gy++) {
            for (let gx=0; gx<cols; gx++) {
              const tl = grid[gy][gx]
              const tr = grid[gy][gx+1]
              const br = grid[gy+1][gx+1]
              const bl = grid[gy+1][gx]
              const idx = (tl>threshold?1:0) | (tr>threshold?2:0) | (br>threshold?4:0) | (bl>threshold?8:0)
              if (idx === 0 || idx === 15) continue
              const x0 = (gx/cols) * s.width
              const y0 = (gy/rows) * s.height
              const x1 = ((gx+1)/cols) * s.width
              const y1 = ((gy+1)/rows) * s.height
              const top = {x: x0 + (x1-x0) * ((threshold - tl)/(tr - tl + 1e-9)), y: y0}
              const right = {x: x1, y: y0 + (y1-y0) * ((threshold - tr)/(br - tr + 1e-9))}
              const bottom = {x: x0 + (x1-x0) * ((threshold - bl)/(br - bl + 1e-9)), y: y1}
              const left = {x: x0, y: y0 + (y1-y0) * ((threshold - tl)/(bl - tl + 1e-9))}
              const segs = {
                1: [left, top], 2: [top, right], 3: [left, right], 4: [right, bottom],
                5: [left, bottom, right, top], 6: [top, bottom], 7: [left, bottom],
                8: [bottom, left], 9: [bottom, top], 10: [top, right, bottom, left],
                11: [top, right], 12: [right, left], 13: [top, left], 14: [right, left]
              }[idx]
              if (segs) {
                polys.push(segs)
              }
            }
          }
          return polys
        }

        s.draw = () => {
          try {
            s.background(12, 18, 24)
            // defensive caps to avoid runaway memory/CPU
            if (pulses.length > 500) pulses.splice(0, pulses.length - 500)
            if (touches.length > 500) touches.splice(0, touches.length - 500)
          // draw heatmap if available
          if (maps && maps.temperatureMap) {
            const grid = maps.temperatureMap
            const rows = grid.length
            const cols = grid[0]?.length || 0
            for (let gy=0; gy<rows; gy++) {
              for (let gx=0; gx<cols; gx++) {
                const val = grid[gy][gx]
                if (!val || val <= 0) continue
                const alpha = Math.min(220, Math.round(200 * Math.min(1, val)))
                // heat color: blue -> yellow -> red
                const r = Math.min(255, Math.round(255 * val))
                const g = Math.max(0, Math.min(255, Math.round(255*(1-val))))
                s.noStroke()
                s.fill(r, g, 60, alpha)
                const cx = s.width * (gx / cols)
                const cy = s.height * (gy / rows)
                s.rect(cx, cy, s.width/cols+1, s.height/rows+1)
              }
            }
          }
          // option: draw food map overlay in green
          if (showFoodRef.current && maps && maps.foodMap) {
            const grid = maps.foodMap
            const rows = grid.length
            const cols = grid[0]?.length || 0
            for (let gy=0; gy<rows; gy++) {
              for (let gx=0; gx<cols; gx++) {
                const val = grid[gy][gx]
                if (!val || val <= 0) continue
                const alpha = Math.min(200, Math.round(180 * Math.min(1, val)))
                s.noStroke()
                s.fill(40, 255, 80, alpha)
                const cx = s.width * (gx / cols)
                const cy = s.height * (gy / rows)
                s.rect(cx, cy, s.width/cols+1, s.height/rows+1)
              }
            }
          }
          // draw organisms
          // draw pulses
          for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i]
            const age = (Date.now() - p.createdAt) / 1000
            const life = 4 // seconds
            if (age > life) { pulses.splice(i, 1); continue }
            const alpha = 200 * (1 - age / life)
            const rx = s.width * (p.x / 2000)
            const ry = s.height * (p.y / 2000)
            s.fill(255, 120, 40, alpha)
            s.ellipse(rx, ry, p.amplitude * 200 * (1 + age), p.amplitude * 200 * (1 + age))
          }
          if (smoothMetaballs && organisms.length) {
            const cols = 60; const rows = 40
            // safety: avoid huge allocations / pathological inputs
            const maxCells = 10000
            if (cols * rows <= maxCells) {
              let field = null
              try {
                field = computeField(organisms, cols, rows)
              } catch (e) {
                console.error('computeField failed', e)
              }
              if (field) {
                let polys = null
                try {
                  polys = marchingSquares(field, cols, rows, 0.5)
                } catch (e) {
                  console.error('marchingSquares failed', e)
                  polys = null
                }
                if (polys) {
                  s.noStroke()
                  s.fill(200, 140, 255, 180)
                  for (const poly of polys) {
                    s.beginShape()
                    for (const v of poly) s.vertex(v.x, v.y)
                    s.endShape(s.CLOSE)
                  }
                }
              }
            }
          }

          for (const o of organisms) {
            const x = (o.position && o.position.x) || 0
            const y = (o.position && o.position.y) || 0
            // world coords -> screen: simple wrap and scale
            const sx = (x / 2000) * s.width
            const sy = (y / 2000) * s.height
            // draw dna layers as concentric rings
            const dna = o.dna_layers || []
            const scale = o._scale || 1
            const base = (o.size || 1) * 24 * scale
            // state color overlay
            const sc = stateToColor(o.state)
            const stateAlpha = 200
            for (let li = dna.length - 1; li >= 0; li--) {
              const c = dna[li]
              s.fill(c)
              const factor = 0.6 + (li / Math.max(1, dna.length)) * 0.6
              s.ellipse(sx, sy, base * factor, base * factor)
            }
            // draw DNA layers as concentric colored rings
            if (o.dna_layers && o.dna_layers.length) {
              const layers = o.dna_layers.slice().reverse()
              for (let li = 0; li < layers.length; li++) {
                const r = (o.size || 1) * (24 + li * 6)
                s.fill(layers[li] || '#ffffff')
                s.ellipse(sx, sy, r, r)
              }
            }
            // metaball - base filled by state color
            s.fill(sc[0], sc[1], sc[2], stateAlpha)
            s.ellipse(sx, sy, (o.size || 1) * 18, (o.size || 1) * 18)
            // simple eye with state-based shape
            s.fill(10)
            const eyeState = o.state || 'normal'
            if (eyeState === 'alert') {
              s.ellipse(sx + 4, sy - 4, 4, 8)
            } else if (eyeState === 'sleep') {
              s.arc(sx + 4, sy - 3, 6, 6, 0, Math.PI)
            } else {
              // normal
              s.ellipse(sx + 4, sy - 4, 3, 3)
            }
            // draw energy bar above organism (inside loop so 'o', 'sx', 'sy' are defined)
            if (typeof o.energy === 'number') {
              const bw = 36
              const bh = 6
              const ex = sx - bw/2
              const ey = sy - (o.size || 1) * 12 - 12
              s.noStroke()
              s.fill(0, 0, 0, 200)
              s.rect(ex - 1, ey - 1, bw + 2, bh + 2, 3)
              s.fill(30, 200, 100)
              // clamp helper may not be defined globally; implement inline
              const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
              s.rect(ex, ey, clamp((o.energy || 0) * bw, 0, bw), bh, 2)
            }
          }

          // draw touches as heat pulses
          const now = Date.now()
          for (let i = touches.length-1; i >= 0; i--) {
            const t = touches[i]
            const age = (now - t.createdAt) / 1000
            const life = 3.0
            if (age > life) { touches.splice(i,1); continue }
            const alpha = 200 * (1 - age / life) * t.amplitude
            s.fill(255, 60, 30, alpha)
            s.ellipse(t.x, t.y, 200 * (1 - age / life), 200 * (1 - age / life))
          }
        } catch (err) {
          // prevent full app crash on render-time errors
          // log and continue (next frame may recover)
          // use console.error to preserve source mapping in browser
          console.error('Render loop error', err)
          try { s.background(12, 18, 24) } catch(e){}
        }
        }
          // selected panel
          if (selected) {
            s.push()
            s.fill(20, 30, 40, 220)
            s.rect(18, s.height - 120, 260, 100, 8)
            s.fill(255)
            s.textSize(13)
            s.text(`id: ${selected.id}`, 26, s.height - 96)
            s.text(`size: ${selected.size.toFixed(2)} energy: ${selected.energy.toFixed(2)}`, 26, s.height - 76)
            s.text(`traits: cohesion ${selected.traits?.cohesion?.toFixed(2) || '-'} escape ${selected.traits?.escape?.toFixed(2) || '-'}`, 26, s.height - 56)
            s.pop()
          }
        // add mouse click handler to send touch event → also send to server
        s.mousePressed = () => {
          if (!socketRef.current) return
          const backUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
          const worldX = (s.mouseX / s.width) * 2000
          const worldY = (s.mouseY / s.height) * 2000
          fetch(`${backUrl}/touch`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: worldX, y: worldY })
          }).catch(console.error)
        }
      }, canvasRef.current)
      }

    initP5()

    return () => {
      if (socketRef.current) socketRef.current.disconnect()
      if (p5Instance) p5Instance.remove()
    }
  }, [wsUrl])

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 1000, display: 'flex', gap: 8 }}>
          <button onClick={() => setShowFood(s => !s)} style={{ padding: '8px 10px', borderRadius: 6 }}>{showFood ? 'Hide Food' : 'Show Food'}</button>
          <button onClick={() => setSmoothMetaballs(s => !s)} style={{ padding: '8px 10px', borderRadius: 6 }}>{smoothMetaballs ? 'Circle Mode' : 'Smooth Mode'}</button>
        </div>
      </div>
    )
}
