'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import OpinionCard from './OpinionCard'
import OpinionMap from './OpinionMap'

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
  const [activeTab, setActiveTab] = useState<'WHY' | 'WHY_NOT'>('WHY')
  const [selectedOpinionId, setSelectedOpinionId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Filter opinions based on activeTab
  const currentOpinions = faction.opinions.filter((o: Opinion) => o.type === activeTab)
  
  const userOpinion = user ? currentOpinions.find((o: Opinion) => o.authorId === user.id) : undefined

  // Auto-select user's opinion initially if exists, but only once
  useEffect(() => {
    if (userOpinion) {
      // Only set if nothing selected yet
      setSelectedOpinionId(prev => prev === null ? userOpinion.id : prev)
    }
  }, [userOpinion?.id, activeTab]) // Re-run when tab changes

  const tabColor = activeTab === 'WHY' ? 'text-green-700' : 'text-red-700'

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
              <div 
                className={`relative flex items-center rounded-full p-0.5 cursor-pointer w-20 h-6 select-none transition-colors duration-300 ${
                  activeTab === 'WHY' ? 'bg-green-500' : 'bg-red-500'
                }`}
                onClick={() => {
                  setActiveTab(activeTab === 'WHY' ? 'WHY_NOT' : 'WHY')
                  setSelectedOpinionId(null) // Reset selection on tab switch
                }}
              >
                {/* Text Labels Layer */}
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <span className={`text-[10px] font-bold text-white whitespace-nowrap transition-opacity duration-300 ${activeTab === 'WHY_NOT' ? 'opacity-100' : 'opacity-0'} leading-none`}>
                    WHY NOT
                  </span>
                  <span className={`text-[10px] font-bold text-white whitespace-nowrap transition-opacity duration-300 ${activeTab === 'WHY' ? 'opacity-100' : 'opacity-0'} leading-none`}>
                    WHY
                  </span>
                </div>

                {/* White Circular Slider */}
                <div 
                  className={`absolute top-0.5 bottom-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out transform ${
                    activeTab === 'WHY' 
                      ? 'translate-x-0' 
                      : 'translate-x-14'
                  }`}
                ></div>
              </div>
              
              <div className="text-xs text-gray-400 font-mono">
                {currentOpinions.length} territories
              </div>
            </div>

            {/* Action Button */}
            {user ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded border transition-colors ${
                  activeTab === 'WHY' 
                    ? 'border-green-200 text-green-700 hover:bg-green-50' 
                    : 'border-red-200 text-red-700 hover:bg-red-50'
                }`}
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
      <div className="flex-grow relative bg-gray-50 overflow-y-auto flex flex-col">
        <div className="min-h-full w-full flex items-center justify-center p-4">
           <OpinionMap 
             opinions={currentOpinions}
             selectedId={selectedOpinionId || undefined}
             onSelect={setSelectedOpinionId}
           />
        </div>
      </div>

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
                  type={activeTab}
                  currentUser={user}
                  isPrivateTopic={isPrivateTopic}
                  onSuccess={() => setShowCreateModal(false)}
                  initialIsEditing={!!userOpinion}
                  availableNeighbors={currentOpinions}
                />
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
