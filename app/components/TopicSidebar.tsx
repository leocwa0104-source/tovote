import { getTopics, getCurrentUser, getJoinedPrivateTopics, getUserTopicMemberships } from '@/app/actions'
import TopicNav from './TopicNav'
import Link from 'next/link'
import AuthControl from './AuthControl'
import TicketBalance from './TicketBalance'

type Purchase = {
  packageId: string
  createdAt: Date
  remainingTickets: number
  expiresAt: Date
}

export default async function TopicSidebar() {
  const topics = await getTopics()
  const user = await getCurrentUser()
  const privateTopics = user ? await getJoinedPrivateTopics() : []
  const joinedTopicIds = user ? await getUserTopicMemberships() : []

  return (
    <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-gray-800 tracking-tight">
            ToVote
          </Link>
          <AuthControl user={user ? { username: user.username } : null} />
        </div>
        {user && (
          <TicketBalance
            tickets={(user as unknown as { tickets?: number }).tickets ?? 0}
            purchases={(user as unknown as { purchases?: Purchase[] }).purchases ?? []}
            eyesCount={user.eyesCount}
            trashCount={user.trashCount}
          />
        )}
      </div>

      {/* Topic List */}
      <div className="flex-grow overflow-hidden">
        <TopicNav 
          topics={topics.map(t => ({ 
            id: t.id, 
            title: t.title, 
            isPrivate: t.isPrivate,
            seekBrainstorming: t.seekBrainstorming,
            seekRational: t.seekRational,
            creator: t.creator,
            memberCount: t._count.memberships,
            totalValue: t.totalValue
          }))} 
          privateTopics={privateTopics.map(t => ({ 
            id: t.id, 
            title: t.title, 
            isPrivate: t.isPrivate,
            seekBrainstorming: t.seekBrainstorming,
            seekRational: t.seekRational,
            creator: t.creator,
            memberCount: t._count.memberships,
            totalValue: t.totalValue
          }))}
          joinedTopicIds={joinedTopicIds}
          isAuthenticated={!!user}
        />
      </div>

      {/* Footer / Create Action */}
      {/* Removed Create Action */}
    </div>
  )
}
