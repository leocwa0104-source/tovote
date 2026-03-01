
'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  // expandedId removed as per previous refactor to modal interaction, keeping clean state
  
  const dragStart = useRef<{ x: number, y: number } | null>(null)
  const mouseDownPos = useRef<{ x: number, y: number } | null>(null)
  const hasDragged = useRef(false)

  // Layout Size
  const size = useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return 0
    return Math.min(dimensions.width, dimensions.height)
  }, [dimensions])

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
    if (size === 0 || opinions.length === 0) return []
    
    // Transform opinions to TreemapItems
    const items = opinions.map(o => ({
      id: o.id,
      value: 100, // Fixed value for uniform sizing
      data: o,
      neighborId: o.neighborId
    }))
    
    return computeTreemapLayout(items, size, size)
  }, [opinions, size])

  // Draw to Canvas (LOD 0 / Background)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || layout.length === 0 || size === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Scale for high DPI
    const dpr = window.devicePixelRatio || 1
    // We actually set width/height attributes to size * dpr, so we don't need ctx.scale if we map 1:1
    // But our layout coords are 0..size.
    // So we need to scale context to match dpr.
    ctx.save()
    ctx.scale(dpr, dpr)

    // Draw all nodes
    layout.forEach(node => {
        // Draw background
        ctx.fillStyle = '#ffffff' // bg-white
        ctx.fillRect(node.x, node.y, node.w, node.h)
        
        // Draw border
        ctx.strokeStyle = '#e5e7eb' // border-gray-200
        ctx.lineWidth = 1
        ctx.strokeRect(node.x, node.y, node.w, node.h)

        // Optional: Draw simple text if node is large enough even at 1x scale?
        // Probably not needed, DOM handles text. Canvas is just structural background.
    })

    ctx.restore()
  }, [layout, size])


  // Calculate Visible Nodes (Virtualization + LOD)
  const visibleNodes = useMemo(() => {
    if (layout.length === 0) return []

    // Viewport in content coordinates
    const viewportX = -transform.x / transform.scale
    const viewportY = -transform.y / transform.scale
    const viewportW = dimensions.width / transform.scale
    const viewportH = dimensions.height / transform.scale

    return layout.filter(node => {
        // 1. Check Intersection
        const inViewport = (
            node.x < viewportX + viewportW &&
            node.x + node.w > viewportX &&
            node.y < viewportY + viewportH &&
            node.y + node.h > viewportY
        )
        if (!inViewport) return false

        // 2. Check Min Size (LOD)
        // If node width on screen is less than 20px, don't render DOM
        const screenWidth = node.w * transform.scale
        const screenHeight = node.h * transform.scale
        if (screenWidth < 20 || screenHeight < 20) return false

        return true
    })
  }, [layout, transform, dimensions])

  // Helper to clamp values
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const zoomSensitivity = 0.001
    const newScale = Math.min(Math.max(transform.scale - e.deltaY * zoomSensitivity, 1), 8)

    if (newScale === transform.scale) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale)
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale)

    setTransform({
      scale: newScale,
      x: newX,
      y: newY
    })
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [transform])

  const handleBlockSelect = useCallback((id: string) => {
      if (hasDragged.current) return
      onSelect(id)
  }, [onSelect])

  // Handle click on map content (including canvas areas where DOM is culled)
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasDragged.current) return

    // Calculate click position in content coordinates
    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect) return

    // If we clicked a DOM node, event propagation would be stopped by OpinionBlock
    // So if we are here, we clicked the background/canvas
    
    // Reverse transform to find x,y in content space
    // But e.clientX is screen space.
    // Easier: getBoundingClientRect gives transformed rect.
    // e.clientX - rect.left is x in transformed element? No.
    // rect is the bounding box of the transformed element.
    // The transformed element has origin top-left.
    
    // Let's use logic relative to container, which is simpler
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return

    const clickX = e.clientX - containerRect.left
    const clickY = e.clientY - containerRect.top
    
    const contentX = (clickX - transform.x) / transform.scale
    const contentY = (clickY - transform.y) / transform.scale

    // Find node at this position
    // Since layout is flat and nodes don't overlap, find first match
    const clickedNode = layout.find(node => 
        contentX >= node.x && contentX < node.x + node.w &&
        contentY >= node.y && contentY < node.y + node.h
    )

    if (clickedNode) {
        onSelect(clickedNode.data.id)
    } else {
        // Clicked outside any node (shouldn't happen in treemap unless gaps)
        // Or handleBackgroundClick logic
    }
  }

  const handleBackgroundClick = () => {
    if (hasDragged.current) return
    // Reset View
    const newX = (dimensions.width - size) / 2
    const newY = (dimensions.height - size) / 2
    
    setTransform({
      x: newX,
      y: newY,
      scale: 1
    })
    onSelect('')
  }

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return

    const contentW = size * transform.scale
    const contentH = size * transform.scale
    
    let newX = transform.x
    let newY = transform.y

    if (contentW <= dimensions.width) {
      newX = (dimensions.width - contentW) / 2
    } else {
      const minX = dimensions.width - contentW
      const maxX = 0
      newX = clamp(newX, minX, maxX)
    }

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
  }, [transform.scale, transform.x, transform.y, dimensions, size])


  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y }
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
    hasDragged.current = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return
    e.preventDefault()
    
    if (mouseDownPos.current && !hasDragged.current) {
        const dx = e.clientX - mouseDownPos.current.x
        const dy = e.clientY - mouseDownPos.current.y
        if (dx * dx + dy * dy > 25) {
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

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

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
        className="absolute origin-top-left" // Removed transition for smoother performance with many nodes
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          width: size,
          height: size
        }}
        onClick={handleContentClick} 
      >
        {/* Canvas Layer for LOD 0 / Background */}
        <canvas
            ref={canvasRef}
            width={size * dpr}
            height={size * dpr}
            style={{ 
                width: size, 
                height: size, 
                position: 'absolute', 
                top: 0, 
                left: 0,
                pointerEvents: 'none' // Canvas is purely visual, clicks pass to parent div
            }}
        />

        {/* DOM Layer for Interactive Nodes */}
        {visibleNodes.map((node) => (
          <OpinionBlock
            key={node.data.id}
            node={node}
            isActive={node.data.id === selectedId}
            onSelect={handleBlockSelect}
            scale={transform.scale}
          />
        ))}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
           {Math.round(transform.scale * 100)}%
        </div>
        
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
