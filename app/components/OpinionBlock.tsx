
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
  
  // Semantic Zoom Thresholds
  // Level 1: Tiny blocks -> Empty or just color
  // Level 2: Small blocks -> Avatar/Author
  // Level 3: Medium blocks -> Author + Summary
  // Level 4: Large blocks/Zoomed -> Author + Summary + Full Detail
  
  const showAvatar = minDim > 20
  const showSummary = minDim > 30
  const showDetail = minDim > 60 // Show detail preview sooner
  const showFullContent = minDim > 200 // Threshold for full content mode
  
  // Dynamic font sizing
  const headerFontSize = Math.max(9, Math.min(minDim / 20, 14))
  const summaryFontSize = Math.max(10, Math.min(minDim / 10, 24))
  const detailFontSize = Math.max(10, Math.min(minDim / 15, 16))

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
      <div className="text-black w-full h-full overflow-hidden select-none pointer-events-none flex flex-col gap-1">
        
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
            className={`font-bold leading-tight break-words flex-shrink-0 ${showFullContent ? '' : 'line-clamp-3'}`}
            style={{ fontSize: summaryFontSize, lineHeight: 1.2 }}
          >
            {opinion.summary}
          </div>
        )}

        {/* Detail Content (Semantic Zoom) */}
        {showDetail && opinion.detail && (
          <div 
            className={`opacity-70 leading-relaxed mt-0.5 break-words overflow-hidden ${showFullContent ? '' : 'line-clamp-3'}`}
            style={{ fontSize: detailFontSize }}
          >
            {showFullContent ? opinion.detail : (
              <>
                {opinion.detail.slice(0, 50)}
                {opinion.detail.length > 50 && '...'}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
