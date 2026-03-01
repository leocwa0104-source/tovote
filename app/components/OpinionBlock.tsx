
import { useMemo, useState } from 'react'
import { TreemapNode } from '../utils/treemap'

interface OpinionBlockProps {
  node: TreemapNode
  isActive: boolean
  onSelect: (id: string) => void
  scale: number
}

export default function OpinionBlock({ node, isActive, onSelect, scale }: OpinionBlockProps) {
  const opinion = node.data
  const [copied, setCopied] = useState(false)
  
  // Minimalist black/white style logic
  // Consistent base style for all opinions within a faction
  const baseColor = 'bg-white'
  const activeColor = 'bg-gray-50'
  const hoverColor = 'hover:bg-gray-50'
  
  // Adjusted text size calculation based on block size AND zoom scale
  // We want text to become visible as we zoom in
  // Use scale as the primary driver for feature visibility, less dependent on block size
  // This ensures consistency across different block sizes at the same zoom level
  const minDim = Math.min(node.w, node.h) * scale
  
  // Semantic Zoom Thresholds
  // Level 1: Tiny blocks -> Empty or just color
  // Level 2: Small blocks -> Avatar/Author
  // Level 3: Medium blocks -> Author + Summary
  // Level 4: Large blocks/Zoomed -> Author + Summary + Full Detail
  
  // Use scale-based thresholds primarily, with minDim as a fallback safeguard
  // This ensures that at high zoom (e.g. scale > 4), all blocks show features regardless of size
  const isHighZoom = scale > 4
  const isMediumZoom = scale > 2

  const showAvatar = isMediumZoom || minDim > 20
  const showSummary = isMediumZoom || minDim > 30
  const showDetail = isHighZoom || minDim > 60 
  // Trigger full content mode based on zoom level OR size
  // If scale is high enough (e.g. > 6), treat all blocks as full content candidates when clicked/active
  const showFullContent = isActive && (scale > 3 || minDim > 200)
  
  // Dynamic font sizing
  const headerFontSize = showFullContent ? 12 : Math.max(9, Math.min(minDim / 20, 14))
  const summaryFontSize = showFullContent ? 16 : Math.max(10, Math.min(minDim / 10, 24))
  const detailFontSize = showFullContent ? 14 : Math.max(10, Math.min(minDim / 15, 16))

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(opinion.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Render Full Content Mode (Inverse Scaled)
  if (showFullContent) {
    return (
      <div
        className={`absolute cursor-pointer border overflow-hidden transition-colors duration-200 ${
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
        <div
          className="text-black flex flex-col gap-2 p-4 overflow-y-auto pointer-events-auto bg-white/95"
          style={{
            width: `${node.w * scale}px`,
            height: `${node.h * scale}px`,
            transform: `scale(${1 / scale})`,
            transformOrigin: '0 0',
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-shrink-0">
            <span className="font-mono text-xs opacity-60">@{opinion.author.username}</span>
            <button 
              className={`transition-all duration-300 rounded-full p-1 flex items-center justify-center
                ${copied 
                  ? 'bg-green-100 text-green-600 opacity-100 scale-110' 
                  : 'opacity-40 hover:opacity-100 bg-black/5 hover:bg-black/10 text-gray-600'
                }`}
              onClick={handleCopyId}
              title="Copy ID"
              style={{ width: '20px', height: '20px' }}
            >
              {copied ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </button>
          </div>

          {/* Summary */}
          <div className="font-bold leading-tight break-words text-base">
            {opinion.summary}
          </div>

          {/* Detail */}
          {opinion.detail && (
            <div className="opacity-80 leading-relaxed break-words text-sm pb-4">
              {opinion.detail}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Preview Mode (Normal Scaled)
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
      <div 
        className={`text-black w-full h-full flex flex-col gap-1 
          ${showFullContent ? 'overflow-y-auto pointer-events-auto' : 'overflow-hidden select-none pointer-events-none'}`}
        onWheel={(e) => {
          if (showFullContent) {
            e.stopPropagation()
          }
        }}
      >
        
        {/* Header: Avatar + Username */}
        {showAvatar && (
          <div className="flex items-center justify-between gap-1 min-h-[12px] flex-shrink-0" style={{ fontSize: headerFontSize }}>
            <span className="font-mono truncate leading-none opacity-60">
              @{opinion.author.username}
            </span>
            
            {/* Copy ID Button - Only visible in full content mode */}
            {showFullContent && (
              <button 
                className={`pointer-events-auto transition-all duration-300 rounded-full p-1 flex items-center justify-center
                  ${copied 
                    ? 'bg-green-100 text-green-600 opacity-100 scale-110' 
                    : 'opacity-40 hover:opacity-100 bg-black/5 hover:bg-black/10 text-gray-600'
                  }`}
                onClick={handleCopyId}
                title="Copy ID"
                style={{ width: '20px', height: '20px' }}
              >
                {copied ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
              </button>
            )}
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
