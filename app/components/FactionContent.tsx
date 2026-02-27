'use client'

import { useState } from 'react'
import Link from 'next/link'
import OpinionCard from './OpinionCard'
import { joinFaction, leaveFaction } from '@/app/actions'

interface FactionContentProps {
  faction: any
  user: any
  userMembership: any
  topicId: string
  isMember: boolean
  isOtherMember: boolean
}

export default function FactionContent({ 
  faction, 
  user, 
  userMembership, 
  topicId,
  isMember,
  isOtherMember 
}: FactionContentProps) {
  const [activeTab, setActiveTab] = useState<'WHY' | 'WHY_NOT'>('WHY')

  // Filter opinions based on activeTab
  const currentOpinions = faction.opinions.filter((o: any) => o.type === activeTab)
  
  // Sort opinions: User's own opinion first (if exists), then by date (newest first)
  // Actually, let's separate user opinion from others for clarity as before
  const userOpinion = user ? currentOpinions.find((o: any) => o.authorId === user.id) : null
  const otherOpinions = currentOpinions
    .filter((o: any) => !user || o.authorId !== user.id)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const tabColor = activeTab === 'WHY' ? 'text-green-700' : 'text-red-700'
  const tabBg = activeTab === 'WHY' ? 'bg-green-50' : 'bg-red-50'

  return (
    <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
      {/* Unified Header Section */}
      <div className="bg-slate-900 text-white p-8 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 text-gray-400 text-sm mb-2">
                <Link href={`/topic/${topicId}`} className="hover:text-white transition-colors flex items-center gap-1">
                  <span>&larr;</span> Back to {faction.topic.title}
                </Link>
              </div>
              <h1 className="text-4xl font-bold mb-3 tracking-tight">{faction.name}</h1>
              <div className="flex items-center gap-4">
                <span className="bg-white/10 text-white text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                  {faction._count.members} Members
                </span>
                {isMember && (
                  <span className="text-green-400 text-sm font-medium flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    You are a member
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0">
              {!user ? (
                 <button disabled className="py-2.5 px-6 bg-white/10 text-gray-400 rounded-lg font-medium cursor-not-allowed border border-white/5">
                   Login to Join
                 </button>
              ) : isMember ? (
                <form action={leaveFaction.bind(null, topicId)}>
                  <button className="py-2.5 px-6 bg-red-500/20 text-red-200 rounded-lg hover:bg-red-500/30 font-medium transition-colors border border-red-500/30">
                    Leave Faction
                  </button>
                </form>
              ) : (
                <form action={joinFaction.bind(null, topicId, faction.id)}>
                  <button 
                    className={`py-2.5 px-6 rounded-lg font-medium transition-colors border shadow-lg ${
                      isOtherMember 
                        ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600' 
                        : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                    }`}
                  >
                    {isOtherMember ? 'Switch to this Faction' : 'Join Faction'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {faction.description && (
            <p className="text-gray-300 text-lg leading-relaxed max-w-3xl border-l-4 border-white/20 pl-4 italic">
              "{faction.description}"
            </p>
          )}
        </div>
      </div>

      {/* Tab Navigation (Slider) */}
      <div className="border-b border-gray-100 bg-gray-50/50 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-md mx-auto py-4 px-4">
          <div className="relative flex bg-gray-200/50 p-1 rounded-xl">
            {/* Sliding background for active tab could be added with Framer Motion, but simple CSS active state works too */}
            <button
              onClick={() => setActiveTab('WHY')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none flex items-center justify-center gap-2 ${
                activeTab === 'WHY' 
                  ? 'bg-white text-green-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <span>✅</span> Why Join?
            </button>
            <button
              onClick={() => setActiveTab('WHY_NOT')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none flex items-center justify-center gap-2 ${
                activeTab === 'WHY_NOT' 
                  ? 'bg-white text-red-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <span>❌</span> Why Not?
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Content Area */}
      <div className={`flex-grow p-6 md:p-10 transition-colors duration-300 ${tabBg} min-h-[500px]`}>
        <div className="max-w-3xl mx-auto">
          {/* User's Opinion (Input or Edit) */}
          <div className="mb-10">
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${tabColor} opacity-70 flex items-center gap-2`}>
              {user ? 'Your Perspective' : 'Join the discussion'}
              <span className="h-px flex-grow bg-current opacity-20"></span>
            </h3>
            
            {user ? (
               <OpinionCard 
                key={`user-${activeTab}`} // Force re-render on tab switch to reset internal state if needed
                opinion={userOpinion}
                factionId={faction.id}
                type={activeTab}
                currentUser={user}
              />
            ) : (
              <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 mb-4">Log in to contribute your arguments.</p>
                <Link href="/login" className="text-blue-600 hover:underline font-medium">Go to Login</Link>
              </div>
            )}
          </div>

          {/* Community Opinions */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${tabColor} opacity-70 flex items-center gap-2`}>
              Community Arguments ({otherOpinions.length})
              <span className="h-px flex-grow bg-current opacity-20"></span>
            </h3>
            
            <div className="space-y-4">
              {otherOpinions.length > 0 ? (
                otherOpinions.map((opinion: any) => (
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
