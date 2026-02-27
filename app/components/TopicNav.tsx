'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

  return (
    <nav className="flex flex-col gap-1 p-2">
      {topics.map((topic) => {
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
    </nav>
  )
}
