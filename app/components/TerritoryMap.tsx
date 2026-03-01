'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import OpinionCard from './OpinionCard'

interface CitationTarget {
  id: string
  summary: string
  detail: string | null
  type: 'WHY' | 'WHY_NOT'
  author: {
    username: string
  }
  faction: {
    name: string
    topic: {
      title: string
    }
  }
}

interface Opinion {
  id: string
  summary: string
  detail: string | null
  type: 'WHY' | 'WHY_NOT'
  authorId: string
  author: {
    username: string
  }
  createdAt: Date
  citations: {
    id: string
    target: CitationTarget
  }[]
  citedBy: {
    id: string
    source: {
      id: string
      summary: string
      type: 'WHY' | 'WHY_NOT'
      author: { username: string }
    }
  }[]
  factionId: string
}

interface TerritoryMapProps {
  opinions: Opinion[]
  type: 'WHY' | 'WHY_NOT'
  factionId: string
  currentUser: any
  isPrivateTopic?: boolean
  className?: string
}

// Helper to calculate grid span based on content length (Logarithmic)
const getGridSpan = (summary: string, detail: string | null) => {
  const totalLength = summary.length + (detail?.length || 0)
  
  // Logarithmic scale for area
  // < 50 chars -> 1x1
  // < 200 chars -> 2x2
  // < 500 chars -> 3x3
  // > 500 chars -> 4x4
  
  if (totalLength < 50) return { row: 1, col: 1 }
  if (totalLength < 200) return { row: 2, col: 2 }
  if (totalLength < 500) return { row: 3, col: 3 }
  return { row: 4, col: 4 }
}

// Helper to calculate opacity based on time (Linear)
const getOpacity = (createdAt: Date | string) => {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  // Diff in days
  const diffDays = (now - created) / (1000 * 60 * 60 * 24)
  
  // Linear decay: Newest = 1.0, Oldest (e.g. 30 days) = 0.4
  const maxAgeDays = 30 
  
  if (diffDays <= 0) return 1
  
  // Linear interpolation
  // opacity = 1 - (age / maxAge) * 0.6
  // If age > maxAge, opacity stays at 0.4
  const opacity = 1 - Math.min(diffDays / maxAgeDays, 1) * 0.6
  
  return parseFloat(opacity.toFixed(2))
}

export default function TerritoryMap({
  opinions,
  type,
  factionId,
  currentUser,
  isPrivateTopic,
  className = ''
}: TerritoryMapProps) {
  // Continuous Zoom: 0.5 (Macro) to 3.0 (Micro)
  // Adaptive Density: Initial zoom depends on opinion count
  // < 5 opinions -> start at 2.5 (Large)
  // < 20 opinions -> start at 1.5 (Medium)
  // > 20 opinions -> start at 1.0 (Small)
  const initialZoom = useMemo(() => {
    const count = opinions.length
    if (count < 5) return 2.5
    if (count < 20) return 1.5
    return 1.0
  }, [opinions.length])

  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update zoom if initialZoom changes drastically (e.g. first load)
  useEffect(() => {
    setZoomLevel(initialZoom)
  }, [initialZoom])

  // Handle wheel zoom with Ctrl key (Continuous)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY * -0.002 // Sensitivity
        setZoomLevel(prev => {
          const next = prev + delta
          return Math.min(Math.max(next, 0.5), 3.0)
        })
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoomLevel(parseFloat(e.target.value))
  }

  // Calculate Spiral Layout
  // Returns map of opinion.id -> { x, y, w, h }
  const layout = useMemo(() => {
    // 1. Sort opinions by createdAt descending (Newest first)
    // Note: If updatedAt is available in the future, use it here.
    const sortedOpinions = [...opinions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // 2. Spiral Grid Packing
    // We use a virtual grid where 1 unit = 1x1 block
    const occupied = new Set<string>() // format "x,y"
    const itemPositions = new Map<string, { x: number, y: number, w: number, h: number }>()
    
    // Check if a rectangle fits at (x, y)
    const checkFit = (x: number, y: number, w: number, h: number) => {
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          if (occupied.has(`${x + i},${y + j}`)) return false
        }
      }
      return true
    }

    // Mark rectangle as occupied
    const markOccupied = (x: number, y: number, w: number, h: number) => {
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          occupied.add(`${x + i},${y + j}`)
        }
      }
    }

    // Spiral traversal generator
    // Generates coordinates (x, y) spiraling out from (0, 0)
    function* spiralGenerator() {
      let x = 0
      let y = 0
      let dx = 0
      let dy = -1
      
      // Start at 0,0
      yield { x, y }

      for (let i = 0; i < 10000; i++) { // Safety limit
        // Logic for spiral steps
        // -1 < x <= 1, -1 < y <= 1 -> Shell 1
        if (-x === y || (x < 0 && x === -y) || (x > 0 && x === 1-y)) {
          // Change direction
          const temp = dx
          dx = -dy
          dy = temp
        }
        x += dx
        y += dy
        yield { x, y }
      }
    }

    // Place each item
    sortedOpinions.forEach(opinion => {
      const span = getGridSpan(opinion.summary, opinion.detail)
      const w = span.col
      const h = span.row
      
      const spiral = spiralGenerator()
      
      // Find first available spot
      for (let pos of spiral) {
        // We try to place the top-left corner at pos.x, pos.y
        // To make it more "centered", we might want to offset based on size, 
        // but simple top-left spiral works well enough for packing.
        if (checkFit(pos.x, pos.y, w, h)) {
          markOccupied(pos.x, pos.y, w, h)
          itemPositions.set(opinion.id, { x: pos.x, y: pos.y, w, h })
          break
        }
      }
    })

    return itemPositions
  }, [opinions])

  // Pan State
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click and not on interactive elements if needed
    setIsDragging(true)
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // Recalculate grid styles for Absolute Positioning
  const baseSize = Math.max(20, zoomLevel * 100)
  const gap = Math.max(2, zoomLevel * 4)
  const unitSize = baseSize + gap

  const baseColor = type === 'WHY' ? 'bg-green-500' : 'bg-red-500'
  const borderColor = type === 'WHY' ? 'border-green-100' : 'border-red-100'
  const emptyPatternColor = type === 'WHY' ? '#f0fdf4' : '#fef2f2' // green-50 / red-50

  return (
    <div className={`flex flex-col h-full relative group overflow-hidden select-none cursor-grab active:cursor-grabbing ${className}`}>
      {/* Zoom Slider Control */}
      <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-white/90 backdrop-blur shadow-sm rounded-full border border-gray-200 px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-[10px] text-gray-500 font-mono">Zoom</span>
        <input 
          type="range" 
          min="0.5" 
          max="3.0" 
          step="0.1" 
          value={zoomLevel} 
          onChange={handleZoomChange}
          className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600"
        />
        <button 
          onClick={() => setPan({x:0, y:0})} // Reset View
          className="text-xs text-blue-500 hover:text-blue-700 ml-2"
          title="Center Map"
        >
          ⌖
        </button>
      </div>

      {/* The Infinite Canvas */}
      <div 
        ref={containerRef}
        className="w-full h-full relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          backgroundColor: '#fff',
          backgroundImage: `
            linear-gradient(to right, ${emptyPatternColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${emptyPatternColor} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        {/* Transform Layer */}
        <div 
          className="absolute left-1/2 top-1/2 w-0 h-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`
          }}
        >
          {opinions.map(opinion => {
            const pos = layout.get(opinion.id)
            if (!pos) return null

            const ageOpacity = getOpacity(opinion.createdAt)
            const isUserOwn = currentUser && opinion.authorId === currentUser.id
            
            const showSummary = zoomLevel >= 0.8
            const showDetail = zoomLevel >= 1.8
            
            const fontSize = Math.max(10, zoomLevel * 8) + 'px'

            // Calculate absolute position
            // Center the coordinate system: x * unitSize
            const left = pos.x * unitSize
            const top = pos.y * unitSize
            const width = pos.w * unitSize - gap
            const height = pos.h * unitSize - gap

            return (
              <div 
                key={opinion.id}
                style={{
                  position: 'absolute',
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  opacity: !showSummary ? ageOpacity : 1,
                  // Transition for smooth zoom/pan? Maybe too heavy for pan. 
                  // Only transition dimensions and opacity.
                  transition: 'width 0.2s, height 0.2s, left 0.2s, top 0.2s, opacity 0.3s'
                }}
                className={`
                  bg-white shadow-sm overflow-hidden
                  hover:z-10 hover:shadow-md hover:opacity-100
                  ${!showSummary ? 'rounded-[1px]' : 'rounded-sm'}
                  ${isUserOwn ? 'ring-2 ring-blue-500/50 z-10' : `border ${borderColor}`}
                  ${!showSummary ? baseColor : ''}
                  ${showDetail ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100' : ''}
                `}
                // Prevent drag propagation when interacting with card content
                onMouseDown={e => e.stopPropagation()} 
              >
                {/* Content Rendering (Same as before) */}
                {showSummary && (
                  <div 
                    className="absolute inset-0 pointer-events-none bg-white mix-blend-hard-light"
                    style={{ opacity: 1 - ageOpacity }}
                  />
                )}

                {!showSummary && (
                   <div title={`${opinion.summary} (${new Date(opinion.createdAt).toLocaleDateString()})`} className="w-full h-full" />
                )}

                {showSummary && !showDetail && (
                  <div className="h-full flex flex-col p-2 pointer-events-none"> {/* Disable pointer events for smooth drag */}
                    <div className="flex items-center gap-1 mb-1 opacity-60">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      <span className="font-mono truncate text-gray-500" style={{ fontSize: '0.7em' }}>
                        {opinion.author.username}
                      </span>
                    </div>
                    <p 
                      className="font-medium leading-tight line-clamp-4 break-words text-gray-800"
                      style={{ fontSize: fontSize }}
                    >
                      {opinion.summary}
                    </p>
                  </div>
                )}

                {showDetail && (
                  <div className="h-full w-full">
                    <OpinionCard
                      opinion={opinion}
                      factionId={factionId}
                      type={type}
                      currentUser={currentUser}
                      isPrivateTopic={isPrivateTopic}
                    />
                  </div>
                )}
              </div>
            )
          })}
          
          {opinions.length === 0 && (
            <div className="absolute transform -translate-x-1/2 -translate-y-1/2 w-64 text-center text-gray-300 italic">
              <span className="text-4xl mb-4 block opacity-20">{type === 'WHY' ? '🌱' : '🛡️'}</span>
              <span>Unclaimed Territory</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
