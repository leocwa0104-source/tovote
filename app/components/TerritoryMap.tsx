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
    // Formula: Units = Base + Multiplier * log2(Length)
    // Let's use a micro-grid unit count directly.
    const unitsNeeded = Math.ceil(Math.log2(Math.max(10, totalLength)) * 8)
    
    // Force Square Shape
    const side = Math.ceil(Math.sqrt(unitsNeeded))
    
    return { row: side, col: side }
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

  // State Ref to access current values in Event Listeners without re-binding
  const stateRef = useRef({ zoom: zoomLevel, pan, bounds })
  useEffect(() => {
    stateRef.current = { zoom: zoomLevel, pan, bounds }
  }, [zoomLevel, pan, bounds])

  // Helper for Unit Size (Linear Scaling)
  // 1 Unit = 14px at Zoom 1.0 (Increased from 12px for better text fit)
  const getUnitSize = (zoom: number) => zoom * 14

  // Helper to Clamp Pan
  const clampPan = (currentPan: {x: number, y: number}, currentZoom: number, currentBounds: {minX: number, maxX: number, minY: number, maxY: number}) => {
    const containerW = containerRef.current?.clientWidth || window.innerWidth
    const containerH = containerRef.current?.clientHeight || window.innerHeight
    
    const unitSize = getUnitSize(currentZoom)
    const contentW = (currentBounds.maxX - currentBounds.minX) * unitSize
    const contentH = (currentBounds.maxY - currentBounds.minY) * unitSize
    
    // Center Offset Correction
    const centerX = (currentBounds.minX + currentBounds.maxX) / 2 * unitSize
    const centerY = (currentBounds.minY + currentBounds.maxY) / 2 * unitSize
    
    const effectiveX = currentPan.x + centerX
    const effectiveY = currentPan.y + centerY
    
    let nextX = currentPan.x
    let nextY = currentPan.y

    // X Axis Clamping
    if (contentW > containerW) {
      const limitX = (contentW - containerW) / 2
      if (effectiveX > limitX) nextX = limitX - centerX
      if (effectiveX < -limitX) nextX = -limitX - centerX
    } else {
      // Lock to center if smaller
      nextX = -centerX
    }
    
    // Y Axis Clamping
    if (contentH > containerH) {
      const limitY = (contentH - containerH) / 2
      if (effectiveY > limitY) nextY = limitY - centerY
      if (effectiveY < -limitY) nextY = -limitY - centerY
    } else {
      nextY = -centerY
    }

    return { x: nextX, y: nextY }
  }

  // Handle wheel zoom with Ctrl key (Continuous)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const { zoom: currentZoom, pan: currentPan, bounds: currentBounds } = stateRef.current
        
        const delta = e.deltaY * -0.002 // Sensitivity
        const nextZoom = Math.min(Math.max(currentZoom + delta, 0.1), 3.0)
        
        // Scale Pan to maintain center focus
        // newPan = oldPan * (newZoom / oldZoom)
        const scaleRatio = nextZoom / currentZoom
        const scaledPan = {
          x: currentPan.x * scaleRatio,
          y: currentPan.y * scaleRatio
        }

        // Apply Clamping to the new scaled pan
        const finalPan = clampPan(scaledPan, nextZoom, currentBounds)

        setZoomLevel(nextZoom)
        setPan(finalPan)
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextZoom = parseFloat(e.target.value)
    const { zoom: currentZoom, pan: currentPan, bounds: currentBounds } = stateRef.current
    
    const scaleRatio = nextZoom / currentZoom
    const scaledPan = {
      x: currentPan.x * scaleRatio,
      y: currentPan.y * scaleRatio
    }
    
    const finalPan = clampPan(scaledPan, nextZoom, currentBounds)
    
    setZoomLevel(nextZoom)
    setPan(finalPan)
  }

  // Calculate Spiral Layout
  // Returns map of opinion.id -> { x, y, w, h }
  // And the bounding box of the entire layout { minX, maxX, minY, maxY }
  const { layout, bounds } = useMemo(() => {
    // 1. Sort opinions by createdAt descending (Newest first)
    const sortedOpinions = [...opinions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // 2. Spiral Grid Packing
    // We use a virtual grid where 1 unit = 1x1 block
    const occupied = new Set<string>() // format "x,y"
    const itemPositions = new Map<string, { x: number, y: number, w: number, h: number }>()
    
    let minX = 0, maxX = 0, minY = 0, maxY = 0

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
      // Update bounds
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x + w)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y + h)
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

      for (let i = 0; i < 50000; i++) { // Safety limit increased for micro-grid
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
        if (checkFit(pos.x, pos.y, w, h)) {
          markOccupied(pos.x, pos.y, w, h)
          itemPositions.set(opinion.id, { x: pos.x, y: pos.y, w, h })
          break
        }
      }
    })

    return { layout: itemPositions, bounds: { minX, maxX, minY, maxY } }
  }, [opinions])

  // Pan State
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  // Auto-fit Logic: Calculate initial Zoom and Pan to center content
  useEffect(() => {
    if (layout.size === 0) return

    // Calculate content dimensions in Grid Units
    const contentWidthUnits = bounds.maxX - bounds.minX
    const contentHeightUnits = bounds.maxY - bounds.minY
    
    // Get container dimensions
    const containerW = containerRef.current?.clientWidth || window.innerWidth
    const containerH = containerRef.current?.clientHeight || window.innerHeight

    // Target: Fit content within 80% of container
    // contentPx = contentUnits * (zoom * 12)
    // zoom = (container * 0.8) / (contentUnits * 12)
    
    const zoomW = (containerW * 0.8) / (Math.max(contentWidthUnits, 1) * 12)
    const zoomH = (containerH * 0.8) / (Math.max(contentHeightUnits, 1) * 12)
    
    // Use the smaller zoom to fit both dimensions
    // Clamp min zoom to 0.1 to prevent microscopic bugs, max 3.0
    const bestZoom = Math.min(Math.max(Math.min(zoomW, zoomH), 0.1), 3.0)
    
    setZoomLevel(bestZoom)

    // Center the content
    // Center of BB in grid units:
    const centerXUnits = (bounds.minX + bounds.maxX) / 2
    const centerYUnits = (bounds.minY + bounds.maxY) / 2
    
    // Center of BB in pixels (relative to origin):
    const unitSize = getUnitSize(bestZoom)
    const centerPxX = centerXUnits * unitSize
    const centerPxY = centerYUnits * unitSize
    
    setPan({ x: -centerPxX, y: -centerPxY })

  }, [layout, bounds])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click and not on interactive elements if needed
    setIsDragging(true)
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    
    // Calculate deltas
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    
    // Calculate new pan without clamping
    const nextPan = {
      x: pan.x + dx,
      y: pan.y + dy
    }
    
    // Apply clamping using shared helper
    const finalPan = clampPan(nextPan, zoomLevel, bounds)
    
    setPan(finalPan)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // Recalculate grid styles for Absolute Positioning
  const unitSize = getUnitSize(zoomLevel)
  // Visual Gap is now part of the padding inside the block, not grid spacing
  // We keep grid tight (gap=0 in layout logic) but use padding for separation.
  const visualGap = 1 // Fixed 1px gap for sharpness

  const baseColor = type === 'WHY' ? 'bg-green-500' : 'bg-red-500'
  const borderColor = type === 'WHY' ? 'border-green-100' : 'border-red-100'

  // Font size: slightly smaller than unit size to fit
  const fontSize = Math.max(4, zoomLevel * 9) // 9px font on 14px grid unit (fit better)

  return (
    <div className={`flex flex-col h-full relative group overflow-hidden select-none cursor-grab active:cursor-grabbing ${className}`}>
      {/* Zoom Slider Control */}
      <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-white/90 backdrop-blur shadow-sm rounded-full border border-gray-200 px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-[10px] text-gray-500 font-mono">Zoom</span>
        <input 
          type="range" 
          min="0.1" 
          max="3.0" 
          step="0.1" 
          value={zoomLevel} 
          onChange={handleZoomChange}
          className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600"
        />
        <button 
          onClick={() => {
            const unitSize = getUnitSize(zoomLevel)
            const centerX = (bounds.minX + bounds.maxX) / 2 * unitSize
            const centerY = (bounds.minY + bounds.maxY) / 2 * unitSize
            setPan({ x: -centerX, y: -centerY })
          }} 
          className="text-xs text-blue-500 hover:text-blue-700 ml-2"
          title="Center Map"
        >
          ⌖
        </button>
      </div>

      {/* The Infinite Canvas (Now Bounded Visuals) */}
      <div 
        ref={containerRef}
        className="w-full h-full relative bg-gray-100" // Gray background for "Void"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <div 
          className="absolute top-1/2 left-1/2 will-change-transform bg-white shadow-2xl" // White background for "Map"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`, 
            left: 0, top: 0, 
            width: 0, height: 0, 
            overflow: 'visible'
          }}
        >
          {/* Visual Background for the Map Area */}
          <div 
            className="absolute bg-white shadow-xl"
            style={{
              left: bounds.minX * unitSize,
              top: bounds.minY * unitSize,
              width: (bounds.maxX - bounds.minX) * unitSize,
              height: (bounds.maxY - bounds.minY) * unitSize,
              zIndex: -1
            }}
          />

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
                    style={{ fontSize: `${Math.max(4, fontSize * 0.6)}px` }}
                  >
                    @{opinion.author.username}
                  </div>

                  {/* Summary (Bold) */}
                  <div 
                    className="font-bold text-gray-800 break-words whitespace-pre-wrap leading-tight"
                    style={{ 
                      fontSize: `${fontSize}px`,
                    }}
                  >
                    {opinion.summary}
                  </div>
                  
                  {/* Detail Preview (First 20 chars) */}
                  {detailPreview && (
                    <div 
                      className="mt-0.5 text-gray-600 break-words whitespace-pre-wrap leading-tight"
                      style={{ 
                        fontSize: `${Math.max(4, fontSize * 0.9)}px`
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
