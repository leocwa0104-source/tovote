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

  // Calculate dynamic grid properties based on zoomLevel
  const gridStyle = useMemo(() => {
    // Base unit size varies linearly with zoom
    // Zoom 0.5 -> 20px
    // Zoom 1.0 -> 100px
    // Zoom 3.0 -> 300px
    const baseSize = Math.max(20, zoomLevel * 100)
    
    // Aggressive Auto-Fit for Sparse Content
    // If we have very few items (< 5) and zoom is high, force them to stretch
    const isSparse = opinions.length > 0 && opinions.length < 5
    const isHighZoom = zoomLevel > 1.5

    return {
      gridTemplateColumns: isSparse && isHighZoom
        ? `repeat(auto-fit, minmax(${baseSize}px, 1fr))` // Force stretch to fill width
        : `repeat(auto-fill, minmax(${baseSize}px, 1fr))`, // Standard grid behavior
      gap: `${Math.max(2, zoomLevel * 4)}px`,
      // Center grid when content is sparse
      justifyContent: 'center',
      alignContent: 'start',
      width: '100%', // Ensure grid takes full width
      maxWidth: isSparse && isHighZoom ? '100%' : 'fit-content', // Center the grid block itself
      margin: '0 auto' // Center horizontally
    }
  }, [zoomLevel, opinions.length])

  const baseColor = type === 'WHY' ? 'bg-green-500' : 'bg-red-500'
  const borderColor = type === 'WHY' ? 'border-green-100' : 'border-red-100'
  const emptyPatternColor = type === 'WHY' ? '#f0fdf4' : '#fef2f2' // green-50 / red-50

  return (
    <div className={`flex flex-col h-full relative group ${className}`}>
      {/* Zoom Slider Control (Visible on hover) */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2 bg-white/90 backdrop-blur shadow-sm rounded-full border border-gray-200 px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
      </div>

      {/* The Map Grid */}
      <div 
        ref={containerRef}
        className="flex-grow overflow-y-auto p-4 transition-all duration-300 ease-out scrollbar-thin scrollbar-thumb-gray-200"
        style={{
          // Background Texture for "Empty Territory" feel
          backgroundImage: `
            linear-gradient(to right, ${emptyPatternColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${emptyPatternColor} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundColor: '#fff' // Base white
        }}
      >
        <div 
          className="grid grid-flow-dense auto-rows-min w-full max-w-full"
          style={gridStyle}
        >
          {opinions.map(opinion => {
            const span = getGridSpan(opinion.summary, opinion.detail)
            const ageOpacity = getOpacity(opinion.createdAt)
            const isUserOwn = currentUser && opinion.authorId === currentUser.id
            
            // LOD Logic
            // Level 0: Just Block (Zoom < 0.8)
            // Level 1: Summary (Zoom 0.8 - 1.8)
            // Level 2: Full Detail (Zoom > 1.8)
            const showSummary = zoomLevel >= 0.8
            const showDetail = zoomLevel >= 1.8
            
            // Dynamic Font Size based on Zoom
            const fontSize = Math.max(10, zoomLevel * 8) + 'px'

            return (
              <div 
                key={opinion.id}
                style={{
                  gridColumn: `span ${span.col}`,
                  gridRow: `span ${span.row}`,
                  opacity: !showSummary ? ageOpacity : 1, // Fade block in macro view
                }}
                className={`
                  relative bg-white shadow-sm transition-all duration-300
                  hover:z-10 hover:scale-[1.02] hover:shadow-md hover:opacity-100
                  ${!showSummary ? 'rounded-[1px]' : 'rounded-sm'}
                  ${isUserOwn ? 'ring-2 ring-blue-500/50 z-10' : `border ${borderColor}`}
                  ${!showSummary ? baseColor : ''}
                  ${showDetail ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100' : 'overflow-hidden'}
                `}
              >
                {/* Visual Aging Overlay */}
                {showSummary && (
                  <div 
                    className="absolute inset-0 pointer-events-none bg-white mix-blend-hard-light"
                    style={{ opacity: 1 - ageOpacity }}
                  />
                )}

                {/* Level 0: Macro Block */}
                {!showSummary && (
                   <div title={`${opinion.summary} (${new Date(opinion.createdAt).toLocaleDateString()})`} className="w-full h-full" />
                )}

                {/* Level 1: Summary Card */}
                {showSummary && !showDetail && (
                  <div className="h-full flex flex-col p-2">
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

                {/* Level 2: Full Detail (OpinionCard) */}
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
            <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-300 italic">
              <span className="text-4xl mb-4 opacity-20">{type === 'WHY' ? '🌱' : '🛡️'}</span>
              <span>Unclaimed Territory</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
