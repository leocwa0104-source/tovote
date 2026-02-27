'use client'

import { useState } from 'react'
import Link from 'next/link'
import OpinionCard from './OpinionCard'
import { joinFaction, leaveFaction } from '@/app/actions'

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
}

export default function FactionContent({ 
  faction, 
  user, 
  topicId,
  isMember,
  isOtherMember 
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
      <div className="bg-white text-gray-900 p-6 md:p-8 relative flex-shrink-0 border-b border-gray-100">
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-2 tracking-tight break-words">{faction.name}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-gray-500 text-xs font-medium px-2 py-0.5 rounded bg-gray-100 border border-gray-200 whitespace-nowrap">
                  {faction._count.members} Members
                </span>
                {isMember && (
                  <span className="text-green-600 text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Member
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 w-full md:w-auto">
              {!user ? (
                 <button disabled className="w-full md:w-auto py-1.5 px-3 bg-gray-50 text-gray-400 rounded border border-gray-200 font-medium cursor-not-allowed text-sm">
                   Login to Join
                 </button>
              ) : isMember ? (
                <form action={leaveFaction.bind(null, topicId)}>
                  <button className="w-full md:w-auto py-1.5 px-3 bg-white text-red-500 rounded hover:bg-red-50 font-medium transition-colors border border-red-200 text-sm">
                    Leave
                  </button>
                </form>
              ) : (
                <form action={joinFaction.bind(null, topicId, faction.id)}>
                  <button 
                    className={`w-full md:w-auto py-1.5 px-3 rounded font-medium transition-colors border text-sm ${
                      isOtherMember 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {isOtherMember ? 'Switch' : 'Join'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {faction.description && (
            <p className="text-gray-600 text-sm leading-relaxed pl-3 border-l-2 border-gray-200 italic mb-6">
              {faction.description}
            </p>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-6 mt-2 border-b border-transparent">
            <button
              onClick={() => setActiveTab('WHY')}
              className={`pb-2 text-sm font-bold transition-all duration-200 focus:outline-none flex items-center gap-2 border-b-2 ${
                activeTab === 'WHY' 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>✅</span> Why Join?
            </button>
            <button
              onClick={() => setActiveTab('WHY_NOT')}
              className={`pb-2 text-sm font-bold transition-all duration-200 focus:outline-none flex items-center gap-2 border-b-2 ${
                activeTab === 'WHY_NOT' 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>❌</span> Why Not?
            </button>
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
