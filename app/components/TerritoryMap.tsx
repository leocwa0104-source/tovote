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
  // Zoom Level: 0 (Macro), 1 (Meso), 2 (Micro)
  // Default to 1 (Readable summaries)
  const [zoomLevel, setZoomLevel] = useState<0 | 1 | 2>(1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle wheel zoom with Ctrl key
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          // Zoom In
          setZoomLevel(prev => Math.min(prev + 1, 2) as 0 | 1 | 2)
        } else {
          // Zoom Out
          setZoomLevel(prev => Math.max(prev - 1, 0) as 0 | 1 | 2)
        }
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 1, 2) as 0 | 1 | 2)
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 1, 0) as 0 | 1 | 2)

  // Grid configuration based on Zoom Level
  const gridConfig = useMemo(() => {
    switch (zoomLevel) {
      case 0: // Macro: Tiny blocks, dense
        return {
          className: 'grid-cols-[repeat(auto-fill,minmax(20px,1fr))] gap-0.5',
          cellPadding: 'p-0',
          showText: false
        }
      case 1: // Meso: Cards with summary
        return {
          className: 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2',
          cellPadding: 'p-2',
          showText: true
        }
      case 2: // Micro: Full detail
        return {
          className: 'grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4',
          cellPadding: 'p-0', // OpinionCard has its own padding
          showText: true
        }
    }
  }, [zoomLevel])

  const baseColor = type === 'WHY' ? 'bg-green-500' : 'bg-red-500'
  const borderColor = type === 'WHY' ? 'border-green-100' : 'border-red-100'

  return (
    <div className={`flex flex-col h-full relative group ${className}`}>
      {/* Map Controls (Visible on hover) */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 bg-white/90 backdrop-blur shadow-sm rounded border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button 
          onClick={zoomIn} 
          disabled={zoomLevel === 2}
          className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 text-gray-600 disabled:opacity-30" 
          title="Zoom In (Ctrl+Wheel)"
        >
          +
        </button>
        <div className="h-px bg-gray-200 w-full"></div>
        <button 
          onClick={zoomOut} 
          disabled={zoomLevel === 0}
          className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 text-gray-600 disabled:opacity-30" 
          title="Zoom Out (Ctrl+Wheel)"
        >
          -
        </button>
      </div>

      {/* The Map Grid */}
      <div 
        ref={containerRef}
        className={`
          flex-grow overflow-y-auto p-4 transition-all duration-500 ease-in-out
          grid ${gridConfig.className} grid-flow-dense auto-rows-min content-start
        `}
      >
        {opinions.map(opinion => {
          const span = getGridSpan(opinion.summary, opinion.detail)
          const opacity = getOpacity(opinion.createdAt)
          const isUserOwn = currentUser && opinion.authorId === currentUser.id
          
          // Dynamic Style
          const style: React.CSSProperties = {
            gridColumn: `span ${span.col}`,
            gridRow: `span ${span.row}`,
            opacity: zoomLevel === 0 ? opacity : 1, // Only use opacity for aging in Macro view? Or always?
            // User asked for "Time -> Style (Simple/Minimalist)". 
            // "Latest -> Solid, Old -> Faded".
            // Let's apply opacity to the BORDER or TEXT in detailed views, 
            // but for the block itself in macro view.
          }
          
          // In detailed views (1 & 2), we might want to keep readability high, 
          // so maybe apply opacity to the container background or border instead of the whole thing.
          // But "Opacity = 1 - k * age" was agreed. Let's try applying it to the container.
          // However, reading faded text is hard. 
          // Let's keep opacity high for text, but fade the "presence" (border/shadow/bg).
          
          const ageOpacity = getOpacity(opinion.createdAt)

          return (
            <div 
              key={opinion.id}
              style={{
                ...style,
                opacity: zoomLevel === 0 ? ageOpacity : 1 // In macro, fade the block. In detailed, keep it readable but maybe style borders.
              }}
              className={`
                relative bg-white shadow-sm transition-all duration-300 overflow-hidden
                hover:z-10 hover:scale-[1.02] hover:shadow-md hover:opacity-100
                ${zoomLevel === 0 ? 'rounded-[1px]' : 'rounded-sm'}
                ${isUserOwn ? 'ring-2 ring-blue-500/50 z-10' : `border ${borderColor}`}
                ${zoomLevel === 0 ? baseColor : ''}
              `}
            >
              {/* Visual Aging Overlay for Zoom Level 1 & 2 */}
              {zoomLevel > 0 && (
                <div 
                  className="absolute inset-0 pointer-events-none bg-white mix-blend-hard-light"
                  style={{ opacity: 1 - ageOpacity }}
                />
              )}

              {/* Content based on LOD */}
              {zoomLevel === 0 && (
                 // Just a colored block, opacity handles the age.
                 // Maybe a tooltip?
                 <div title={`${opinion.summary} (${new Date(opinion.createdAt).toLocaleDateString()})`} className="w-full h-full" />
              )}

              {zoomLevel === 1 && (
                <div className={`h-full flex flex-col ${gridConfig.cellPadding}`}>
                  <div className="flex items-center gap-1 mb-1 opacity-60">
                    <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                    <span className="text-[10px] font-mono truncate">{opinion.author.username}</span>
                  </div>
                  <p className="text-xs font-medium leading-tight line-clamp-4 break-words text-gray-800">
                    {opinion.summary}
                  </p>
                  {/* Faded footer for very old posts? */}
                  <div 
                    className="mt-auto pt-1 text-[9px] text-gray-400 font-mono opacity-50"
                  >
                    {new Date(opinion.createdAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                  </div>
                </div>
              )}

              {zoomLevel === 2 && (
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
          <div className="col-span-full h-32 flex flex-col items-center justify-center text-gray-300 italic border-2 border-dashed border-gray-100 rounded-lg m-4">
            <span className="text-2xl mb-2 opacity-20">{type === 'WHY' ? '🌱' : '🛡️'}</span>
            <span>Unclaimed Territory</span>
          </div>
        )}
      </div>
    </div>
  )
}
