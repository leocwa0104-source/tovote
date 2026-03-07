import { getTopics, getCurrentUser, getJoinedPrivateTopics, getUserTopicMemberships, getActiveTicketPackages, getSystemLogo } from '@/app/actions'
import { getActiveSkin } from '@/app/actions/admin'
import TopicNav from './TopicNav'
import Link from 'next/link'
import AuthControl from './AuthControl'
import TicketBalance from './TicketBalance'
import TovoteDaily from './TovoteDaily'
import TovoteStats from './TovoteStats'
import TovoteLogo from './TovoteLogo'

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
  const activePackages = user ? await getActiveTicketPackages() : []
  const logoData = await getSystemLogo()
  const activeSkin = await getActiveSkin()

  return (
    <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-lg text-gray-800 tracking-tight" aria-label="ToVote">
              <TovoteLogo pixelData={logoData} className="font-bold text-lg text-gray-800 tracking-tight" />
            </Link>
             <TovoteDaily />
             <TovoteStats />
           </div>
           <AuthControl user={user ? { username: user.username, role: user.role, passphrase: user.passphrase } : null} />
        </div>
        {user && (
          <TicketBalance
            tickets={(user as unknown as { tickets?: number }).tickets ?? 0}
            purchases={(user as unknown as { purchases?: Purchase[] }).purchases ?? []}
            eyesCount={user.eyesCount}
            trashCount={user.trashCount}
            packages={activePackages}
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
          activeSkin={activeSkin}
        />
      </div>

      {/* Footer / Create Action */}
      {/* Removed Create Action */}
    </div>
  )
}
