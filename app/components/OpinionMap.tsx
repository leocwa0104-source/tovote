
'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { computeTreemapLayout, TreemapNode } from '../utils/treemap'
import OpinionBlock from './OpinionBlock'

interface MapOpinion {
  id: string
  summary: string
  detail: string | null
  type: 'WHY' | 'WHY_NOT'
  author: { username: string }
  neighborId?: string | null
}

interface OpinionMapProps {
  opinions: MapOpinion[]
  selectedId?: string
  onSelect: (id: string) => void
  currentUser?: { id: string } | null
}

export default function OpinionMap({ opinions, selectedId, onSelect, currentUser }: OpinionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const dragStart = useRef<{ x: number, y: number } | null>(null)
  const mouseDownPos = useRef<{ x: number, y: number } | null>(null)
  const hasDragged = useRef(false)

  useEffect(() => {
    if (selectedId && selectedId !== expandedId) {
       // If selectedId is controlled from outside (e.g. initial load), sync it
       // But we prioritize internal interaction
    }
  }, [selectedId])

  // Reset expanded state when opinions change significantly (e.g. tab switch)
  useEffect(() => {
    setExpandedId(null)
  }, [opinions])

  useEffect(() => {
    if (!containerRef.current) return
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        })
      }
    }

    // Initial measure
    updateDimensions()

    const ro = new ResizeObserver(updateDimensions)
    ro.observe(containerRef.current)
    
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0 || opinions.length === 0) return []
    
    // Use the smaller dimension to create a square layout area that fits
    const size = Math.min(dimensions.width, dimensions.height)
    
    // Transform opinions to TreemapItems
    const items = opinions.map(o => ({
      id: o.id,
      // Fixed value for uniform sizing (modified by structure/nesting)
      value: 100, 
      data: o,
      neighborId: o.neighborId
    }))
    
    return computeTreemapLayout(items, size, size)
  }, [opinions, dimensions])

  // Helper to clamp values
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const zoomSensitivity = 0.001
    const newScale = Math.min(Math.max(transform.scale - e.deltaY * zoomSensitivity, 1), 8) // Increased max zoom for focus mode

    if (newScale === transform.scale) return

    // Calculate zoom origin relative to content
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate new position to keep mouse point stable
    // newX = mouseX - (mouseX - oldX) * (newScale / oldScale)
    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale)
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale)

    setTransform({
      scale: newScale,
      x: newX,
      y: newY
    })
  }

  // Bind wheel event directly to container for better control
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Use passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [transform]) // Re-bind when transform changes to capture latest state

  // Focus on a specific node (Zoom-to-Focus) removed
    // const focusNode = ... 

    // Handle node click to select
    const handleNodeClick = (node: TreemapNode) => {
        if (hasDragged.current) return
        onSelect(node.data.id)
    }

  // Handle click on map background to reset view
  const handleBackgroundClick = () => {
    if (hasDragged.current) return
    // Reset to initial view
    // Calculate center for scale 1
    const size = Math.min(dimensions.width, dimensions.height)
    const newX = (dimensions.width - size) / 2
    const newY = (dimensions.height - size) / 2
    
    setTransform({
      x: newX,
      y: newY,
      scale: 1
    })
    setExpandedId(null)
    onSelect('')
  }


  // Clamping logic applied whenever transform changes or dimensions change
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return

    const size = Math.min(dimensions.width, dimensions.height)
    const contentW = size * transform.scale
    const contentH = size * transform.scale

    // Available slack
    // If content < container, center it.
    // If content > container, allow panning but clamp to edges.
    
    let newX = transform.x
    let newY = transform.y

    // Horizontal clamping
    if (contentW <= dimensions.width) {
      newX = (dimensions.width - contentW) / 2
    } else {
      // Content is wider than container
      // Min X: dimensions.width - contentW (Right edge aligns with right container edge)
      // Max X: 0 (Left edge aligns with left container edge)
      // Note: x is usually negative when panned left
      const minX = dimensions.width - contentW
      const maxX = 0
      newX = clamp(newX, minX, maxX)
    }

    // Vertical clamping
    if (contentH <= dimensions.height) {
      newY = (dimensions.height - contentH) / 2
    } else {
      const minY = dimensions.height - contentH
      const maxY = 0
      newY = clamp(newY, minY, maxY)
    }

    if (newX !== transform.x || newY !== transform.y) {
      setTransform(t => ({ ...t, x: newX, y: newY }))
    }
  }, [transform.scale, transform.x, transform.y, dimensions])


  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if left click and not on a child element that might need interaction
    if (e.button !== 0) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y }
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
    hasDragged.current = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return
    e.preventDefault()
    
    // Check if user has dragged significantly
    if (mouseDownPos.current && !hasDragged.current) {
        const dx = e.clientX - mouseDownPos.current.x
        const dy = e.clientY - mouseDownPos.current.y
        if (dx * dx + dy * dy > 25) { // 5px threshold
            hasDragged.current = true
        }
    }

    const newX = e.clientX - dragStart.current.x
    const newY = e.clientY - dragStart.current.y
    
    setTransform(prev => ({ ...prev, x: newX, y: newY }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    dragStart.current = null
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-gray-50 select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleBackgroundClick}
    >
      <div 
        ref={contentRef}
        className="absolute origin-top-left transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          width: Math.min(dimensions.width, dimensions.height),
          height: Math.min(dimensions.width, dimensions.height)
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        {layout.map((node) => (
          <OpinionBlock
            key={node.data.id}
            node={node}
            isActive={node.data.id === selectedId}
            onSelect={() => handleNodeClick(node)}
            scale={transform.scale}
          />
        ))}
      </div>

      {/* Zoom Controls/Indicators */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
           {Math.round(transform.scale * 100)}%
        </div>
        
        {/* Reset Zoom Button - Visible when zoomed in */}
        {transform.scale > 1.1 && (
          <button 
            className="pointer-events-auto bg-white shadow-md border border-gray-200 text-gray-700 p-2 rounded hover:bg-gray-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              handleBackgroundClick()
            }}
            title="Reset View"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
