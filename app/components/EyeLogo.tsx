"use client"

import { useEffect, useRef, useState } from 'react'

export default function EyeLogo() {
  const eyesRef = useRef<HTMLDivElement>(null)
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyesRef.current) return

      const rect = eyesRef.current.getBoundingClientRect()
      // Calculate center of the eyes group
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = e.clientX - centerX
      const deltaY = e.clientY - centerY
      
      const angle = Math.atan2(deltaY, deltaX)
      
      // Limit the pupil movement radius
      const maxRadius = 3 
      const x = Math.cos(angle) * maxRadius
      const y = Math.sin(angle) * maxRadius

      setPupilOffset({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="flex items-center gap-1 cursor-pointer select-none group">
      {/* Eyes Container */}
      <div ref={eyesRef} className="flex items-center gap-1">
        {/* Left Eye */}
        <div className="w-5 h-5 border-2 border-gray-800 rounded-md bg-white overflow-hidden relative">
          <div 
            className="w-2 h-2 bg-gray-800 rounded-full absolute top-1/2 left-1/2"
            style={{
              transform: `translate(-50%, -50%) translate(${pupilOffset.x}px, ${pupilOffset.y}px)`
            }}
          />
        </div>
        
        {/* Right Eye */}
        <div className="w-5 h-5 border-2 border-gray-800 rounded-md bg-white overflow-hidden relative">
          <div 
            className="w-2 h-2 bg-gray-800 rounded-full absolute top-1/2 left-1/2"
            style={{
              transform: `translate(-50%, -50%) translate(${pupilOffset.x}px, ${pupilOffset.y}px)`
            }}
          />
        </div>
      </div>
      
      {/* Text */}
      <span className="font-bold text-lg text-gray-800 tracking-tight ml-1 group-hover:text-gray-600 transition-colors">
        ToVote
      </span>
    </div>
  )
}
