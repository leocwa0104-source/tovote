
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

  const renderDetailWithCitations = (text: string, citations: { id: string, target: any }[] = []) => {
    if (!text) return null;
    
    // Regex to match @[username: summary...]
    const regex = /@\[([^:]+): (.*?)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const fullMatch = match[0];
      const username = match[1];
      const summarySnippet = match[2]; 
      
      const cleanSnippet = summarySnippet.endsWith('...') 
        ? summarySnippet.slice(0, -3) 
        : summarySnippet;

      // Find corresponding citation
      const citation = citations.find(c => 
        c.target.author.username === username && 
        (c.target.summary.includes(cleanSnippet) || c.target.summary.startsWith(cleanSnippet))
      );

      if (citation && onCitationClick) {
        parts.push(
          <button
            key={match.index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCitationClick(citation.target);
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono inline-flex items-center gap-1 mx-1 transition-colors cursor-pointer border border-transparent hover:border-gray-300"
          >
            <span className="opacity-50">@</span>{citation.target.summary}
          </button>
        );
      } else {
        parts.push(<span key={match.index} className="text-gray-400 font-mono text-xs bg-gray-50 px-1 rounded">{fullMatch}</span>);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };
  
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
                    {renderDetailWithCitations(opinion.detail, opinion.citations)}
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
                                className={`text-xs bg-gray-50 p-2 rounded text-gray-600 transition-colors ${onCitationClick ? 'cursor-pointer hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onCitationClick) onCitationClick(c.target);
                                }}
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
