
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
}

export default function OpinionMap({ opinions, selectedId, onSelect }: OpinionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const dragStart = useRef<{ x: number, y: number } | null>(null)

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
      value: Math.max(20, o.summary.length + (o.detail?.length || 0) * 0.5), 
      data: o,
      neighborId: o.neighborId
    }))
    
    return computeTreemapLayout(items, size, size)
  }, [opinions, dimensions])

  // Helper to clamp values
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

  // Fix: Prevent default browser zooming/scrolling when interacting with the map
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const preventDefault = (e: WheelEvent) => {
      e.preventDefault()
    }

    // Passive: false is crucial for preventing wheel default behavior in some browsers
    container.addEventListener('wheel', preventDefault, { passive: false })

    return () => {
      container.removeEventListener('wheel', preventDefault)
    }
  }, [])

  const handleWheel = (e: React.WheelEvent) => {
    // Event is already prevented by the native listener above, 
    // but we keep this for React's synthetic event system consistency if needed
    // or just rely on the logic here.
    // We need to stop propagation to prevent parent scrolling if any.
    e.stopPropagation()

    const zoomSensitivity = 0.001
    const newScale = clamp(transform.scale - e.deltaY * zoomSensitivity, 1, 5) // Min 1x, Max 5x

    if (newScale === transform.scale) return

    // Calculate mouse position relative to content center to zoom towards mouse
    // Simplified: Zoom towards center for now to avoid complexity with clamping
    // Or better: Zoom towards mouse pointer
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // For now, let's keep it simple: center zoom or just update scale and then clamp position
    // We'll update scale then re-clamp position in a separate effect or right here
    
    // Let's implement center zoom for stability first, then refine if needed
    // Actually standard map zoom is usually towards pointer.
    
    setTransform(prev => {
      // Calculate new position to keep content within bounds
      // Bounds: 
      // Left edge (x) cannot be > 0 (unless content < container)
      // Right edge (x + width*scale) cannot be < containerWidth
      
      // Let's just update scale here, and let the clamping logic handle x/y
      return { ...prev, scale: newScale }
    })
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
    setIsDragging(true)
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return
    e.preventDefault()
    
    const newX = e.clientX - dragStart.current.x
    const newY = e.clientY - dragStart.current.y
    
    setTransform(prev => ({ ...prev, x: newX, y: newY }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    dragStart.current = null
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    dragStart.current = null
  }

  const handleBlockSelect = (id: string) => {
    setExpandedId(id)
    onSelect(id)
  }

  const expandedNode = useMemo(() => {
    if (!expandedId) return null
    return layout.find(n => n.id === expandedId)
  }, [expandedId, layout])

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-gray-50 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {opinions.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 italic">
          No opinions yet. Be the first to map your territory!
        </div>
      ) : (
        <div
          ref={contentRef}
          className="absolute origin-top-left shadow-sm bg-white"
          style={{
            width: Math.min(dimensions.width, dimensions.height),
            height: Math.min(dimensions.width, dimensions.height),
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {layout.map((node) => (
            <OpinionBlock
              key={node.id}
              node={node}
              isActive={selectedId === node.id}
              onSelect={handleBlockSelect}
              scale={transform.scale}
            />
          ))}
        </div>
      )}
      
      {/* HUD / Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-none z-10">
         <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
           {Math.round(transform.scale * 100)}%
         </div>
      </div>

      {/* Expanded Overlay */}
      {expandedNode && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] cursor-default p-4"
          onClick={(e) => {
            e.stopPropagation()
            setExpandedId(null)
            onSelect('') // Clear selection
          }}
        >
          <div 
            className="relative w-full max-w-lg bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90%] border-l-4 border-black"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Header */}
             <div className="flex justify-between items-start p-6 pb-2">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-black" />
                   <span className="font-mono text-sm text-gray-500">@{expandedNode.data.author.username}</span>
                </div>
                <button 
                  onClick={() => {
                    setExpandedId(null)
                    onSelect('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
             </div>

             {/* Content */}
             <div className="p-6 pt-2 overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-4 leading-snug">
                  {expandedNode.data.summary}
                </h3>
                {expandedNode.data.detail ? (
                  <div className="prose prose-sm text-gray-600 whitespace-pre-wrap">
                    {expandedNode.data.detail.replace(/@\[[^:]+: (.*?)\]/g, '@$1')}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-sm">No additional details provided.</p>
                )}
             </div>
             
             {/* Footer */}
             <div className="bg-gray-50 p-3 text-xs text-gray-400 border-t border-gray-100 flex justify-between items-center">
                <span>ID: {expandedNode.id.slice(0, 8)}</span>
                <span className="uppercase tracking-wider font-bold opacity-50">
                  Territory
                </span>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
