import { notFound, redirect } from 'next/navigation'
import { getFaction, getUserMembership, getCurrentUser, checkTopicAccess } from '@/app/actions'
import AuthControl from '@/app/components/AuthControl'
import FactionContent from '@/app/components/FactionContent'

export default async function FactionPage(props: { params: Promise<{ id: string, factionId: string }> }) {
  const params = await props.params;
  const { id: topicId, factionId } = params
  
  const hasAccess = await checkTopicAccess(topicId)
  if (!hasAccess) {
    redirect(`/topic/${topicId}`)
  }

  const faction = await getFaction(factionId)
  if (!faction || faction.topicId !== topicId) notFound()

  const user = await getCurrentUser()
  const userMembership = await getUserMembership(topicId)
  
  const isMember = userMembership?.factionId === faction.id
  // isOtherMember should be true if user has a membership in this topic BUT it's not this faction
  // If userMembership is null/undefined, then user is not a member of any faction in this topic
  const isOtherMember = !!(userMembership?.factionId && userMembership.factionId !== faction.id)

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-50 text-gray-900">
      <div className="z-10 max-w-5xl w-full flex items-center justify-end font-mono text-sm mb-4">
        <div className="flex items-center gap-4">
           <AuthControl user={user ? { username: user.username } : null} />
        </div>
      </div>

      <FactionContent 
        faction={faction}
        user={user}
        userMembership={userMembership}
        topicId={topicId}
        isMember={isMember}
        isOtherMember={isOtherMember}
      />
    </main>
  )
}
