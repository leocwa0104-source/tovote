import { getTopics, getCurrentUser } from '@/app/actions'
import TopicNav from './TopicNav'
import Link from 'next/link'
import AuthControl from './AuthControl'

export default async function TopicSidebar() {
  const topics = await getTopics()
  const user = await getCurrentUser()

  return (
    <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-800 tracking-tight">
          ToVote
        </Link>
        <AuthControl user={user ? { username: user.username } : null} />
      </div>

      {/* Topic List */}
      <div className="flex-grow overflow-y-auto py-2">
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Topics
        </div>
        <TopicNav 
          topics={topics.map(t => ({ 
            id: t.id, 
            title: t.title, 
            isPrivate: t.isPrivate,
            seekBrainstorming: t.seekBrainstorming,
            seekRational: t.seekRational,
            creator: t.creator
          }))} 
          isAuthenticated={!!user}
        />
      </div>

      {/* Footer / Create Action */}
      {/* Removed Create Action */}
    </div>
  )
}
