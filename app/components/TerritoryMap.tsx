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
// Area scales with log of content length to compress extreme differences
// while preserving relative order.
const getGridSpan = (summary: string, detail: string | null) => {
  const totalLength = summary.length + (detail?.length || 0)
  
  // Logarithmic mapping:
  // We want a minimum size for visibility, and growth that slows down.
  // Base size for very short comments (e.g. 10 chars)
  // Max size for very long comments (e.g. 1000 chars) shouldn't be 100x larger.
  
  // Formula: Units = Base + Multiplier * log2(Length)
  // log2(10) ~ 3.3
  // log2(100) ~ 6.6
  // log2(1000) ~ 10
  // If we want 10 chars -> 4 units (2x2)
  // 1000 chars -> 25 units (5x5)? Or more?
  // Let's try Multiplier = 4.
  // 10 chars -> 4 * 3.3 = 13 units
  // 1000 chars -> 4 * 10 = 40 units (approx 3x size linear dim)
  
  // Let's use a micro-grid unit count directly.
  const unitsNeeded = Math.ceil(Math.log2(Math.max(10, totalLength)) * 8)
  
  // Calculate dimensions to minimize waste
  // We prefer rects with aspect ratio between 1:1 and 3:1 (landscape or portrait)
  
  let bestW = Math.ceil(Math.sqrt(unitsNeeded))
  let bestH = Math.ceil(unitsNeeded / bestW)
  let minWaste = (bestW * bestH) - unitsNeeded
  let bestRatioDiff = Math.abs((bestW / bestH) - 1.5) // Prefer 3:2 landscape slightly

  // Search range: narrow range around square root to keep it efficient
  const sqrt = Math.sqrt(unitsNeeded)
  const minSide = Math.floor(sqrt * 0.5)
  const maxSide = Math.ceil(sqrt * 2.0)

  for (let w = minSide; w <= maxSide; w++) {
    if (w < 1) continue
    const h = Math.ceil(unitsNeeded / w)
    const waste = (w * h) - unitsNeeded
    const ratio = w / h
    
    // Skip extreme ratios (> 4:1 or < 1:4)
    if (ratio > 4 || ratio < 0.25) continue

    // Priority: 1. Minimize Waste, 2. Optimized Aspect Ratio
    if (waste < minWaste) {
      minWaste = waste
      bestW = w
      bestH = h
      bestRatioDiff = Math.abs(ratio - 1.5)
    } else if (waste === minWaste) {
      const currentRatioDiff = Math.abs(ratio - 1.5)
      if (currentRatioDiff < bestRatioDiff) {
        bestW = w
        bestH = h
        bestRatioDiff = currentRatioDiff
      }
    }
  }
  
  return { row: bestH, col: bestW }
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
  // Micro-grid settings:
  // We reduce baseSize significantly because each "unit" is now tiny (2 chars).
  // At zoom 1.0, 1 unit = 10px?
  const baseSize = Math.max(2, zoomLevel * 10) // 10px at zoom 1.0
  const gap = 0 // No gap in micro-grid to allow seamless merging visually? Or tiny gap.
  // Actually we need tiny gap for visual separation if we want blocks.
  // But user said "no large white space".
  // Let's keep a tiny 1px gap but scaled.
  const visualGap = Math.max(0.5, zoomLevel * 1) 
  const unitSize = baseSize + visualGap

  const baseColor = type === 'WHY' ? 'bg-green-500' : 'bg-red-500'
  const borderColor = type === 'WHY' ? 'border-green-100' : 'border-red-100'
  const emptyPatternColor = type === 'WHY' ? '#f0fdf4' : '#fef2f2' // green-50 / red-50

  // Fixed font size scaling only with zoom
  // Base 12px at zoom 1.0
  const fontSize = Math.max(8, 12 * zoomLevel)

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
          // Micro-grid is too small to show grid lines, just white background
          backgroundImage: 'none',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <div 
          className="absolute top-1/2 left-1/2 will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`, // No scale here, size is handled by unitSize
            width: 0, height: 0, // Wrapper is just an anchor
            overflow: 'visible'
          }}
        >
          {Array.from(layout.entries()).map(([id, pos]) => {
            const opinion = opinions.find(o => o.id === id)!
            const opacity = getOpacity(opinion.createdAt)
            const detailPreview = opinion.detail ? opinion.detail.slice(0, 20) + (opinion.detail.length > 20 ? '...' : '') : ''
            
            return (
              <div
                key={id}
                className={`absolute flex flex-col transition-all duration-300 ease-out border shadow-sm hover:shadow-md hover:z-10 ${baseColor} ${borderColor}`}
                style={{
                  left: pos.x * unitSize,
                  top: pos.y * unitSize,
                  width: pos.w * unitSize - visualGap,
                  height: pos.h * unitSize - visualGap,
                  opacity: Math.max(0.2, opacity), // Minimum visibility
                  borderRadius: '0px', // Sharp edges for map feel
                  // Small padding to prevent text hitting borders
                  padding: '2px' 
                }}
              >
                {/* Unified Content Structure */}
                <div className="w-full h-full flex flex-col overflow-hidden">
                  
                  {/* Username Header */}
                  <div 
                    className="text-gray-500 font-mono truncate mb-0.5"
                    style={{ fontSize: `${Math.max(6, fontSize * 0.6)}px` }}
                  >
                    @{opinion.author.username}
                  </div>

                  {/* Summary (Bold) */}
                  <div 
                    className="font-bold text-gray-800 break-words whitespace-pre-wrap leading-tight"
                    style={{ 
                      fontSize: `${fontSize}px`,
                      // Limit lines if box is small? Or just let it overflow hidden?
                      // Let's let overflow hide naturally.
                    }}
                  >
                    {opinion.summary}
                  </div>
                  
                  {/* Detail Preview (First 20 chars) */}
                  {detailPreview && (
                    <div 
                      className="mt-0.5 text-gray-600 break-words whitespace-pre-wrap leading-tight"
                      style={{ 
                        fontSize: `${Math.max(8, fontSize * 0.9)}px`
                      }}
                    >
                      {detailPreview}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
