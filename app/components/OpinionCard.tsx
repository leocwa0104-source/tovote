'use client'

import { useState, useRef } from 'react'
import { createOpinion, deleteOpinion } from '@/app/actions'
import OpinionDetailModal from './OpinionDetailModal'
import TiptapEditor from './TiptapEditor'
import { Opinion, CitationTarget, User } from '@/app/types'

import { skins, SkinId } from '@/app/styles/skins/config'

interface OpinionCardProps {
  opinion?: Opinion
  factionId: string
  type: 'WHY' | 'WHY_NOT'
  currentUser: User | null
  isPrivateTopic?: boolean
  onSuccess?: () => void
  initialIsEditing?: boolean
  availableNeighbors?: { id: string, summary: string, author: { username: string } }[]
  initialNeighborId?: string | null
  skinId?: SkinId
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
  initialNeighborId = null,
  skinId = 'default'
}: OpinionCardProps) {
  const [isEditing, setIsEditing] = useState(initialIsEditing)
  const [loading, setLoading] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<CitationTarget | null>(null)
  const [mentionedCitations, setMentionedCitations] = useState<CitationTarget[]>([])
  const [selectedNeighborId] = useState<string | null>(opinion?.neighborId || initialNeighborId || null)
  
  const skin = skins[skinId].opinionCard

  const isOwner = currentUser && opinion?.authorId === currentUser.id

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      // Manual append is no longer needed if we use hidden input, 
      // but keeping it for safety if state is source of truth
      if (selectedNeighborId) {
        formData.set('neighborId', selectedNeighborId)
      } else {
        formData.delete('neighborId')
      }
      
      const result = await createOpinion(formData)
      if (result?.success) {
        setIsEditing(false)
        onSuccess?.()
      } else {
        alert(result?.error || 'Failed to save opinion')
      }
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
      const result = await deleteOpinion(opinion.id)
      if (result?.success) {
        onSuccess?.()
      } else {
        alert(result?.error || 'Failed to delete opinion')
      }
    } catch (error) {
      console.error(error)
      alert('Failed to delete opinion')
    } finally {
      setLoading(false)
    }
  }

  const summaryRef = useRef<HTMLInputElement>(null)

  // If editing or no opinion yet (and user is logged in), show form
  if (isEditing || (!opinion && currentUser)) {
    return (
      <div className="mb-6 bg-white border border-gray-100 p-5 transition-all">
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
              autoComplete="off"
            />
            
            {/* Detail Input */}
            <div className="relative min-h-[100px]">
              <TiptapEditor
                name="detail"
                defaultValue={opinion?.detail || ''}
                placeholder="Elaborate on your point..."
                className="w-full"
                onCitationAdd={(citation) => {
                  setMentionedCitations(prev => {
                    if (prev.find(c => c.id === citation.id)) return prev
                    return [...prev, citation]
                  })
                }}
              />
            </div>
          </div>

          <input 
            type="hidden" 
            name="citationIds" 
            value={JSON.stringify(mentionedCitations.map(c => c.id))} 
          />
          
          <div className="flex gap-3 justify-end items-center pt-2">
            {/* Neighbor Display (Static) */}
            <div className="flex-grow flex items-center gap-2">
               <span className="text-xs text-gray-400 uppercase tracking-wide">Neighbor:</span>
               <span className="text-xs text-gray-700 font-mono py-1">
                 {selectedNeighborId ? (
                    availableNeighbors.find(n => n.id === selectedNeighborId) 
                    ? `${availableNeighbors.find(n => n.id === selectedNeighborId)?.author.username}`
                    : "Linked"
                 ) : "None (Auto)"}
               </span>
               {/* Hidden input to submit the value */}
               <input type="hidden" name="neighborId" value={selectedNeighborId || ''} />
            </div>

            {opinion && (
              <button 
                type="button" 
                onClick={() => {
                    setIsEditing(false)
                    if (onSuccess) onSuccess()
                }}
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
      <div 
        className={`
          group relative p-4 rounded transition-all duration-200 cursor-pointer flex flex-col gap-2
          ${skin.container}
          ${skin.hoverEffect}
        `}
      >
        <div className="flex justify-between items-start gap-2">
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${skin.content}`}>
            {opinion.summary}
          </p>
          {opinion.type === 'WHY_NOT' && (
             <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wide flex-shrink-0">
               Rebuttal
             </span>
          )}
        </div>
        
        {/* Citations */}
        {opinion.citations && opinion.citations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {opinion.citations.map((cite, i) => (
              <span key={i} className={`text-xs px-1.5 py-0.5 rounded border ${skin.borderColor} bg-opacity-50 ${skin.footer} flex items-center gap-1`}>
                <span className="opacity-50">ref:</span>
                {cite.opinionSummary?.slice(0, 15)}...
              </span>
            ))}
          </div>
        )}

        <div className={`flex items-center justify-between mt-1 text-xs ${skin.footer}`}>
          <div className="flex items-center gap-3">
             <span className="flex items-center gap-1">
               @{opinion.author?.username || 'user'}
             </span>
             <span className="opacity-50 text-[10px]">
               {new Date(opinion.createdAt).toLocaleDateString()}
             </span>
          </div>
          
          <div className="flex items-center gap-3">
             <span className="flex items-center gap-1" title="Eyes">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={skin.iconStyle}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
               {opinion.eyes}
             </span>
             <span className="flex items-center gap-1" title="Trash">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={skin.iconStyle}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
               {opinion.trash}
             </span>
          </div>
        </div>

        {isOwner && (
           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
             <button 
               onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
               className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); handleDelete() }}
               className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
             </button>
           </div>
        )}
      </div>
    )
}
