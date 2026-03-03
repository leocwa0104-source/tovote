'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Lock, Unlock, ChevronsUpDown, ArrowUp, ArrowDown } from './Icons'

interface Topic {
  id: string
  title: string
  isPrivate: boolean
  seekBrainstorming?: boolean
  seekRational?: boolean
  creator?: { username: string }
  memberCount?: number
  totalValue?: number
}

interface TopicNavProps {
  topics: Topic[]
  privateTopics?: Topic[]
  joinedTopicIds?: string[]
  isAuthenticated: boolean
}

export default function TopicNav({ topics, privateTopics = [], joinedTopicIds = [], isAuthenticated }: TopicNavProps) {
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public')
  const [sortMode, setSortMode] = useState<'latest' | 'value'>('latest')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [scope, setScope] = useState<'society' | 'joined'>('society')

  const currentList = activeTab === 'public' 
    ? (scope === 'society' ? topics : topics.filter(t => joinedTopicIds.includes(t.id)))
    : privateTopics

  const normalizedQuery = query.trim().toLowerCase()
  const filteredTopics = useMemo(() => {
    if (!normalizedQuery) {
      // Sort by selected mode when no search query
      const sorted = [...currentList]
      
      if (sortMode === 'value') {
        // Sort by totalValue desc (default)
        sorted.sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
      }
      // 'latest' relies on server order (createdAt desc)
      // We assume currentList is already sorted by latest desc from the server
      
      // If asc, reverse the list
      if (sortDirection === 'asc') {
        sorted.reverse()
      }
      
      return sorted
    }

    const keywords = normalizedQuery.split(/[\s,，.。;；]+/).filter(Boolean)
    // Filter out whitespace and punctuation for character matching
    const chars = normalizedQuery.split('').filter(c => !/[\s,，.。;；]/.test(c))
    
    if (keywords.length === 0 && chars.length === 0) return currentList

    return currentList
      .map(topic => {
        const title = topic.title.toLowerCase()
        let matchCount = 0
        
        // 1. Exact phrase match (highest priority)
        if (title.includes(normalizedQuery)) matchCount += 100
        
        // 2. Keyword match (medium priority)
        keywords.forEach(k => {
          if (title.includes(k)) matchCount += 10
        })

        // 3. Character fuzzy match (low priority, but enables "一天三千元" -> "如何一天赚三千元")
        chars.forEach(c => {
          if (title.includes(c)) matchCount += 1
        })
        
        return { topic, matchCount }
      })
      .filter(item => item.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .map(item => item.topic)
  }, [normalizedQuery, currentList, sortMode, sortDirection])
  
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

      <div className="px-2 mb-2 flex items-center justify-between text-xs text-gray-500 relative z-20">
        <span className="font-semibold uppercase tracking-wider">
          {activeTab} Topics
        </span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1 hover:text-gray-900 transition-colors py-1 px-2 rounded-md hover:bg-gray-100"
            >
              <span className={`font-medium ${sortMode === 'value' ? 'text-amber-600' : 'text-blue-600'}`}>
                {sortMode === 'value' ? 'High Value' : 'Latest'}
              </span>
              <ChevronsUpDown className="w-3 h-3 text-gray-400" />
            </button>
            
            {isSortOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsSortOpen(false)} 
                />
                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-20 flex flex-col overflow-hidden">
                  <button
                    onClick={() => {
                      setSortMode('latest')
                      setIsSortOpen(false)
                    }}
                    className={`px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${sortMode === 'latest' ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-600'}`}
                  >
                    Latest
                    {sortMode === 'latest' && <span className="text-blue-600">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      setSortMode('value')
                      setIsSortOpen(false)
                    }}
                    className={`px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${sortMode === 'value' ? 'text-amber-600 font-medium bg-amber-50' : 'text-gray-600'}`}
                  >
                    High Value
                    {sortMode === 'value' && <span className="text-amber-600">✓</span>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-2 mb-2">
        {activeTab === 'public' ? (
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${scope === 'society' ? 'public' : 'joined'} topics...`}
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(false)}
                className={`flex items-center gap-1 py-2 px-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors ${scope === 'joined' ? 'text-purple-600' : 'text-gray-700'}`}
                title="Select scope"
              >
                <span className="text-xs font-medium">{scope === 'society' ? 'society' : 'joined'}</span>
                <ChevronsUpDown className="w-3 h-3 text-gray-400" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-20">
                <button
                  onClick={() => setScope('society')}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-xs ${scope === 'society' ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-600'}`}
                >
                  society
                </button>
                <button
                  onClick={() => isAuthenticated && setScope('joined')}
                  disabled={!isAuthenticated}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-xs ${scope === 'joined' ? 'text-purple-600 font-medium bg-purple-50' : 'text-gray-600'} ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  joined
                </button>
              </div>
            </div>
          </div>
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
