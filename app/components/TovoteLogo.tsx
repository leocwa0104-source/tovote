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
      className={`inline-flex items-baseline gap-0.5 leading-none ${className ?? ''}`}
      style={{ color: 'rgb(31 41 55)' }}
      aria-label="ToVote"
      title="ToVote"
    >
      <span>T</span>
      <Eye refEl={leftEyeRef} dx={lx} dy={ly} />
      <span>V</span>
      <Eye refEl={rightEyeRef} dx={rx} dy={ry} />
      <span>t</span>
      <span>e</span>
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
      className="relative inline-flex items-center justify-center"
      style={{
        width: '0.6em',
        height: '0.6em',
        borderRadius: '50%',
        border: '0.1em solid currentColor',
        margin: '0 0.02em',
        position: 'relative',
        top: '0.05em',
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
