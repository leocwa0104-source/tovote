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

  const selectedOpinion = selectedOpinionId 
    ? currentOpinions.find(o => o.id === selectedOpinionId) 
    : undefined

  const tabColor = activeTab === 'WHY' ? 'text-green-700' : 'text-red-700'

  return (
    <div className="w-full bg-white h-full flex flex-col overflow-hidden">
      {/* Unified Header Section */}
      <div className="bg-white text-gray-900 px-6 pt-4 pb-0 relative flex-shrink-0 border-b border-gray-100 z-10">
        
        <div className="relative z-10">
          
          {faction.description && (
            <p className="text-gray-600 text-sm leading-relaxed pl-3 border-l-2 border-gray-200 italic mb-6">
              {faction.description}
            </p>
          )}

          {/* Tab Navigation - Compact Toggle */}
          <div className="flex justify-between items-end mb-4">
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

      {/* Detail / Action Panel - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 max-h-[40vh] overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-xs font-bold uppercase tracking-widest ${tabColor} opacity-70 flex items-center gap-2`}>
              {selectedOpinion ? (
                userOpinion?.id === selectedOpinion.id ? 'Your Territory' : 'Territory Detail'
              ) : (
                userOpinion ? 'Select a Territory' : 'Claim Territory'
              )}
              <span className="h-px w-12 bg-current opacity-20"></span>
            </h3>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              {selectedOpinionId && (
                 <button 
                   onClick={() => setSelectedOpinionId(null)}
                   className="text-xs text-gray-400 hover:text-gray-600 underline"
                 >
                   Close
                 </button>
              )}
            </div>
          </div>

          {selectedOpinion ? (
            <OpinionCard 
              key={selectedOpinion.id}
              opinion={selectedOpinion}
              factionId={faction.id}
              type={activeTab}
              currentUser={user}
              isPrivateTopic={isPrivateTopic}
            />
          ) : (
            user ? (
              !userOpinion ? (
                <OpinionCard 
                  key="new"
                  opinion={undefined}
                  factionId={faction.id}
                  type={activeTab}
                  currentUser={user}
                  isPrivateTopic={isPrivateTopic}
                />
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  <p className="mb-2">You have already claimed a territory in this faction.</p>
                  <button 
                    onClick={() => setSelectedOpinionId(userOpinion.id)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition-colors"
                  >
                    View Your Territory
                  </button>
                </div>
              )
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-200">
                <p className="text-gray-500 mb-2">Sign in to claim your territory on the map</p>
                <Link href="/login" className="text-blue-600 font-bold hover:underline">
                  Login / Register
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
