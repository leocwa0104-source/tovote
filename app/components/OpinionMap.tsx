
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
}

interface OpinionMapProps {
  opinions: MapOpinion[]
  selectedId?: string
  onSelect: (id: string) => void
}

export default function OpinionMap({ opinions, selectedId, onSelect }: OpinionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

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
    
    // Transform opinions to TreemapItems with weight based on content length
    const items = opinions.map(o => ({
      id: o.id,
      // Weight formula: Base + Summary Length + Detail Length (scaled)
      // Logarithmic scale might be better to avoid huge disparities, but linear is fine for now
      value: Math.max(20, o.summary.length + (o.detail?.length || 0) * 0.5), 
      data: o
    }))
    
    return computeTreemapLayout(items, dimensions.width, dimensions.height)
  }, [opinions, dimensions])

  return (
    <div 
      ref={containerRef} 
      className="relative w-full max-w-3xl aspect-square bg-white shadow-sm border border-gray-200 overflow-hidden"
    >
      {opinions.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 italic">
          No opinions yet. Be the first to map your territory!
        </div>
      ) : (
        <>
          {layout.map((node) => (
            <OpinionBlock
              key={node.id}
              node={node}
              isActive={selectedId === node.id}
              onSelect={onSelect}
            />
          ))}
          <div className="absolute bottom-1 right-2 text-[10px] text-gray-400 font-mono pointer-events-none z-20 opacity-50">
            {opinions.length} territories
          </div>
        </>
      )}
    </div>
  )
}
