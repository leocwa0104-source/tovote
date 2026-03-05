'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { setOpinionNeighbor, rechargeFaction, getActiveVoteOptions } from '@/app/actions'
import OpinionCard from './OpinionCard'
import OpinionMap from './OpinionMap'
import OpinionDetailView from './OpinionDetailView'
import { Opinion, CitationTarget, FactionWithOpinions, User, VoteOption } from '@/app/types'

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
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [voteLoading, setVoteLoading] = useState(false)
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([])

  useEffect(() => {
    getActiveVoteOptions().then(setVoteOptions)
  }, [])

  const handleVote = async (optionId: string) => {
    if (!user || !faction.topicId) return
    setVoteLoading(true)
    try {
      const res = await rechargeFaction(faction.topicId, faction.id, optionId)
      if (res.success) {
        setShowVoteModal(false)
      } else {
        alert(res.error || 'Vote failed')
      }
    } catch {
      alert('Vote failed')
    } finally {
      setVoteLoading(false)
    }
  }

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
                 <button
                   onClick={() => setShowVoteModal(true)}
                   className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-black text-white hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-1"
                 >
                   <span>Use Tickets</span>
                 </button>
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

      {/* Vote Modal */}
      {showVoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setShowVoteModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              ✕
            </button>
            
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2">Vote for Faction</h3>
              <p className="text-sm text-gray-500 mb-6">
                Use your tickets to boost this faction&apos;s influence.
              </p>
              
              <div className="space-y-3">
                {voteOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    disabled={voteLoading}
                    className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <span className="font-medium text-gray-900 group-hover:text-indigo-700">{opt.label}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{opt.ticketCost} 🎟️</span>
                      <span className="text-indigo-600 font-bold">+{opt.voteValue}</span>
                    </div>
                  </button>
                ))}
                
                {voteOptions.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">No voting options available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                 user={user}
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
