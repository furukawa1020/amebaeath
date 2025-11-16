import React, { useEffect, useRef } from 'react'
import io from 'socket.io-client'

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

        socketRef.current = io(wsUrl)
        socketRef.current.on('init', (data) => {
          organisms = data.organisms || []
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
          })
        })

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
