'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Lock } from './Icons'

interface Topic {
  id: string
  title: string
  isPrivate: boolean
  seekBrainstorming?: boolean
  seekRational?: boolean
}

interface TopicNavProps {
  topics: Topic[]
  isAuthenticated: boolean
}

export default function TopicNav({ topics, isAuthenticated }: TopicNavProps) {
  const pathname = usePathname()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredTopics = useMemo(() => {
    if (!normalizedQuery) return topics
    return topics.filter((t) => t.title.toLowerCase().includes(normalizedQuery))
  }, [normalizedQuery, topics])
  const hasExact = useMemo(() => {
    const nq = normalizedQuery
    if (!nq) return false
    return topics.some((t) => t.title.trim().toLowerCase() === nq)
  }, [normalizedQuery, topics])

  return (
    <nav className="flex flex-col gap-2 p-2">
      <div className="px-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isAuthenticated ? '搜索话题…' : '搜索公开话题…'}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-1">
        {filteredTopics.map((topic) => {
          const isActive = pathname.startsWith(`/topic/${topic.id}`)
          return (
            <Link
              key={topic.id}
              href={`/topic/${topic.id}`}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
              `}
            >
              <span className="truncate flex-grow">{topic.title}</span>
              <div className="flex items-center gap-1 text-xs">
                {topic.seekBrainstorming && <span title="Brainstorming">🧠</span>}
                {topic.seekRational && <span title="Rational">📊</span>}
              </div>
              {topic.isPrivate && <Lock className="w-3 h-3 flex-shrink-0 text-gray-400" />}
            </Link>
          )
        })}
      </div>

      {topics.length > 0 && filteredTopics.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-400">没有匹配的话题</div>
      )}

      {normalizedQuery && !hasExact && (
        <Link
          href={`/?title=${encodeURIComponent(query.trim())}`}
          className="mx-2 mt-1 px-3 py-2 rounded-md text-sm bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
        >
          ➕ 创建新话题：{query.trim()}
        </Link>
      )}
    </nav>
  )
}
