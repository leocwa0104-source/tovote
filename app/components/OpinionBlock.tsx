
import { TreemapNode } from '../utils/treemap'
import { Opinion } from '@/app/types'

interface OpinionBlockProps {
  node: TreemapNode<Opinion>
  isActive: boolean
  onSelect: (id: string) => void
}

export default function OpinionBlock({ node, isActive, onSelect }: OpinionBlockProps) {
  const isTooSmall = node.w < 20 || node.h < 20
  if (isTooSmall) return null

  const opinion = node.data
  
  // Minimalist black/white style logic
  const baseColor = 'bg-white'
  const activeColor = 'bg-gray-50'
  const hoverColor = 'hover:bg-gray-50'
  
  // Adjusted text size calculation based on block size (NOT zoom scale)
  // This ensures text layout is fixed relative to the block, behaving like an image
  const minDim = Math.min(node.w, node.h)
  
  // Simplified Visibility Thresholds (still need to check against visual size for culling if we wanted to be fancy inside block,
  // but visibility is controlled by parent. Here we just decide what to RENDER based on physical size)
  // Actually, we want to show more details as we zoom in?
  // User said: "make it look like a photo".
  // In a photo, small details are there, just tiny.
  // But for performance, we might still want to hide things if they are too small visually.
  // However, if we change DOM content based on zoom, we might get layout shifts if CSS changes.
  // Let's stick to fixed layout based on node dimensions.
  
  const showSummary = minDim > 40
  
  // Fixed font sizing based on node dimensions
  const summaryFontSize = Math.max(10, Math.min(minDim / 8, 24))

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
      <div className="text-black w-full h-full flex flex-col gap-1 overflow-hidden select-none pointer-events-none justify-center">
        
        {/* Summary (Headline) */}
        {showSummary && (
          <div 
            className="font-bold leading-tight break-words flex-shrink-0 line-clamp-3 text-center"
            style={{ fontSize: summaryFontSize, lineHeight: 1.2 }}
          >
            {opinion.summary}
          </div>
        )}
      </div>
    </div>
  )
}

