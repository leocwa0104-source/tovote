'use client'

import Link from 'next/link'
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
}

export default function FactionList({ 
  topicId, 
  factions, 
  currentFactionId, 
  selectedFactionId,
  isCreatingFaction
}: FactionListProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredFactions = useMemo(() => {
    if (!normalizedQuery) return factions
    return factions.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
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
          <Link
            key={faction.id}
            href={`/topic/${topicId}?factionId=${faction.id}`}
            className={`
              group relative p-4 rounded-lg border transition-all duration-200
              ${isSelected 
                ? 'bg-white border-gray-900 shadow-sm' 
                : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                    {faction.name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs">
                    {faction.seekBrainstorming && <span title="Brainstorming">🧠</span>}
                    {faction.seekRational && <span title="Rational">📊</span>}
                  </div>
                </div>
                {isMember && (
                  <span className="w-2 h-2 rounded-full bg-green-500" title="Your Faction"></span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{faction._count.members} members</span>
                {isSelected && (
                  <span className="text-gray-900 font-medium">Selected</span>
                )}
              </div>
            </div>
          </Link>
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
