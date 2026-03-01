'use client'

import { joinFaction, leaveFaction } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface FactionListItem {
  id: string
  name: string
  seekBrainstorming?: boolean
  seekRational?: boolean
  _count: { members: number }
}

interface FactionListProps {
  topicId: string
  factions: FactionListItem[]
  currentFactionId?: string | null
  selectedFactionId?: string | null
  isCreatingFaction?: boolean
  user: { id: string } | null
}

export default function FactionList({ 
  topicId, 
  factions, 
  currentFactionId, 
  selectedFactionId,
  isCreatingFaction,
  user
}: FactionListProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredFactions = useMemo(() => {
    if (!normalizedQuery) return factions

    const keywords = normalizedQuery.split(/[\s,，.。;；]+/).filter(Boolean)
    // Filter out whitespace and punctuation for character matching
    const chars = normalizedQuery.split('').filter(c => !/[\s,，.。;；]/.test(c))
    
    if (keywords.length === 0 && chars.length === 0) return factions

    return factions
      .map(faction => {
        const name = faction.name.toLowerCase()
        let matchCount = 0
        
        // 1. Exact phrase match (highest priority)
        if (name.includes(normalizedQuery)) matchCount += 100
        
        // 2. Keyword match (medium priority)
        keywords.forEach(k => {
          if (name.includes(k)) matchCount += 10
        })

        // 3. Character fuzzy match (low priority, but enables "一天三千元" -> "如何一天赚三千元")
        chars.forEach(c => {
          if (name.includes(c)) matchCount += 1
        })
        
        return { faction, matchCount }
      })
      .filter(item => item.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .map(item => item.faction)
  }, [factions, normalizedQuery])
  const hasExact = useMemo(() => {
    const nq = normalizedQuery
    if (!nq) return false
    return factions.some((f) => f.name.trim().toLowerCase() === nq)
  }, [factions, normalizedQuery])

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 px-2">Factions</h3>

      <div className="px-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索阵营…"
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
      </div>

      {filteredFactions.map((faction) => {
        const isMember = currentFactionId === faction.id
        const isSelected = selectedFactionId === faction.id
        
        return (
          <div
            key={faction.id}
            onClick={() => router.push(`/topic/${topicId}?factionId=${faction.id}`)}
            className={`
              group relative p-4 rounded-lg border transition-all duration-200 overflow-hidden cursor-pointer
              ${isSelected 
                ? 'bg-white border-gray-900 shadow-sm' 
                : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            {(faction.seekBrainstorming || faction.seekRational) && (
              <div className="absolute top-0 left-4 flex gap-1">
                {faction.seekBrainstorming && <div className="w-1.5 h-3 bg-orange-400 rounded-b-sm shadow-sm" title="Brainstorming" />}
                {faction.seekRational && <div className="w-1.5 h-3 bg-teal-400 rounded-b-sm shadow-sm" title="Rational" />}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                    {faction.name}
                  </h4>
                </div>
                {isMember && (
                  <span className="w-2 h-2 rounded-full bg-green-500" title="Your Faction"></span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{faction._count.members} members</span>
                
                <div onClick={(e) => e.stopPropagation()}>
                  {!user ? (
                    <button disabled className="py-1 px-2 bg-gray-50 text-gray-400 rounded border border-gray-200 font-medium cursor-not-allowed text-xs">
                      Login
                    </button>
                  ) : isMember ? (
                    <form action={leaveFaction.bind(null, topicId)}>
                      <button className="py-1 px-2 bg-white text-red-500 rounded hover:bg-red-50 font-medium transition-colors border border-red-200 text-xs">
                        Leave
                      </button>
                    </form>
                  ) : (
                    <form action={joinFaction.bind(null, topicId, faction.id)}>
                      <button 
                        className={`py-1 px-2 rounded font-medium transition-colors border text-xs ${
                          currentFactionId 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        {currentFactionId ? 'Switch' : 'Join'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {factions.length === 0 && (
        <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          No factions yet.
        </div>
      )}

      {factions.length > 0 && filteredFactions.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-400">没有匹配的阵营</div>
      )}

      {normalizedQuery && !hasExact && (
        <button
          onClick={() => router.push(`/topic/${topicId}?createFaction=1&factionName=${encodeURIComponent(query.trim())}`)}
          className="mx-2 mt-1 px-3 py-2 rounded-md text-sm bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-left"
        >
          ➕ 创建新阵营：{query.trim()}
        </button>
      )}
    </div>
  )
}
