import React, { useEffect, useRef } from 'react'
import io from 'socket.io-client'
import anime from 'animejs/lib/anime.es.js'

export default function P5Canvas({ wsUrl }) {
  const canvasRef = useRef(null)
  const socketRef = useRef(null)

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
          // used for visual pulse; we don't use yet besides storing
          // could add animation when received
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

        s.mouseClicked = () => {
          const api = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
          const wx = (s.mouseX / s.width) * 2000
          const wy = (s.mouseY / s.height) * 2000
          fetch(`${api}/touch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: wx, y: wy }) })
            .then(r => r.json()).then(d => console.log('touch', d)).catch(e=>console.error(e))
        }

        s.draw = () => {
          s.background(12, 18, 24)
          // draw organisms
          for (const o of organisms) {
            const x = (o.position && o.position.x) || 0
            const y = (o.position && o.position.y) || 0
            // world coords -> screen: simple wrap and scale
            const sx = (x / 2000) * s.width
            const sy = (y / 2000) * s.height
            s.fill(200, 150, 220, 180)
            const scale = o._scale || 1
            s.ellipse(sx, sy, (o.size || 1) * 24 * scale, (o.size || 1) * 24 * scale)
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
            // simple eye
            s.fill(10)
            s.ellipse(sx + 4, sy - 4, 3, 3)
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
