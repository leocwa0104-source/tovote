
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
  const baseColor = 'bg-white'
  const activeColor = 'bg-gray-50'
  const hoverColor = 'hover:bg-gray-50'
  
  // Adjusted text size calculation based on block size AND zoom scale
  const minDim = Math.min(node.w, node.h) * scale
  
  // Simplified Visibility Thresholds
  const showAvatar = minDim > 20
  const showSummary = minDim > 30
  const showDetail = minDim > 60

  // Dynamic font sizing (simplified)
  const headerFontSize = Math.max(9, Math.min(minDim / 20, 12))
  const summaryFontSize = Math.max(10, Math.min(minDim / 10, 16))
  const detailFontSize = Math.max(9, Math.min(minDim / 15, 14))

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
        e.stopPropagation()
        onSelect(opinion.id)
      }}
      title={`${opinion.author.username}: ${opinion.summary}`}
    >
      {/* Content Container */}
      <div className="text-black w-full h-full flex flex-col gap-1 overflow-hidden select-none pointer-events-none">
        
        {/* Header: Avatar + Username */}
        {showAvatar && (
          <div className="flex items-center gap-1 min-h-[12px] flex-shrink-0" style={{ fontSize: headerFontSize }}>
            <span className="font-mono truncate leading-none opacity-60">
              @{opinion.author.username}
            </span>
          </div>
        )}
        
        {/* Summary (Headline) */}
        {showSummary && (
          <div 
            className="font-bold leading-tight break-words flex-shrink-0 line-clamp-2"
            style={{ fontSize: summaryFontSize, lineHeight: 1.2 }}
          >
            {opinion.summary}
          </div>
        )}

        {/* Detail (Content) - First 3 lines */}
        {showDetail && opinion.detail && (
          <div 
            className="font-serif opacity-80 leading-tight break-words line-clamp-3 mt-0.5"
            style={{ fontSize: detailFontSize, lineHeight: 1.3 }}
          >
            {opinion.detail}
          </div>
        )}
      </div>
    </div>
  )
}
