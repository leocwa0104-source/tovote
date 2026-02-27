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
}

interface OpinionCardProps {
  opinion?: Opinion
  factionId: string
  type: 'WHY' | 'WHY_NOT'
  currentUser: { id: string } | null
}

export default function OpinionCard({ opinion, factionId, type, currentUser }: OpinionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<CitationTarget | null>(null)
  const [mentionedCitations, setMentionedCitations] = useState<CitationTarget[]>([])

  const isOwner = currentUser && opinion?.authorId === currentUser.id
  
  // Avatar color generator
  const getAvatarColor = (username: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
      'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 
      'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 
      'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
      'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      await createOpinion(formData)
      setIsEditing(false)
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
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-0.5 mx-1"
          >
            @{citation.target.summary}
          </button>
        );
      } else {
        parts.push(<span key={match.index} className="text-gray-500">{fullMatch}</span>);
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
      <div className="bg-yellow-50 p-6 rounded-xl shadow-md border border-yellow-100 mb-6 relative overflow-hidden transition-all hover:shadow-lg group">
        {/* Paper texture/lines effect */}
        <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: '100% 2rem', marginTop: '3rem' }}></div>
        
        <h4 className="font-bold text-yellow-800/80 mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
          <span>✏️</span>
          {opinion ? 'Edit your opinion' : `Draft your "${type === 'WHY' ? 'Why Join' : 'Why Not'}" argument`}
        </h4>
        
        <form action={handleSubmit} className="flex flex-col relative z-10">
          <input type="hidden" name="factionId" value={factionId} />
          <input type="hidden" name="type" value={type} />
          
          <div className="space-y-0">
            {/* Summary Input (Title-like) */}
            <div className="relative">
              <input
                ref={summaryRef}
                type="text"
                name="summary"
                defaultValue={opinion?.summary || ''}
                placeholder="Core Argument (Headline)..."
                className="w-full p-0 border-0 bg-transparent text-xl font-bold text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none py-2"
                required
                maxLength={100}
                onKeyDown={handleSummaryKeyDown}
                autoComplete="off"
              />
            </div>
            
            {/* Detail Input (Body-like) */}
            <div className="relative min-h-[120px]">
              <MentionTextarea
                ref={detailRef}
                name="detail"
                defaultValue={opinion?.detail || ''}
                placeholder="Elaborate on your point... (Press Enter in headline to jump here)"
                className="w-full p-0 border-0 bg-transparent text-base text-gray-700 placeholder-gray-400 focus:ring-0 focus:outline-none resize-none leading-8 min-h-[120px]"
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

          {!opinion && (
            <>
              {mentionedCitations.map(c => (
                <input key={c.id} type="hidden" name="citationIds" value={JSON.stringify([c.id])} />
              ))}
            </>
          )}
          
          <div className="flex gap-3 justify-end mt-4">
            {opinion && (
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-100/50 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="px-6 py-2 text-sm font-bold bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:shadow-none"
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
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ${getAvatarColor(opinion.author.username)}`}>
          {opinion.author.username[0].toUpperCase()}
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 font-medium">{opinion.author.username}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(opinion.id)
                  alert('Opinion ID copied!')
                }} 
                className="text-xs text-gray-400 hover:text-gray-600"
                title="Copy ID to cite"
              >
                Copy ID
              </button>
              {isOwner && (
                <>
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={handleDelete} 
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
          
          <h5 className="font-semibold text-gray-800 text-sm mt-1 break-words">{opinion.summary}</h5>
          
          {opinion.detail && (
            <div className="mt-2">
              {isExpanded ? (
                <div className="text-sm text-gray-600 whitespace-pre-wrap break-words border-t border-gray-100 pt-2 mt-2">
                  {renderDetailWithCitations(opinion.detail, opinion.citations)}
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="flex items-center justify-center w-full mt-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 py-1 rounded transition-colors"
                    title="Collapse"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center justify-center w-full mt-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 py-1 rounded transition-colors"
                  title="Expand"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              )}
            </div>
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
