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
      className={`inline-flex items-center justify-center gap-[0.05em] leading-none ${className ?? ''}`}
      style={{ color: 'rgb(31 41 55)' }}
      aria-label="ToVote"
      title="ToVote"
    >
      <TShape />
      <Eye refEl={leftEyeRef} dx={lx} dy={ly} />
      <VShape />
      <Eye refEl={rightEyeRef} dx={rx} dy={ry} />
      <TeShape />
    </div>
  )
}

function TShape() {
  return (
    <svg
      viewBox="0 0 12 16"
      width="0.75em"
      height="1em"
      className="inline-block"
      style={{
        overflow: 'visible',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
        transform: 'rotate(-5deg)',
        transformOrigin: 'bottom center',
      }}
    >
      {/* T: Body */}
      <path d="M 6 15 L 6 5" />
      {/* T: Raised Arm (Curved up) */}
      <path d="M 2 5 C 2 3, 4 1, 6 1 C 8 1, 10 3, 10 5" />
    </svg>
  )
}

function VShape() {
  return (
    <svg
      viewBox="0 0 12 16"
      width="0.75em"
      height="1em"
      className="inline-block"
      style={{
        overflow: 'visible',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
      }}
    >
      {/* V: Simple Smile / Mouth shape */}
      {/* Starting from top-left, going down to center, up to top-right */}
      <path d="M 2 6 Q 6 14 10 6" />
    </svg>
  )
}

function TeShape() {
  return (
    <svg
      viewBox="0 0 24 16"
      width="1.5em"
      height="1em"
      className="inline-block"
      style={{
        overflow: 'visible',
        stroke: 'currentColor',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
      }}
    >
      {/* Group for t: rotated slightly left */}
      <g transform="rotate(-5, 6, 15)">
        {/* t: Body with hook */}
        <path d="M 6 2 L 6 12 Q 6 15 9 15" strokeWidth="1.5" />
        {/* t: Crossbar/Arm reaching out to hold e */}
        <path d="M 4 6 L 10 6" strokeWidth="1.5" />
      </g>

      {/* e: The Letter 'e' held by t */}
      {/* Positioned to look like it's being held */}
      <g transform="translate(11, 5)">
         {/* e shape: Standard lowercase e but stylized as a scroll/ticket */}
         {/* Start from middle bar, curve up, around, and down */}
         <path d="M 2 5 L 8 5 C 9 5, 9 2, 5 2 C 2 2, 1 5, 1 8 C 1 11, 4 12, 7 11" strokeWidth="1.5" />
      </g>
    </svg>
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
        width: '0.7em',
        height: '0.7em',
        borderRadius: '50%',
        border: '0.1em solid currentColor',
        margin: '0 0.05em',
        // Align visually with the other letters
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
