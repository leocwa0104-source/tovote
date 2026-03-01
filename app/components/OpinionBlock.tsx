
import { useMemo } from 'react'
import { TreemapNode } from '../utils/treemap'

interface OpinionBlockProps {
  node: TreemapNode
  isActive: boolean
  onSelect: (id: string) => void
}

export default function OpinionBlock({ node, isActive, onSelect }: OpinionBlockProps) {
  const opinion = node.data
  const isWhy = opinion.type === 'WHY'
  
  // Color logic
  const baseColor = isWhy ? 'bg-green-500' : 'bg-red-500'
  const activeColor = isWhy ? 'bg-green-600' : 'bg-red-600'
  const hoverColor = isWhy ? 'hover:bg-green-400' : 'hover:bg-red-400'
  
  // Text size calculation based on block size
  const minDim = Math.min(node.w, node.h)
  const showText = minDim > 40
  const showAvatar = minDim > 20

  return (
    <div
      className={`absolute cursor-pointer border border-white/20 overflow-hidden flex flex-col items-center justify-center p-1 transition-all duration-300 ease-in-out ${
        isActive ? `z-10 ring-2 ring-white shadow-lg ${activeColor}` : `${baseColor} ${hoverColor}`
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
      }}
      onClick={() => onSelect(opinion.id)}
      title={`${opinion.author.username}: ${opinion.summary}`}
    >
      {/* Content */}
      <div className="text-white text-center w-full overflow-hidden select-none pointer-events-none">
        {showAvatar && (
          <div className="font-mono text-[10px] opacity-70 mb-0.5 truncate w-full">
            {opinion.author.username}
          </div>
        )}
        
        {showText && (
          <div className="font-bold text-xs leading-tight line-clamp-3 break-words w-full px-1">
            {opinion.summary}
          </div>
        )}
      </div>
    </div>
  )
}
