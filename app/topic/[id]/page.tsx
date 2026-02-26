import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTopic, getUserMembership, joinFaction, leaveFaction, getCurrentUser, checkTopicAccess } from '@/app/actions'
import AuthControl from '@/app/components/AuthControl'
import TopicGate from '@/app/components/TopicGate'
import ShareButton from '@/app/components/ShareButton'
import CreateFactionForm from '@/app/components/CreateFactionForm'
import OpinionCard from '@/app/components/OpinionCard'

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

export default async function TopicPage(props: { params: Promise<{ id: string }> }) {
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

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 text-gray-900">
      <div className="z-10 max-w-5xl w-full flex items-center justify-between font-mono text-sm">
        <Link href="/" className="text-blue-600 hover:underline">&larr; Back to Topics</Link>
        <div className="flex items-center gap-4">
           <h1 className="text-2xl font-bold text-gray-800">Factions Debate</h1>
           <AuthControl user={user ? { username: user.username } : null} />
        </div>
      </div>

      <div className="w-full max-w-4xl mt-8 mb-12 text-center">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">{topic.title}</h2>
        <p className="text-xl text-gray-600 mb-4">{topic.description}</p>
        
        <div className="flex flex-col items-center gap-4">
          <ShareButton title={topic.title} text={topic.description || "Join the debate!"} />
          
          <div className="text-sm text-gray-500">
            Created by {topic.creator.username} on {new Date(topic.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      {/* Factions creation */}
      <div className="w-full max-w-4xl mb-8 flex justify-center">
        <CreateFactionForm topicId={topic.id} user={user} />
      </div>

      {/* Factions List */}
      <div className="w-full max-w-4xl space-y-4">
        {topic.factions.map((faction) => {
          const isMember = currentFactionId === faction.id
          const isOtherMember = currentFactionId && !isMember

          return (
            <div key={faction.id} className={`group relative flex items-center justify-between p-6 bg-white rounded-lg shadow-sm border transition-all hover:shadow-md ${isMember ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-200 hover:border-blue-300'}`}>
              <Link href={`/topic/${topic.id}/faction/${faction.id}`} className="absolute inset-0 z-0" aria-label={`View ${faction.name} faction details`}>
              </Link>
              
              <div className="flex flex-col z-10 pointer-events-none">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{faction.name}</h3>
                  {isMember && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">YOUR FACTION</span>}
                </div>
                {faction.description && <p className="text-gray-500 text-sm mt-1 max-w-xl truncate">{faction.description}</p>}
              </div>

              <div className="flex items-center gap-6 z-10">
                <div className="flex flex-col items-end pointer-events-none">
                  <span className="text-2xl font-bold text-gray-800">{faction._count.members}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Members</span>
                </div>
                
                <div className="flex gap-2 pointer-events-auto">
                  {!user ? (
                     <button disabled className="py-2 px-4 bg-gray-100 text-gray-400 rounded font-medium cursor-not-allowed text-sm">
                       Join
                     </button>
                  ) : isMember ? (
                    <form action={leaveFaction.bind(null, params.id)}>
                      <button className="py-2 px-4 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium transition-colors text-sm border border-red-100">
                        Leave
                      </button>
                    </form>
                  ) : (
                    <form action={joinFaction.bind(null, params.id, faction.id)}>
                      <button 
                        className={`py-2 px-4 rounded font-medium transition-colors text-sm shadow-sm ${
                          isOtherMember 
                            ? 'bg-white text-yellow-600 border border-yellow-200 hover:bg-yellow-50' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isOtherMember ? 'Switch' : 'Join'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
