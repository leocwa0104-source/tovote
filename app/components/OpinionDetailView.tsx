
'use client'

import { useState } from 'react'

interface OpinionDetailViewProps {
  opinion: {
    id: string
    summary: string
    detail: string | null
    type: 'WHY' | 'WHY_NOT'
    author: {
      username: string
    }
    neighborId?: string | null
    citations?: {
        id: string
        target: {
            id: string
            summary: string
            detail: string | null
            type: 'WHY' | 'WHY_NOT'
            author: { username: string }
        }
    }[]
  }
  onClose: () => void
  onCitationClick?: (target: any) => void
}

export default function OpinionDetailView({ opinion, onClose, onCitationClick }: OpinionDetailViewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyId = () => {
    navigator.clipboard.writeText(opinion.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Helper to render text with @mentions (simplified for read-only view)
  // Note: For a robust implementation, we might want to reuse the logic from OpinionCard,
  // but for now we'll just render text. If the user wants clickable citations in the modal,
  // we can enhance this later.
  
  return (
    <div className="flex flex-col h-full bg-white relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 font-mono text-xs font-bold">
                    {opinion.author.username[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-gray-900 uppercase tracking-wide">
                        {opinion.author.username}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono uppercase">
                        Territory ID: {opinion.id.substring(0, 8)}...
                    </span>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleCopyId}
                    className={`transition-all duration-300 rounded-full p-2 flex items-center justify-center border border-gray-100
                        ${copied 
                        ? 'bg-green-50 text-green-600 border-green-200' 
                        : 'bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    title="Copy ID"
                >
                    {copied ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    )}
                </button>
            </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
                {opinion.summary}
            </h2>
            
            {opinion.detail ? (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-serif text-base">
                    {opinion.detail}
                </div>
            ) : (
                <p className="text-sm text-gray-400 italic">
                    No elaboration provided.
                </p>
            )}

            {/* Citations / References Section if needed */}
            {opinion.citations && opinion.citations.length > 0 && (
                <div className="mt-8 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wide mb-2">References</h4>
                    <div className="flex flex-col gap-2">
                        {opinion.citations.map(c => (
                            <div 
                                key={c.id} 
                                className={`text-xs bg-gray-50 p-2 rounded text-gray-600 ${onCitationClick ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                                onClick={() => onCitationClick && onCitationClick(c.target)}
                            >
                                <span className="font-bold">@{c.target.author.username}</span>: {c.target.summary}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Footer / Actions */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end flex-shrink-0">
             <button 
               onClick={onClose}
               className="px-4 py-2 text-xs font-mono font-bold bg-gray-900 text-white hover:bg-black transition-colors uppercase tracking-wide rounded"
             >
               Close
             </button>
        </div>
    </div>
  )
}
