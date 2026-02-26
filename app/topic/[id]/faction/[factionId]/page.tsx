import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getFaction, getUserMembership, joinFaction, leaveFaction, getCurrentUser, checkTopicAccess } from '@/app/actions'
import AuthControl from '@/app/components/AuthControl'
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
  const isOtherMember = userMembership?.factionId && !isMember

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 text-gray-900">
      <div className="z-10 max-w-5xl w-full flex items-center justify-between font-mono text-sm mb-8">
        <Link href={`/topic/${topicId}`} className="text-blue-600 hover:underline flex items-center">
          &larr; Back to Topic
        </Link>
        <div className="flex items-center gap-4">
           <AuthControl user={user ? { username: user.username } : null} />
        </div>
      </div>

      <div className="w-full max-w-4xl mb-8">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-8 border-b border-gray-100 bg-gray-50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{faction.name}</h1>
                <p className="text-gray-500 text-sm">Part of topic: <Link href={`/topic/${topicId}`} className="hover:underline text-blue-600">{faction.topic.title}</Link></p>
              </div>
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                {faction._count.members} Members
              </span>
            </div>
            
            {faction.description && <p className="text-gray-700 text-lg mb-6">{faction.description}</p>}
            
            <div className="flex gap-4">
              {!user ? (
                 <button disabled className="py-2 px-6 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed">
                   Login to Join
                 </button>
              ) : isMember ? (
                <form action={leaveFaction.bind(null, topicId)} className="">
                  <button className="py-2 px-6 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors border border-red-200">
                    Leave Faction
                  </button>
                </form>
              ) : (
                <form action={joinFaction.bind(null, topicId, faction.id)} className="">
                  <button 
                    className={`py-2 px-6 rounded-lg font-medium transition-colors border ${
                      isOtherMember 
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200' 
                        : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isOtherMember ? 'Switch to this Faction' : 'Join Faction'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Why Column */}
        <div className="flex flex-col bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden min-h-[500px]">
          <div className="p-4 bg-green-50 text-green-800 text-lg font-bold uppercase text-center border-b border-green-100 sticky top-0 z-10">
            Why Join?
          </div>
          <div className="flex-grow p-6 space-y-6 bg-white">
            {user && (
              <div className="mb-6">
                 <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Argument</h3>
                 <OpinionCard 
                  opinion={faction.opinions.find(o => o.type === 'WHY' && o.authorId === user.id)}
                  factionId={faction.id}
                  type="WHY"
                  currentUser={user}
                />
              </div>
            )}
            
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Community Arguments</h3>
              <div className="space-y-4">
                {faction.opinions
                  .filter(o => o.type === 'WHY' && (!user || o.authorId !== user.id))
                  .map(opinion => (
                    <OpinionCard 
                      key={opinion.id}
                      opinion={opinion}
                      factionId={faction.id}
                      type="WHY"
                      currentUser={user}
                    />
                  ))
                }
                {faction.opinions.filter(o => o.type === 'WHY').length === 0 && !user && (
                  <div className="text-center py-12 text-gray-400 italic">
                    No arguments yet. Be the first to add one!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Why Not Column */}
        <div className="flex flex-col bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden min-h-[500px]">
          <div className="p-4 bg-red-50 text-red-800 text-lg font-bold uppercase text-center border-b border-red-100 sticky top-0 z-10">
            Why Not?
          </div>
          <div className="flex-grow p-6 space-y-6 bg-white">
            {user && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Counter-Argument</h3>
                <OpinionCard 
                  opinion={faction.opinions.find(o => o.type === 'WHY_NOT' && o.authorId === user.id)}
                  factionId={faction.id}
                  type="WHY_NOT"
                  currentUser={user}
                />
              </div>
            )}
            
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Community Counter-Arguments</h3>
              <div className="space-y-4">
                {faction.opinions
                  .filter(o => o.type === 'WHY_NOT' && (!user || o.authorId !== user.id))
                  .map(opinion => (
                    <OpinionCard 
                      key={opinion.id}
                      opinion={opinion}
                      factionId={faction.id}
                      type="WHY_NOT"
                      currentUser={user}
                    />
                  ))
                }
                {faction.opinions.filter(o => o.type === 'WHY_NOT').length === 0 && !user && (
                  <div className="text-center py-12 text-gray-400 italic">
                    No counter-arguments yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}