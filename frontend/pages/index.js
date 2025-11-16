import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const P5Canvas = dynamic(() => import('../components/P5Canvas'), { ssr: false })

export default function Home() {
  const [wsUrl, setWsUrl] = useState(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001')
  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <P5Canvas wsUrl={wsUrl} />
    </div>
  )
}
