'use client'

import { useState } from 'react'
import Link from 'next/link'
import OpinionCard from './OpinionCard'

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
  // Actually, let's separate user opinion from others for clarity as before
  const userOpinion = user ? currentOpinions.find((o: Opinion) => o.authorId === user.id) : undefined
  const otherOpinions = currentOpinions
    .filter((o: Opinion) => !user || o.authorId !== user.id)
    .sort((a: Opinion, b: Opinion) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const tabColor = activeTab === 'WHY' ? 'text-green-700' : 'text-red-700'

  return (
    <div className="w-full bg-white h-full flex flex-col">
      {/* Unified Header Section */}
      <div className="bg-white text-gray-900 px-6 pt-4 pb-0 relative flex-shrink-0 border-b border-gray-100">
        
        <div className="relative z-10">
          
          {faction.description && (
            <p className="text-gray-600 text-sm leading-relaxed pl-3 border-l-2 border-gray-200 italic mb-6">
              {faction.description}
            </p>
          )}

          {/* Tab Navigation - Compact Toggle */}
          <div className="flex justify-start mt-2 mb-4 border-b border-transparent">
            <div 
              className="relative flex items-center bg-gray-100 rounded-full p-1 cursor-pointer w-32 h-8 select-none shadow-inner" 
              onClick={() => setActiveTab(activeTab === 'WHY' ? 'WHY_NOT' : 'WHY')}
            >
              {/* Circular Slider */}
              <div 
                className={`absolute top-1 bottom-1 w-6 h-6 rounded-full transition-all duration-300 ease-in-out shadow-sm transform ${
                  activeTab === 'WHY' 
                    ? 'translate-x-0 bg-green-500' 
                    : 'translate-x-24 bg-red-500'
                }`}
              ></div>

              {/* Text Labels */}
              <div className={`flex-1 text-center text-xs font-bold z-10 transition-colors duration-300 ${activeTab === 'WHY' ? 'text-gray-900' : 'text-gray-400'}`}>
                WHY
              </div>
              <div className={`flex-1 text-center text-xs font-bold z-10 transition-colors duration-300 ${activeTab === 'WHY_NOT' ? 'text-gray-900' : 'text-gray-400'}`}>
                WHY NOT
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-grow p-6 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* User's Opinion (Input or Edit) */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${tabColor} opacity-70 flex items-center gap-2`}>
              {user ? 'Your Perspective' : 'Join the discussion'}
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

          {/* Community Opinions */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${tabColor} opacity-70 flex items-center gap-2`}>
              Community Arguments ({otherOpinions.length})
              <span className="h-px flex-grow bg-current opacity-20"></span>
            </h3>
            
            <div className="space-y-0">
              {otherOpinions.length > 0 ? (
                otherOpinions.map((opinion: Opinion) => (
                  <OpinionCard 
            key={opinion.id}
            opinion={opinion}
            factionId={faction.id}
            type={activeTab}
            currentUser={user}
            isPrivateTopic={isPrivateTopic}
          />
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 italic bg-white/50 rounded-xl border border-transparent">
                  {activeTab === 'WHY' 
                    ? 'No arguments for joining yet. Be the first!' 
                    : 'No counter-arguments yet. Everything looks good?'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
