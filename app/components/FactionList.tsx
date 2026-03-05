'use client'

import { joinFaction, leaveFaction, rechargeFaction } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { VotePackage } from '@/app/types'

interface FactionListItem {
  id: string
  name: string
  seekBrainstorming?: boolean
  seekRational?: boolean
  _count: { members: number }
  paidVoteCount: number
}

interface FactionListProps {
  topicId: string
  factions: FactionListItem[]
  currentFactionId?: string | null
  selectedFactionId?: string | null
  user: { id: string } | null
  votePackages?: VotePackage[]
}

export default function FactionList({ 
  topicId, 
  factions, 
  currentFactionId, 
  selectedFactionId,
  user,
  votePackages = []
}: FactionListProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [rechargingFactionId, setRechargingFactionId] = useState<string | null>(null)
  const [isRecharging, setIsRecharging] = useState(false)

  const handleRecharge = async (factionId: string, votePackageId: string) => {
    if (!user) return
    setIsRecharging(true)
    try {
      const res = await rechargeFaction(topicId, factionId, votePackageId)
      if (res.success) {
        setRechargingFactionId(null)
        // Optionally show success message
      } else {
        alert(res.error || 'Failed to recharge')
      }
    } catch (e) {
      console.error(e)
      alert('An error occurred')
    } finally {
      setIsRecharging(false)
    }
  }

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
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-600">{faction._count.members + (faction.paidVoteCount || 0)} votes</span>
                    <span>·</span>
                    <span>{faction._count.members} members</span>
                  </div>
                  
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                    {user && (
                      <button 
                        onClick={() => setRechargingFactionId(faction.id === rechargingFactionId ? null : faction.id)}
                        className="p-1 rounded hover:bg-amber-50 text-amber-500 transition-colors"
                        title="Boost Faction"
                      >
                        ⚡
                      </button>
                    )}

                    {!user ? (
                      <button disabled className="py-1 px-2 bg-gray-50 text-gray-400 rounded border border-gray-200 font-medium cursor-not-allowed text-xs">
                        Login
                      </button>
                    ) : isMember ? (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm('Are you sure you want to leave this faction?')) return
                          try {
                            const res = await leaveFaction(topicId)
                            if (!res.success) alert(res.error || 'Failed to leave faction')
                          } catch (err) {
                            console.error(err)
                            alert('An error occurred')
                          }
                        }}
                        className="py-1 px-2 bg-white text-red-500 rounded hover:bg-red-50 font-medium transition-colors border border-red-200 text-xs"
                      >
                        Leave
                      </button>
                    ) : (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            const res = await joinFaction(topicId, faction.id)
                            if (!res.success) alert(res.error || 'Failed to join faction')
                          } catch (err) {
                            console.error(err)
                            alert('An error occurred')
                          }
                        }}
                        className={`py-1 px-2 rounded font-medium transition-colors border text-xs ${
                          currentFactionId 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        {currentFactionId ? 'Switch' : 'Join'}
                      </button>
                    )}
                  </div>
                </div>

                {rechargingFactionId === faction.id && (
                  <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100 text-xs shadow-sm animate-in fade-in slide-in-from-top-1" onClick={(e) => e.stopPropagation()}>
                    <div className="font-bold text-amber-800 mb-2 flex justify-between items-center">
                      <span>Use Tickets to Vote</span>
                      <button onClick={() => setRechargingFactionId(null)} className="text-amber-400 hover:text-amber-600">✕</button>
                    </div>
                    <div className="flex flex-col gap-2 mb-2">
                      {votePackages.length > 0 ? (
                        votePackages.map(pkg => (
                          <button 
                            key={pkg.id}
                            onClick={() => handleRecharge(faction.id, pkg.id)}
                            disabled={isRecharging}
                            className="w-full py-1 px-2 bg-white border border-amber-300 rounded text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors text-left flex justify-between"
                          >
                            <span>{pkg.label}</span>
                            <span className="opacity-75">{pkg.cost} Ticket{pkg.cost > 1 ? 's' : ''}</span>
                          </button>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 py-2">No voting options available</div>
                      )}
                    </div>
                    <div className="text-[10px] text-amber-600 text-center">
                      * Can support once per cooldown period
                    </div>
                  </div>
                )}
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
