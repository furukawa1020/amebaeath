import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import anime from 'animejs/lib/anime.es.js'

export default function P5Canvas({ wsUrl }) {
  const canvasRef = useRef(null)
  const socketRef = useRef(null)
  const [showFood, setShowFood] = useState(false)

  useEffect(() => {
    let p5Instance = null
    let p5 = null
    (async () => {
      p5 = (await import('p5')).default
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

        socketRef.current = io(wsUrl)
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
            } else {
              organisms.push({ id: u.id, position: u.position, size: u.size })
            }
            // animate breathing using anime.js on update
            const target = organisms.find(x => x.id === u.id)
            if (target) {
              anime.remove(target)
              anime({ targets: target, _scale: [1.0, 1.06, 1.0], duration: 900, easing: 'easeInOutSine' })
            }
          })
        })
        socketRef.current.on('spawn', (payload) => {
          const o = payload.organism
          if (!o) return
          organisms.push(o)
          o._scale = 1
          anime({ targets: o, _scale: [0.4, 1.0], duration: 700, easing: 'easeOutBack' })
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

  s.draw = () => {
          s.background(12, 18, 24)
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
          if (showFood && maps && maps.foodMap) {
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
            // amd metaball - blend circles
            s.fill(200, 150, 220, 200)
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
    })()

    return () => {
      if (socketRef.current) socketRef.current.disconnect()
      if (p5Instance) p5Instance.remove()
    }
  }, [wsUrl])

  return <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
