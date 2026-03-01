'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import OpinionCard from './OpinionCard'
import OpinionMap from './OpinionMap'
import OpinionDetailView from './OpinionDetailView'

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
  faction?: {
    name: string
    topic?: {
      title: string
    }
  }
}

interface FactionWithOpinions {
  id: string
  name: string
  description: string | null
  _count: { members: number }
  opinions: Opinion[]
}

type User = { id: string; username: string } | null

interface FactionContentProps {
  faction: FactionWithOpinions
  user: User
  userMembership?: unknown
  topicId: string
  isMember: boolean
  isOtherMember: boolean
  isPrivateTopic?: boolean
}

export default function FactionContent({ 
  faction, 
  user, 
  topicId,
  isMember,
  isOtherMember,
  isPrivateTopic
}: FactionContentProps) {
  const currentOpinions = faction.opinions
  
  const [selectedOpinionId, setSelectedOpinionId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [modalStack, setModalStack] = useState<Opinion[]>([])
  
  // Neighbor Selection Mode
  const [isSelectingNeighbor, setIsSelectingNeighbor] = useState(false)
  const [pendingNeighborId, setPendingNeighborId] = useState<string | null>(null)

  const userOpinion = user ? currentOpinions.find((o: Opinion) => o.authorId === user.id) : undefined

  // Handle map selection
  const handleMapSelect = (id: string) => {
    if (isSelectingNeighbor) {
      // In selection mode: confirm selection and exit mode
      setPendingNeighborId(id)
      setIsSelectingNeighbor(false)
      setShowCreateModal(true) // Re-open modal
    } else {
      // Normal mode: select opinion
      setSelectedOpinionId(id)
    }
  }

  // Handle entering selection mode
  const handleRequestNeighborSelection = () => {
    setIsSelectingNeighbor(true)
    setShowCreateModal(false) // Temporarily hide modal
    // Optional: Show a toast or banner indicating "Select a neighbor on the map"
  }

  // Handle cancelling selection mode (e.g. via ESC or button)
  const cancelSelection = () => {
    setIsSelectingNeighbor(false)
    setShowCreateModal(true)
  }
  useEffect(() => {
    if (selectedOpinionId) {
        // If the selectedOpinionId is already in the stack (e.g. at index 0), do nothing
        // This prevents resetting the stack when we just want to initialize it
        // However, if we click a new block on the map, we want to reset the stack
        
        // Simple logic: if stack is empty or the first item is different, reset stack
        if (modalStack.length === 0 || modalStack[0].id !== selectedOpinionId) {
            const opinion = currentOpinions.find(o => o.id === selectedOpinionId)
            if (opinion) {
                setModalStack([opinion])
            }
        }
    } else {
        // Only clear if we explicitly set it to null (which happens in closeTopModal when stack empties)
        if (modalStack.length > 0) {
            setModalStack([])
        }
    }
  }, [selectedOpinionId])

  // Helper to handle citation click
  const handleCitationClick = (target: CitationTarget) => {
    // Check if target is in currentOpinions
    const existing = currentOpinions.find(o => o.id === target.id)
    if (existing) {
        // Enhance existing opinion with faction/topic info from the citation target
        // This ensures even local citations show their context
        const existingWithContext = {
            ...existing,
            faction: target.faction
        }
        setModalStack(prev => [...prev, existingWithContext])
    } else {
        // Construct a partial opinion object for display
        // We need to cast it to Opinion or make OpinionDetailView accept a union
        // For now, we cast it since CitationTarget has similar fields
        const partialOpinion = {
            ...target,
            authorId: '', // placeholder
            createdAt: new Date(),
            citations: [],
            citedBy: [],
            factionId: '', // placeholder
            faction: target.faction // Explicitly include faction context
        } as unknown as Opinion // Force cast for now
        setModalStack(prev => [...prev, partialOpinion])
    }
  }

  const closeTopModal = () => {
    if (modalStack.length <= 1) {
      setModalStack([])
      setSelectedOpinionId(null)
    } else {
      setModalStack(prev => prev.slice(0, -1))
    }
  } 

  return (
    <div className="w-full bg-white h-full flex flex-col overflow-hidden relative">
      {/* Unified Header Section */}
      <div className="bg-white text-gray-900 px-6 pt-4 pb-0 relative flex-shrink-0 border-b border-gray-100 z-10">
        
        <div className="relative z-10">
          
          {faction.description && (
            <p className="text-gray-600 text-sm leading-relaxed pl-3 border-l-2 border-gray-200 italic mb-6">
              {faction.description}
            </p>
          )}

          {/* Tab Navigation & Actions */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-400 font-mono">
                {currentOpinions.length} territories
              </div>
            </div>

            {/* Action Button */}
            {user ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {userOpinion ? 'Edit Territory' : 'Claim Territory'}
              </button>
            ) : (
              <Link 
                href="/login" 
                className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                Login to Claim
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Map Area - Takes available space */}
      <div className="flex-grow relative bg-gray-50 overflow-hidden flex flex-col">
         {isSelectingNeighbor && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <span>Select a neighbor on the map</span>
                <button 
                    onClick={cancelSelection}
                    className="bg-gray-700 hover:bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                    ✕
                </button>
            </div>
         )}
         <OpinionMap 
           opinions={currentOpinions}
           selectedId={selectedOpinionId || undefined}
           onSelect={handleMapSelect}
           currentUser={user}
           isSelectionMode={isSelectingNeighbor}
         />
      </div>

      {/* View Detail Modal (Stacked) */}
      {modalStack.map((opinion, index) => (
        <div 
            key={opinion.id + index}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
            style={{ zIndex: 40 + index }} // Stack z-index
        >
          <div className="bg-white rounded shadow-xl w-full max-w-lg h-[80%] max-h-[800px] flex flex-col overflow-hidden relative">
             
             <div className="p-6 h-full">
               <OpinionDetailView 
                 opinion={opinion} 
                 onClose={closeTopModal}
                 onCitationClick={(target: any) => handleCitationClick(target)}
               />
             </div>
          </div>
        </div>
      ))}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg max-h-[90%] flex flex-col overflow-hidden relative">
             <button 
               onClick={() => setShowCreateModal(false)}
               className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
             >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
             
             <div className="p-6 overflow-y-auto">
               <h3 className="text-lg font-bold mb-4 text-gray-800">
                 {userOpinion ? 'Edit Your Territory' : 'Claim Your Territory'}
               </h3>
               <OpinionCard 
                  key={userOpinion?.id || 'new'}
                  opinion={userOpinion}
                  factionId={faction.id}
                  type="WHY" 
                  currentUser={user}
                  isPrivateTopic={isPrivateTopic}
                  onSuccess={() => setShowCreateModal(false)}
                  initialIsEditing={!!userOpinion}
                  availableNeighbors={currentOpinions}
                  onRequestNeighborSelection={handleRequestNeighborSelection}
                  selectedNeighborId={pendingNeighborId}
                />
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
