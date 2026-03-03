'use client'

import { useState } from 'react'
import Link from 'next/link'
import { setOpinionNeighbor } from '@/app/actions'
import OpinionCard from './OpinionCard'
import OpinionMap from './OpinionMap'
import OpinionDetailView from './OpinionDetailView'
import { Opinion, CitationTarget, FactionWithOpinions, User } from '@/app/types'
import { Eye, Trash2 } from '@/app/components/Icons'

interface FactionContentProps {
  faction: FactionWithOpinions
  user: User | null
  topicId?: string
  isMember?: boolean
  isOtherMember?: boolean
  isPrivateTopic?: boolean
  userMembership?: unknown
}

export default function FactionContent({ faction, user, isPrivateTopic }: FactionContentProps) {
  const currentOpinions = faction.opinions
  
  const [selectedOpinionId, setSelectedOpinionId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [modalStack, setModalStack] = useState<Opinion[]>([])
  const [initialNeighborId, setInitialNeighborId] = useState<string | null>(null)
  
  const userOpinion = user ? currentOpinions.find((o: Opinion) => o.authorId === user.id) : undefined

  // Auto-select removed to avoid popup on load
  // useEffect(() => {
  //   if (userOpinion) {
  //     setSelectedOpinionId(prev => prev === null ? userOpinion.id : prev)
  //   }
  // }, [userOpinion?.id]) 
  
  // Helper to handle citation click
  const handleCitationClick = (target: CitationTarget) => {
    // Check if target is in currentOpinions
    const existing = currentOpinions.find(o => o.id === target.id)
    if (existing) {
        // Enhance existing opinion with faction/topic info from the citation target
        // This ensures even local citations show their context
        const existingWithContext: Opinion = {
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

  const handleSetNeighbor = async (targetId: string) => {
    if (!user) return

    if (userOpinion) {
        try {
            const result = await setOpinionNeighbor(userOpinion.id, targetId)
            if (result?.success) {
                setModalStack([])
                setSelectedOpinionId(null)
            } else {
                alert(result?.error || "Failed to move territory")
            }
        } catch (e) {
            console.error(e)
            alert("Failed to move territory")
        }
    } else {
        setInitialNeighborId(targetId)
        setShowCreateModal(true)
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
              <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
                <span>{faction._count.members} members</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span>{currentOpinions.length} territories</span>
              </div>
            </div>

            {/* Action Button */}
            {user ? (
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-mono" title="Eyes Remaining">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{user.eyesCount ?? 10}</span>
                    </div>
                    <div className="w-px h-3 bg-gray-200"></div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-mono" title="Trash Remaining">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{user.trashCount ?? 10}</span>
                    </div>
                 </div>
                 <button
                   onClick={() => setShowCreateModal(true)}
                   className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                 >
                   {userOpinion ? 'Edit Territory' : 'Claim Territory'}
                 </button>
              </div>
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
         <OpinionMap 
           opinions={currentOpinions}
           selectedId={selectedOpinionId || undefined}
           onSelect={(id) => {
             setSelectedOpinionId(id)
             const opinion = currentOpinions.find(o => o.id === id)
             if (opinion) {
                 setModalStack([opinion])
             }
           }}
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
                 onCitationClick={handleCitationClick}
                 canSetNeighbor={index === 0 && !!user && opinion.authorId !== user.id} // Can set if logged in, not own opinion, and is the primary view (not a citation popup)
                 hasUserPosted={!!userOpinion}
                 onSetNeighbor={handleSetNeighbor}
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
                  isPrivateTopic={!!isPrivateTopic}
                  onSuccess={() => {
                    setShowCreateModal(false)
                    setInitialNeighborId(null) // Reset
                  }}
                  initialIsEditing={!!userOpinion}
                  availableNeighbors={currentOpinions}
                  initialNeighborId={initialNeighborId}
                />
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
