
'use client'

import { useEffect, useRef, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'
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

export interface OpinionMapRef {
  focusNode: (id: string) => void
}

interface OpinionMapProps {
  opinions: MapOpinion[]
  selectedId?: string
  onSelect: (id: string) => void
  currentUser?: { id: string } | null
}

const OpinionMap = forwardRef<OpinionMapRef, OpinionMapProps>(({ opinions, selectedId, onSelect, currentUser }, ref) => {
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
  const animationFrameRef = useRef<number>()

  // Layout Size
  const size = useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return 0
    return Math.min(dimensions.width, dimensions.height)
  }, [dimensions])

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

  // Expose focusNode method
  useImperativeHandle(ref, () => ({
    focusNode: (id: string) => {
      const node = layout.find(n => n.data.id === id)
      if (!node || !containerRef.current) return

      // Cancel any ongoing animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Target Scale: Ensure node is clearly visible but not too huge
      // Target around 1/3 of screen width?
      const targetScale = Math.min(
        (dimensions.width * 0.5) / node.w, 
        (dimensions.height * 0.5) / node.h,
        10 // Max zoom cap
      )

      // Target Position: Center the node
      // Center of node in layout coords
      const nodeCenterX = node.x + node.w / 2
      const nodeCenterY = node.y + node.h / 2

      // We want: transform.x + nodeCenterX * transform.scale = dimensions.width / 2
      // So: transform.x = dimensions.width / 2 - nodeCenterX * targetScale
      const targetX = dimensions.width / 2 - nodeCenterX * targetScale
      const targetY = dimensions.height / 2 - nodeCenterY * targetScale

      // Animation Loop
      const startTransform = { ...transform }
      const startTime = performance.now()
      const duration = 800 // ms

      const animate = (time: number) => {
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Ease Out Quart
        const ease = 1 - Math.pow(1 - progress, 4)

        const currentScale = startTransform.scale + (targetScale - startTransform.scale) * ease
        const currentX = startTransform.x + (targetX - startTransform.x) * ease
        const currentY = startTransform.y + (targetY - startTransform.y) * ease

        setTransform({ x: currentX, y: currentY, scale: currentScale })

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate)
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }), [layout, dimensions, transform])

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

    // Viewport in content coordinates (fixed coordinate system 0..size)
    // When scaled up (scale > 1), we see a smaller portion of the content
    // When translated (x, y), we shift the viewport
    
    // transform.x is negative when panning right/down (moving content left/up)
    // transform.scale is the zoom level
    
    // Visible Rect in layout coordinates:
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

        // 2. Check Min Size (LOD) - projected screen size
        // Even though layout is fixed, we decide visibility based on how big it appears on screen
        const screenWidth = node.w * transform.scale
        const screenHeight = node.h * transform.scale
        
        // Only render DOM if it's big enough to be worth it
        if (screenWidth < 20 || screenHeight < 20) return false

        return true
    })
  }, [layout, transform, dimensions])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    // Use container rect for mouse position relative to container
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setTransform(prev => {
      const zoomSensitivity = 0.001
      const delta = -e.deltaY * zoomSensitivity
      const newScale = Math.max(0.1, Math.min(prev.scale * (1 + delta), 20)) // Allow deeper zoom

      // Zoom towards mouse pointer
      // (mouseX - newX) / newScale = (mouseX - oldX) / oldScale
      // newX = mouseX - (mouseX - oldX) * (newScale / oldScale)
      const scaleRatio = newScale / prev.scale
      const newX = mouseX - (mouseX - prev.x) * scaleRatio
      const newY = mouseY - (mouseY - prev.y) * scaleRatio

      return {
        x: newX,
        y: newY,
        scale: newScale
      }
    })
  }, [])
  
  // Pan Logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(false)
    hasDragged.current = false
    dragStart.current = { x: e.clientX, y: e.clientY }
    mouseDownPos.current = { x: transform.x, y: transform.y }
  }, [transform])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current || !mouseDownPos.current) return
    
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setIsDragging(true)
        hasDragged.current = true
    }

    setTransform(prev => ({
      ...prev,
      x: mouseDownPos.current!.x + dx,
      y: mouseDownPos.current!.y + dy
    }))
  }, [])

  const handleMouseUp = useCallback(() => {
    dragStart.current = null
    mouseDownPos.current = null
    setTimeout(() => setIsDragging(false), 0)
  }, [])

  const handleContentClick = useCallback((e: React.MouseEvent) => {
      if (hasDragged.current) return
      
      // Calculate click position in layout coordinates
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      
      // Mouse position relative to container
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Convert to layout coordinates
      const layoutX = (mouseX - transform.x) / transform.scale
      const layoutY = (mouseY - transform.y) / transform.scale
      
      // Find node
      const clickedNode = layout.find(node => 
          layoutX >= node.x && 
          layoutX <= node.x + node.w && 
          layoutY >= node.y && 
          layoutY <= node.y + node.h
      )
      
      if (clickedNode) {
          onSelect(clickedNode.data.id)
      } else {
          // Clicked empty space
      }
  }, [layout, transform, onSelect])

  const handleBlockSelect = useCallback((id: string) => {
      if (hasDragged.current) return
      onSelect(id)
  }, [onSelect])

  const handleBackgroundClick = () => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }

  // Effect for Wheel Event (Passive false required for preventDefault)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel]) // Changed dependency to handleWheel which is now stable

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-gray-100 select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Transform Layer */}
      <div 
        ref={contentRef}
        style={{ 
            width: size, 
            height: size,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
            willChange: 'transform' // Hint for GPU acceleration
        }}
        onClick={handleContentClick} 
      >
        {/* Canvas Layer for LOD 0 / Background */}
        <canvas
            ref={canvasRef}
            width={size} 
            height={size}
            style={{ 
                width: '100%', 
                height: '100%', 
                position: 'absolute', 
                top: 0, 
                left: 0,
                pointerEvents: 'none'
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
})

export default OpinionMap
