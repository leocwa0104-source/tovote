import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTopic, getUserMembership, joinFaction, leaveFaction, getCurrentUser, checkTopicAccess } from '@/app/actions'
import AuthControl from '@/app/components/AuthControl'
import TopicGate from '@/app/components/TopicGate'
import ShareButton from '@/app/components/ShareButton'
import CreateFactionForm from '@/app/components/CreateFactionForm'
import OpinionCard from '@/app/components/OpinionCard'
import FactionList from '@/app/components/FactionList'
import FactionContent from '@/app/components/FactionContent'

function getAvatarColor(username: string) {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
    'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 
    'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
    'bg-pink-500', 'bg-rose-500'
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const topic = await getTopic(params.id)
  
  if (!topic) {
    return {
      title: 'Topic Not Found - ToVote',
    }
  }

  return {
    title: `${topic.title} - ToVote Debate`,
    description: topic.description || `Join the debate on "${topic.title}"!`,
    openGraph: {
      title: topic.title,
      description: topic.description || `Join the debate on "${topic.title}"!`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: topic.title,
      description: topic.description || `Join the debate on "${topic.title}"!`,
    }
  }
}

export default async function TopicPage(props: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await props.params;
  const topic = await getTopic(params.id)
  if (!topic) notFound()

  // checkTopicAccess is dynamic because it reads cookies.
  // Next.js should opt out of static rendering automatically,
  // but we must ensure it's not using stale client-side router cache for the user state.
  const hasAccess = await checkTopicAccess(params.id)
  if (!hasAccess) {
    return <TopicGate topicId={topic.id} title={topic.title} />
  }

  const user = await getCurrentUser()
  const userMembership = await getUserMembership(params.id)
  const currentFactionId = userMembership?.factionId
  
  // Get selected faction from query params or default to the first one
  const searchParams = await props.searchParams;
  const factionIdParam = searchParams?.factionId;
  const selectedFactionId = Array.isArray(factionIdParam) ? factionIdParam[0] : factionIdParam || topic.factions[0]?.id
  const selectedFaction = topic.factions.find(f => f.id === selectedFactionId)

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 text-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 z-10 w-full flex items-center justify-between font-mono text-sm px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-blue-600 hover:underline">&larr; Topics</Link>
          <h1 className="text-lg font-bold text-gray-800 truncate max-w-md" title={topic.title}>{topic.title}</h1>
        </div>
        <div className="flex items-center gap-4">
           <AuthControl user={user ? { username: user.username } : null} />
        </div>
      </div>

      <div className="flex-grow flex overflow-hidden">
        {/* Left Column: Faction List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4 flex flex-col gap-6">
          <div className="text-sm text-gray-500">
            <p className="mb-4">{topic.description}</p>
            <div className="flex items-center gap-2 text-xs">
              <span>By {topic.creator.username}</span>
              <span>•</span>
              <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-4">
              <ShareButton title={topic.title} text={topic.description || "Join the debate!"} />
            </div>
          </div>
          
          <hr className="border-gray-100" />
          
          <FactionList 
            topicId={topic.id} 
            factions={topic.factions} 
            currentFactionId={currentFactionId}
            selectedFactionId={selectedFactionId}
            user={user}
          />
          
          <div className="mt-auto pt-6">
            <CreateFactionForm topicId={topic.id} user={user} />
          </div>
        </div>

        {/* Right Column: Faction Content */}
        <div className="flex-grow bg-gray-50 overflow-hidden relative">
          {selectedFaction ? (
            <div className="h-full overflow-y-auto p-4 md:p-8">
              <FactionContent 
                faction={selectedFaction}
                user={user}
                userMembership={userMembership}
                topicId={topic.id}
                isMember={currentFactionId === selectedFaction.id}
                isOtherMember={!!(currentFactionId && currentFactionId !== selectedFaction.id)}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg">No factions selected</p>
                <p className="text-sm">Select a faction from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
