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
            s.ellipse(sx, sy, (o.size || 1) * 24, (o.size || 1) * 24)
            // simple eye
            s.fill(10)
            s.ellipse(sx + 4, sy - 4, 3, 3)
          }
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
