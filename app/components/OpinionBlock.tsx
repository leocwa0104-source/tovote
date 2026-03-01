
import { useMemo } from 'react'
import { TreemapNode } from '../utils/treemap'

interface OpinionBlockProps {
  node: TreemapNode
  isActive: boolean
  onSelect: (id: string) => void
  scale: number
}

export default function OpinionBlock({ node, isActive, onSelect, scale }: OpinionBlockProps) {
  const opinion = node.data
  
  // Minimalist black/white style logic
  // Consistent base style for all opinions within a faction
  const baseColor = 'bg-white'
  const activeColor = 'bg-gray-50'
  const hoverColor = 'hover:bg-gray-50'
  
  // Adjusted text size calculation based on block size AND zoom scale
  // We want text to become visible as we zoom in
  const minDim = Math.min(node.w, node.h) * scale
  
  // Show more details if enough space
  // Relaxed constraints to show more content by default as requested
  const showAvatar = minDim > 20
  const showSummary = minDim > 30
  const showDetail = minDim > 60 // Show detail preview sooner

  // Dynamic font sizing
  const headerFontSize = Math.max(9, Math.min(minDim / 20, 14))
  const summaryFontSize = Math.max(10, Math.min(minDim / 10, 24))
  const detailFontSize = Math.max(8, Math.min(minDim / 15, 12))

  return (
    <div
      className={`absolute cursor-pointer border overflow-hidden flex flex-col p-1 transition-colors duration-200 ${
        isActive ? `z-10 ring-2 ring-black shadow-lg ${activeColor} border-black` : `${baseColor} ${hoverColor} border-gray-200`
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
      }}
      onClick={(e) => {
        e.stopPropagation() // Prevent map drag/click interference
        onSelect(opinion.id)
      }}
      title={`${opinion.author.username}: ${opinion.summary}`}
    >
      {/* Content Container - No centering, top-left alignment for map feel */}
      <div className="text-black w-full h-full overflow-hidden select-none pointer-events-none flex flex-col gap-0.5">
        
        {/* Header: Avatar + Username */}
        {showAvatar && (
          <div className="flex items-center gap-1 opacity-60 min-h-[12px] flex-shrink-0" style={{ fontSize: headerFontSize }}>
            <span className="font-mono truncate leading-none">
              @{opinion.author.username}
            </span>
          </div>
        )}
        
        {/* Summary (Headline) */}
        {showSummary && (
          <div 
            className="font-bold leading-tight break-words line-clamp-3 flex-shrink-0"
            style={{ fontSize: summaryFontSize, lineHeight: 1.1 }}
          >
            {opinion.summary}
          </div>
        )}

        {/* Detail Preview (First 20 chars) */}
        {showDetail && opinion.detail && (
          <div 
            className="opacity-70 leading-tight mt-0.5 break-words overflow-hidden line-clamp-3"
            style={{ fontSize: detailFontSize }}
          >
            {opinion.detail.slice(0, 20)}
            {opinion.detail.length > 20 && '...'}
          </div>
        )}
      </div>
    </div>
  )
}
