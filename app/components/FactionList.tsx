'use client'

import Link from 'next/link'
import { joinFaction, leaveFaction } from '@/app/actions'

interface FactionListProps {
  topicId: string
  factions: any[]
  currentFactionId?: string | null
  selectedFactionId?: string | null
  user: any
}

export default function FactionList({ 
  topicId, 
  factions, 
  currentFactionId, 
  selectedFactionId,
  user 
}: FactionListProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 px-2">Factions</h3>
      
      {factions.map((faction) => {
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
    </div>
  )
}
