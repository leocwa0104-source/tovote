'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Lock, Unlock } from './Icons'

interface Topic {
  id: string
  title: string
  isPrivate: boolean
  seekBrainstorming?: boolean
  seekRational?: boolean
  creator?: { username: string }
  memberCount?: number
}

interface TopicNavProps {
  topics: Topic[]
  privateTopics?: Topic[]
  isAuthenticated: boolean
}

export default function TopicNav({ topics, privateTopics = [], isAuthenticated }: TopicNavProps) {
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public')

  const currentList = activeTab === 'public' ? topics : privateTopics

  const normalizedQuery = query.trim().toLowerCase()
  const filteredTopics = useMemo(() => {
    if (!normalizedQuery) return currentList

    const keywords = normalizedQuery.split(/[\s,，.。;；]+/).filter(Boolean)
    if (keywords.length === 0) return currentList

    return currentList
      .map(topic => {
        const title = topic.title.toLowerCase()
        let matchCount = 0
        // Exact match bonus (highest priority)
        if (title.includes(normalizedQuery)) matchCount += 100
        
        // Keyword match
        keywords.forEach(k => {
          if (title.includes(k)) matchCount += 1
        })
        
        return { topic, matchCount }
      })
      .filter(item => item.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .map(item => item.topic)
  }, [normalizedQuery, currentList])
  
  const hasExact = useMemo(() => {
    const nq = normalizedQuery
    if (!nq) return false
    return currentList.some((t) => t.title.trim().toLowerCase() === nq)
  }, [normalizedQuery, currentList])

  return (
    <nav className="flex flex-col h-full">
      {isAuthenticated && (
        <div className="flex border-b border-gray-200 mb-2 px-2">
          <button
            onClick={() => setActiveTab('public')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${
              activeTab === 'public' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${
              activeTab === 'private' 
                ? 'border-purple-600 text-purple-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Private
          </button>
        </div>
      )}

      <div className="px-2 mb-2">
        {activeTab === 'public' ? (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search public topics..."
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />
        ) : (
          <div className="flex gap-2">
            <Link
              href="/?action=create-private"
              className="flex-1 py-2 px-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-sm font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
            >
              <span>➕</span> Create
            </Link>
            <Link
              href="/?action=join-private"
              className="flex-1 py-2 px-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
            >
              <span>🔑</span> Join
            </Link>
          </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto px-2 pb-2">
        <div className="flex flex-col gap-1">
          {filteredTopics.map((topic) => {
            const isActive = pathname.startsWith(`/topic/${topic.id}`)
            return (
              <Link
                key={topic.id}
                href={`/topic/${topic.id}`}
                className={`
                  relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
                `}
              >
                {(topic.seekBrainstorming || topic.seekRational) && (
                  <div className="absolute top-0 left-4 flex gap-1">
                    {topic.seekBrainstorming && <div className="w-1.5 h-3 bg-orange-400 rounded-b-sm shadow-sm" title="Brainstorming" />}
                    {topic.seekRational && <div className="w-1.5 h-3 bg-teal-400 rounded-b-sm shadow-sm" title="Rational" />}
                  </div>
                )}
                <div className="flex flex-col flex-grow min-w-0">
                  <span className="truncate">{topic.title}</span>
                  {topic.isPrivate && topic.creator && (
                    <span className="text-xs text-gray-400 truncate">
                      @{topic.creator.username}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs flex-shrink-0">
                  {topic.memberCount !== undefined && topic.memberCount > 0 && (
                    <span className="text-gray-400 mr-1" title="Participants">
                      {topic.memberCount}👤
                    </span>
                  )}
                </div>
                {topic.isPrivate && (
                  activeTab === 'private' 
                    ? <Unlock className="w-3 h-3 flex-shrink-0 text-gray-400" /> 
                    : <Lock className="w-3 h-3 flex-shrink-0 text-gray-400" />
                )}
              </Link>
            )
          })}
        </div>

        {currentList.length > 0 && filteredTopics.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-400 text-center">No matching topics</div>
        )}

        {currentList.length === 0 && !query && (
          <div className="px-4 py-8 text-sm text-gray-400 text-center italic">
            {activeTab === 'public' ? 'No public topics yet.' : 'You haven\'t joined any private topics.'}
          </div>
        )}

        {activeTab === 'public' && normalizedQuery && !hasExact && (
          <Link
            href={`/?title=${encodeURIComponent(query.trim())}`}
            className="flex items-center gap-2 mx-2 mt-4 px-3 py-2 rounded-md text-sm bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
          >
            <span>➕</span> Create: <span className="font-bold truncate">{query.trim()}</span>
          </Link>
        )}


      </div>
    </nav>
  )
}
