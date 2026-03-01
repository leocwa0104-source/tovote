'use client'

import { useState, useRef } from 'react'
import { createOpinion, deleteOpinion } from '@/app/actions'
import OpinionDetailModal from './OpinionDetailModal'
import MentionTextarea from './MentionTextarea'

interface CitationTarget {
  id: string
  summary: string
  detail: string | null
  type: 'WHY' | 'WHY_NOT'
  author: {
    username: string
  }
  faction: {
    name: string
    topic: {
      title: string
    }
  }
}

interface Opinion {
  id: string
  summary: string
  detail: string | null
  type: 'WHY' | 'WHY_NOT'
  authorId: string
  author: {
    username: string
  }
  createdAt: Date
  citations: {
    id: string
    target: CitationTarget
  }[]
  citedBy: {
    id: string
    source: {
      id: string
      summary: string
      type: 'WHY' | 'WHY_NOT'
      author: { username: string }
    }
  }[]
  factionId: string
  neighborId?: string | null
}

interface OpinionCardProps {
  opinion?: Opinion
  factionId: string
  type: 'WHY' | 'WHY_NOT'
  currentUser: { id: string } | null
  isPrivateTopic?: boolean
  onSuccess?: () => void
  initialIsEditing?: boolean
  availableNeighbors?: { id: string, summary: string, author: { username: string } }[]
  initialNeighborId?: string | null
}

export default function OpinionCard({ 
  opinion, 
  factionId, 
  type, 
  currentUser, 
  isPrivateTopic,
  onSuccess,
  initialIsEditing = false,
  availableNeighbors = [],
  initialNeighborId = null
}: OpinionCardProps) {
  const [isEditing, setIsEditing] = useState(initialIsEditing)
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<CitationTarget | null>(null)
  const [mentionedCitations, setMentionedCitations] = useState<CitationTarget[]>([])
  const [selectedNeighborId, setSelectedNeighborId] = useState<string | null>(opinion?.neighborId || initialNeighborId || null)

  const isOwner = currentUser && opinion?.authorId === currentUser.id

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      if (selectedNeighborId) {
        formData.append('neighborId', selectedNeighborId)
      }
      
      await createOpinion(formData)
      setIsEditing(false)
      onSuccess?.()
    } catch (error) {
      console.error(error)
      alert('Failed to save opinion')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!opinion) return
    if (!confirm('Are you sure you want to remove your opinion?')) return

    setLoading(true)
    try {
      await deleteOpinion(opinion.id)
      onSuccess?.()
    } catch (error) {
      console.error(error)
      alert('Failed to delete opinion')
    } finally {
      setLoading(false)
    }
  }

  const summaryRef = useRef<HTMLInputElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const handleSummaryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      detailRef.current?.focus()
    }
  }

  const handleDetailKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Check if the content is empty or only whitespace
    const isEmpty = !detailRef.current?.innerText || detailRef.current.innerText.trim() === '';
    
    if (e.key === 'Backspace' && isEmpty) {
      e.preventDefault()
      summaryRef.current?.focus()
    }
  }

  const renderDetailWithCitations = (text: string, citations: { id: string, target: CitationTarget }[]) => {
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

      if (citation) {
        parts.push(
          <button
            key={match.index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCitation(citation.target);
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono inline-flex items-center gap-1 mx-1 transition-colors"
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

  // If editing or no opinion yet (and user is logged in), show form
  if (isEditing || (!opinion && currentUser)) {
    return (
      <div className="mb-6 bg-white border border-gray-100 p-5 transition-all">
        <h4 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-gray-900 rounded-full"></span>
          {opinion ? 'Edit Territory' : 'Claim Territory'}
        </h4>
        
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="factionId" value={factionId} />
          <input type="hidden" name="type" value={type} />
          
          <div className="space-y-4">
            {/* Summary Input */}
            <input
              ref={summaryRef}
              type="text"
              name="summary"
              defaultValue={opinion?.summary || ''}
              placeholder="Core Argument (Headline)..."
              className="w-full p-2 bg-gray-50 border-b border-gray-200 focus:border-gray-800 focus:bg-white text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none transition-colors rounded-none"
              required
              maxLength={100}
              onKeyDown={handleSummaryKeyDown}
              autoComplete="off"
            />
            
            {/* Detail Input */}
            <div className="relative min-h-[100px]">
              <MentionTextarea
                ref={detailRef}
                name="detail"
                defaultValue={opinion?.detail || ''}
                placeholder="Elaborate on your point..."
                className="w-full p-2 bg-gray-50 border-b border-gray-200 focus:border-gray-800 focus:bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none min-h-[100px] transition-colors rounded-none"
                onCitationAdd={(citation) => {
                  setMentionedCitations(prev => {
                    if (prev.find(c => c.id === citation.id)) return prev
                    return [...prev, citation]
                  })
                }}
                onKeyDown={handleDetailKeyDown}
              />
            </div>
          </div>

          <input 
            type="hidden" 
            name="citationIds" 
            value={JSON.stringify(mentionedCitations.map(c => c.id))} 
          />
          
          <div className="flex gap-3 justify-end items-center pt-2">
            {/* Neighbor Selector */}
            <div className="flex-grow flex items-center gap-2">
               <span className="text-xs text-gray-400 uppercase tracking-wide">Neighbor:</span>
               <select 
                 value={selectedNeighborId || ''}
                 onChange={(e) => setSelectedNeighborId(e.target.value || null)}
                 className="bg-gray-50 border-b border-gray-200 text-xs text-gray-700 py-1 focus:outline-none focus:border-gray-800 max-w-[150px]"
               >
                 <option value="">None (Auto)</option>
                 {availableNeighbors
                   .filter(n => n.id !== opinion?.id) // Can't neighbor self
                   .map(n => (
                   <option key={n.id} value={n.id}>
                     {n.author.username}: {n.summary.substring(0, 20)}{n.summary.length > 20 ? '...' : ''}
                   </option>
                 ))}
               </select>
            </div>

            {opinion && (
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-mono text-gray-500 hover:text-gray-900 transition-colors uppercase"
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="px-5 py-1.5 text-xs font-mono font-bold bg-gray-900 text-white hover:bg-black transition-colors disabled:opacity-50 uppercase tracking-wide"
              disabled={loading}
            >
              {loading ? 'Posting...' : 'Post Argument'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Display Mode
  if (!opinion) return null

  return (
    <div className="group relative py-3 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Minimal Avatar */}
        <div className="w-6 h-6 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-500 font-mono text-[10px] mt-0.5">
          {opinion.author.username[0].toUpperCase()}
        </div>
        
        <div className="flex-grow min-w-0">
          {/* Header Row: Username + Summary */}
          <div className="flex items-baseline gap-2 flex-wrap pr-2">
            <span className="font-mono text-xs text-gray-400 uppercase tracking-wide">{opinion.author.username}</span>
            <h5 className="font-medium text-gray-900 text-sm break-words leading-snug">{opinion.summary}</h5>
          </div>
          
          {/* Detail Section */}
          {opinion.detail && (
            <div className="mt-1.5 pl-0">
              {isExpanded ? (
                <div className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed font-light">
                  {renderDetailWithCitations(opinion.detail, opinion.citations)}
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="inline-flex items-center justify-center w-full mt-2 text-gray-300 hover:text-gray-500 py-1 transition-colors"
                    title="Collapse"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-gray-500 mt-1 transition-colors"
                  title="Expand"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions: Absolute positioned on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute right-2 top-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-sm border border-gray-100">
          {!isPrivateTopic && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(opinion.id)
                alert('Opinion ID copied!')
              }} 
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-sm hover:bg-gray-100"
              title="Copy ID"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          )}
          {isOwner && (
            <>
              <button 
                onClick={() => setIsEditing(true)} 
                className="text-gray-400 hover:text-blue-600 p-1.5 rounded-sm hover:bg-blue-50"
                title="Edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button 
                onClick={handleDelete} 
                className="text-gray-400 hover:text-red-600 p-1.5 rounded-sm hover:bg-red-50"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {selectedCitation && (
        <OpinionDetailModal 
        isOpen={!!selectedCitation}
        onClose={() => setSelectedCitation(null)}
        opinion={selectedCitation}
      />
    )}
  </div>
)
}
