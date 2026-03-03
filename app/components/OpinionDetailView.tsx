
'use client'

import { useState, useEffect } from 'react'
import { Opinion, CitationTarget } from '@/app/types'
import { voteOpinion } from '@/app/actions/opinion'
import { useRouter } from 'next/navigation'
import { Eye, Trash } from './Icons'

interface OpinionDetailViewProps {
  opinion: Opinion
  onClose: () => void
  onCitationClick?: (target: CitationTarget) => void
  canSetNeighbor?: boolean
  hasUserPosted?: boolean
  onSetNeighbor?: (id: string) => void
}

export default function OpinionDetailView({ 
  opinion, 
  onClose, 
  onCitationClick,
  canSetNeighbor,
  hasUserPosted,
  onSetNeighbor
}: OpinionDetailViewProps) {
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  
  const [eyes, setEyes] = useState(opinion.eyes || 0)
  const [trash, setTrash] = useState(opinion.trash || 0)
  const [userVoteType, setUserVoteType] = useState<'EYE' | 'TRASH' | null>(
    (opinion.votes?.[0]?.type as 'EYE' | 'TRASH' | null) || null
  )

  useEffect(() => {
    setEyes(opinion.eyes || 0)
    setTrash(opinion.trash || 0)
    setUserVoteType((opinion.votes?.[0]?.type as 'EYE' | 'TRASH' | null) || null)
  }, [opinion])

  const handleVote = async (type: 'EYE' | 'TRASH') => {
    // Optimistic Update
    const prevEyes = eyes
    const prevTrash = trash
    const prevVote = userVoteType
    
    if (userVoteType === type) {
      // Retract
      setUserVoteType(null)
      if (type === 'EYE') setEyes(prev => Math.max(0, prev - 1))
      else setTrash(prev => Math.max(0, prev - 1))
    } else {
      // New Vote or Switch
      setUserVoteType(type)
      if (type === 'EYE') {
        setEyes(prev => prev + 1)
        if (prevVote === 'TRASH') setTrash(prev => Math.max(0, prev - 1))
      } else {
        setTrash(prev => prev + 1)
        if (prevVote === 'EYE') setEyes(prev => Math.max(0, prev - 1))
      }
    }

    try {
      const result = await voteOpinion(opinion.id, type)
      if (result.error) {
        // Revert
        setEyes(prevEyes)
        setTrash(prevTrash)
        setUserVoteType(prevVote)
        alert(result.error)
      } else {
        if (result.replenished) {
          alert("Your voting tokens (Eyes & Trash) have been replenished!")
        }
        router.refresh()
      }
    } catch (e) {
      console.error(e)
      // Revert
      setEyes(prevEyes)
      setTrash(prevTrash)
      setUserVoteType(prevVote)
    }
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(opinion.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderDetailWithCitations = (text: string, citations: { id: string, target: CitationTarget }[] = []) => {
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
      let citation = citations.find(c => 
        c.target.author.username === username && 
        (c.target.summary.includes(cleanSnippet) || c.target.summary.startsWith(cleanSnippet))
      );

      // Fallback: If strict match fails, try to find by username only
      // This handles cases where summary might be formatted differently or truncated differently
      if (!citation) {
        const byAuthor = citations.filter(c => c.target.author.username === username);
        if (byAuthor.length === 1) {
            citation = byAuthor[0];
        } else if (byAuthor.length > 1) {
            // If multiple citations from same author, try to match the first few characters
            citation = byAuthor.find(c => c.target.summary.substring(0, 10) === cleanSnippet.substring(0, 10));
            // If still no match, just take the first one as best guess
            if (!citation) citation = byAuthor[0];
        }
      }

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
                    {(opinion.faction?.name || opinion.faction?.topic?.title) && (
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-[200px]" title={`${opinion.faction?.topic?.title || ''} / ${opinion.faction?.name || ''}`}>
                            {opinion.faction?.topic?.title ? `${opinion.faction.topic.title} / ` : ''}
                            {opinion.faction?.name || ''}
                        </span>
                    )}
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


        </div>

        {/* Footer / Actions */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between flex-shrink-0 items-center">
             <div className="flex items-center gap-4">
                {/* Vote Buttons */}
                <div className="flex items-center gap-2">
                   <button 
                     onClick={(e) => {
                       e.stopPropagation()
                       handleVote('EYE')
                     }}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                       userVoteType === 'EYE' 
                         ? 'bg-blue-50 border-blue-200 text-blue-700' 
                         : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-600'
                     }`}
                     title="Worth seeing (Cost: 1 Eye)"
                   >
                     <Eye className="w-4 h-4" />
                     <span className="text-xs font-bold font-mono">{eyes}</span>
                   </button>

                   <button 
                     onClick={(e) => {
                       e.stopPropagation()
                       handleVote('TRASH')
                     }}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                       userVoteType === 'TRASH' 
                         ? 'bg-red-50 border-red-200 text-red-700' 
                         : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600'
                     }`}
                     title="Garbage (Cost: 1 Trash)"
                   >
                     <Trash className="w-4 h-4" />
                     <span className="text-xs font-bold font-mono">{trash}</span>
                   </button>
                </div>

               {canSetNeighbor && onSetNeighbor && (
                 <button
                   onClick={() => onSetNeighbor(opinion.id)}
                   className="px-3 py-1.5 text-xs font-mono font-bold border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors uppercase tracking-wide rounded mr-3"
                   title={hasUserPosted ? "Move your territory next to this one" : "Claim your territory next to this one"}
                 >
                   {hasUserPosted ? "Move Here" : "Claim Next to This"}
                 </button>
               )}
             </div>
             
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
