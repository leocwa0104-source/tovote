import { notFound } from 'next/navigation'
import { getTopic, getUserMembership, getCurrentUser, checkTopicAccess } from '@/app/actions'
import TopicGate from '@/app/components/TopicGate'
import ShareButton from '@/app/components/ShareButton'
import CreateFactionForm from '@/app/components/CreateFactionForm'
import FactionList from '@/app/components/FactionList'
import FactionContent from '@/app/components/FactionContent'

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
  const createFactionParam = searchParams?.createFaction
  const createFactionRaw = Array.isArray(createFactionParam) ? createFactionParam[0] : createFactionParam
  const isCreatingFaction = createFactionRaw === '1' || createFactionRaw === 'true'
  const factionIdParam = searchParams?.factionId;
  const selectedFactionId = isCreatingFaction ? undefined : (Array.isArray(factionIdParam) ? factionIdParam[0] : factionIdParam || topic.factions[0]?.id)
  const selectedFaction = isCreatingFaction ? undefined : topic.factions.find(f => f.id === selectedFactionId)
  const initialFactionName = (() => {
    const nameParam = searchParams?.factionName
    if (!nameParam) return undefined
    return Array.isArray(nameParam) ? nameParam[0] : nameParam
  })()

  return (
    <div className="flex h-full flex-col bg-gray-50 text-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 z-10 w-full flex items-center justify-between font-mono text-sm px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800 truncate max-w-md" title={topic.title}>{topic.title}</h1>
          <ShareButton title={topic.title} text={topic.description || "Join the debate!"} />
        </div>
        <div className="flex items-center gap-4">
           {/* Actions or Status could go here */}
        </div>
      </div>

      <div className="flex-grow flex overflow-hidden">
        {/* Left Column: Faction List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4 flex flex-col gap-6">
          <FactionList 
            topicId={topic.id} 
            factions={topic.factions} 
            currentFactionId={currentFactionId}
            selectedFactionId={selectedFactionId}
            isCreatingFaction={isCreatingFaction}
          />
        </div>

        {/* Right Column: Faction Content */}
      <div className="flex-grow bg-white overflow-hidden relative">
        {isCreatingFaction ? (
          <div className="h-full overflow-y-auto p-6 md:p-8 flex justify-center">
            <CreateFactionForm 
              key={initialFactionName ?? 'new'} 
              topicId={topic.id} 
              user={user} 
              initialName={initialFactionName} 
            />
          </div>
        ) : selectedFaction ? (
          <div className="h-full overflow-y-auto">
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
    </div>
  )
}
