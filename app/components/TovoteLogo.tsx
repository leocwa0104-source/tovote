'use client'
import React, { useRef, useState } from 'react'

type Props = {
  className?: string
}

export default function TovoteLogo({ className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const leftEyeRef = useRef<HTMLDivElement | null>(null)
  const rightEyeRef = useRef<HTMLDivElement | null>(null)
  const [[lx, ly], setL] = useState<[number, number]>([0, 0])
  const [[rx, ry], setR] = useState<[number, number]>([0, 0])

  const onMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const update = (eyeEl: HTMLDivElement | null, set: (v: [number, number]) => void) => {
      if (!eyeEl) return
      const rect = eyeEl.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const max = Math.max(2, Math.min(4, rect.width * 0.18))
      const mag = Math.hypot(dx, dy) || 1
      const scale = Math.min(1, max / mag)
      set([dx * scale, dy * scale])
    }
    update(leftEyeRef.current, setL)
    update(rightEyeRef.current, setR)
  }
  const onLeave: React.MouseEventHandler<HTMLDivElement> = () => {
    setL([0, 0])
    setR([0, 0])
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`inline-flex items-center justify-center relative leading-none ${className ?? ''}`}
      style={{ color: 'rgb(31 41 55)', height: '1.2em' }}
      aria-label="ToVote"
      title="ToVote"
    >
      {/* Unified SVG for connected lines */}
      <svg
        viewBox="0 0 60 16"
        height="100%"
        width="auto"
        style={{
          overflow: 'visible',
          stroke: 'currentColor',
          strokeWidth: '1.5',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fill: 'none',
        }}
      >
        {/* T -> o connection */}
        {/* T body: (6,15) to (6,5) */}
        {/* T arm: (2,5) -> (6,1) -> (10,5) */}
        {/* Connection: T body (6,15) curves to o (15,8) */}
        <path d="M 2 5 C 2 3, 4 1, 6 1 C 8 1, 10 3, 10 5" /> {/* T Top */}
        <path d="M 6 5 L 6 14 Q 6 15 10 15 L 12 15" /> {/* T Body connecting to next */}

        {/* v -> o connection */}
        {/* v starts from left eye bottom, goes down, up to right eye bottom */}
        <path d="M 18 10 Q 24 15 30 10" />

        {/* t -> e connection */}
        {/* t body: (42,2) -> (42,12) -> hook */}
        {/* t arm: (40,6) -> (46,6) */}
        <path d="M 42 2 L 42 12 Q 42 15 45 15 L 47 15" /> {/* t body */}
        <path d="M 40 6 L 46 6" /> {/* t arm */}

        {/* e (The Scroll/Ticket) */}
        {/* e starts from t's connection or arm? Let's make t hold it */}
        {/* e shape: (48, 5) ... */}
        <g transform="translate(48, 5)">
           <path d="M 2 5 L 8 5 C 9 5, 9 2, 5 2 C 2 2, 1 5, 1 8 C 1 11, 4 12, 7 11" />
        </g>
      </svg>

      {/* Eyes positioned absolutely over the SVG */}
      <div style={{ position: 'absolute', left: '11.5%', top: '35%', width: '12%', height: '50%' }}>
          <Eye refEl={leftEyeRef} dx={lx} dy={ly} />
      </div>
      <div style={{ position: 'absolute', left: '31.5%', top: '35%', width: '12%', height: '50%' }}>
          <Eye refEl={rightEyeRef} dx={rx} dy={ry} />
      </div>

    </div>
  )
}

function Eye({
  refEl,
  dx,
  dy,
}: {
  refEl: React.MutableRefObject<HTMLDivElement | null>
  dx: number
  dy: number
}) {
  return (
    <div
      ref={(el) => (refEl.current = el)}
      className="relative inline-flex items-center justify-center w-full h-full"
      style={{
        borderRadius: '50%',
        border: '0.15em solid currentColor',
        backgroundColor: 'white', // Opaque background
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '0.2em',
          height: '0.2em',
          borderRadius: '50%',
          background: 'currentColor',
          transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`,
          transition: 'transform 120ms ease-out',
        }}
      />
    </div>
  )
}
