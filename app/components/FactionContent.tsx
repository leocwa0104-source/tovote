'use client'

import { useState } from 'react'
import Link from 'next/link'
import OpinionCard from './OpinionCard'
import TerritoryMap from './TerritoryMap'

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

  // Filter opinions based on activeTab
  const currentOpinions = faction.opinions.filter((o: Opinion) => o.type === activeTab)
  
  // Sort opinions: User's own opinion first (if exists), then by date (newest first)
  const userOpinion = user ? currentOpinions.find((o: Opinion) => o.authorId === user.id) : undefined
  const otherOpinions = currentOpinions
    .filter((o: Opinion) => !user || o.authorId !== user.id)
    .sort((a: Opinion, b: Opinion) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const tabColor = activeTab === 'WHY' ? 'text-green-700' : 'text-red-700'
  const tabBgColor = activeTab === 'WHY' ? 'bg-green-500' : 'bg-red-500'

  return (
    <div className="w-full bg-white h-full flex flex-col">
      {/* Unified Header Section */}
      <div className="bg-white text-gray-900 px-6 pt-4 pb-0 relative flex-shrink-0 border-b border-gray-100 z-10">
        
        <div className="relative z-10">
          
          {faction.description && (
            <p className="text-gray-600 text-sm leading-relaxed pl-3 border-l-2 border-gray-200 italic mb-6">
              {faction.description}
            </p>
          )}

          {/* Tab Navigation - Compact Toggle */}
          <div className="flex justify-start mt-2 mb-4 border-b border-transparent">
            <div 
              className={`relative flex items-center rounded-full p-0.5 cursor-pointer w-20 h-6 select-none transition-colors duration-300 ${tabBgColor}`}
              onClick={() => setActiveTab(activeTab === 'WHY' ? 'WHY_NOT' : 'WHY')}
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
          </div>
        </div>
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-grow flex flex-col overflow-hidden relative">
        {/* User's Territory (Pinned) */}
        <div className="flex-shrink-0 px-6 pt-6 pb-2 bg-gradient-to-b from-white via-white/95 to-transparent z-10">
           <div className="max-w-4xl mx-auto">
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${tabColor} opacity-70 flex items-center gap-2`}>
                {user ? 'Your Territory' : 'Claim Territory'}
                <span className="h-px flex-grow bg-current opacity-20"></span>
              </h3>
              
              {user ? (
                 <OpinionCard 
                  key={`user-${activeTab}`} // Force re-render on tab switch
                  opinion={userOpinion}
                  factionId={faction.id}
                  type={activeTab}
                  currentUser={user}
                  isPrivateTopic={isPrivateTopic}
                />
              ) : (
                <div className="bg-white/50 p-6 rounded-lg text-center border border-dashed border-gray-300">
                  <p className="text-gray-500 mb-2">Sign in to share your thoughts</p>
                  <Link href="/login" className="text-blue-600 font-bold hover:underline">
                    Login / Register
                  </Link>
                </div>
              )}
           </div>
        </div>

        {/* Community Territory Map */}
        <div className="flex-grow overflow-hidden relative px-2">
            <div className="h-full max-w-4xl mx-auto flex flex-col">
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 px-4 ${tabColor} opacity-70 flex items-center gap-2 mt-4`}>
                Territory Map ({otherOpinions.length})
                <span className="h-px flex-grow bg-current opacity-20"></span>
              </h3>
              
              <div className="flex-grow overflow-hidden relative rounded-lg border border-gray-100 bg-gray-50/30">
                 <TerritoryMap 
                    opinions={otherOpinions}
                    type={activeTab}
                    factionId={faction.id}
                    currentUser={user}
                    isPrivateTopic={isPrivateTopic}
                    className="h-full w-full"
                 />
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}
