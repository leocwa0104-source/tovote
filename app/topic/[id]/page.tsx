import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTopic, getUserMembership, joinFaction, leaveFaction, getCurrentUser, checkTopicAccess } from '@/app/actions'
import AuthControl from '@/app/components/AuthControl'
import TopicGate from '@/app/components/TopicGate'
import ShareButton from '@/app/components/ShareButton'
import OpinionCard from '@/app/components/OpinionCard'
import CreateFactionForm from '@/app/components/CreateFactionForm'

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

      <CreateFactionForm topicId={topic.id} user={user} />

      {/* Factions List */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {topic.factions.map((faction) => {
          const isMember = currentFactionId === faction.id
          const isOtherMember = currentFactionId && !isMember

          return (
            <div key={faction.id} className={`flex flex-col bg-white rounded-xl shadow-md border-2 ${isMember ? 'border-blue-500 ring-4 ring-blue-100' : 'border-gray-200'} overflow-hidden`}>
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex-grow-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{faction.name}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {faction._count.members} Members
                  </span>
                </div>
                {/* Description removed from creation but might still exist in DB for old ones. Optionally display if present. */}
                {faction.description && <p className="text-gray-600 text-sm mb-4">{faction.description}</p>}
                
                <div className="flex gap-2">
                  {!user ? (
                     <button disabled className="w-full py-2 px-4 bg-gray-100 text-gray-400 rounded font-medium cursor-not-allowed text-sm">
                       Login to Join
                     </button>
                  ) : isMember ? (
                    <form action={leaveFaction.bind(null, params.id)} className="w-full">
                      <button className="w-full py-2 px-4 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium transition-colors">
                        Leave Faction
                      </button>
                    </form>
                  ) : (
                    <form action={joinFaction.bind(null, params.id, faction.id)} className="w-full">
                      <button 
                        className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                          isOtherMember 
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isOtherMember ? 'Switch to this Faction' : 'Join Faction'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Members Area */}
              <div className="flex-grow-0 flex flex-col bg-white min-h-[120px] border-b border-gray-100">
                <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 font-semibold text-gray-500 text-xs uppercase tracking-wide flex justify-between items-center">
                  <span>Members</span>
                </div>
                <div className="p-4 bg-white">
                  {faction.members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-gray-400 text-xs italic py-2">
                      <p>No members yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {faction.members.map((member) => {
                        const bgColor = getAvatarColor(member.user.username);
                        const initial = member.user.username.charAt(0).toUpperCase();
                        return (
                          <div 
                            key={member.user.id} 
                            className="group relative flex flex-col items-center"
                          >
                            <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-white cursor-default`}>
                              {initial}
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-20 pointer-events-none">
                              {member.user.username}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Reasons Section */}
              <div className="grid grid-cols-2 divide-x divide-gray-100 flex-grow bg-white min-h-[300px]">
                {/* WHY Section */}
                <div className="flex flex-col h-full">
                  <div className="p-3 bg-green-50/50 text-green-800 text-sm font-bold uppercase text-center border-b border-green-100">
                    Why Join?
                  </div>
                  <div className="flex-grow p-4 space-y-4 overflow-y-auto bg-green-50/10">
                    {/* User's Own Opinion (Create/Edit) */}
                    {user && (
                      <OpinionCard 
                        opinion={faction.opinions.find(o => o.type === 'WHY' && o.authorId === user.id)}
                        factionId={faction.id}
                        type="WHY"
                        currentUser={user}
                        isMember={isMember}
                      />
                    )}
                    
                    {/* Other Members' Opinions */}
                    {faction.opinions
                      .filter(o => o.type === 'WHY' && (!user || o.authorId !== user.id))
                      .map(opinion => (
                        <OpinionCard 
                          key={opinion.id}
                          opinion={opinion}
                          factionId={faction.id}
                          type="WHY"
                          currentUser={user}
                          isMember={isMember}
                        />
                      ))
                    }
                    
                    {faction.opinions.filter(o => o.type === 'WHY').length === 0 && !user && (
                      <div className="text-center py-8 text-gray-400 text-sm italic">
                        No arguments yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* WHY NOT Section */}
                <div className="flex flex-col h-full">
                  <div className="p-3 bg-red-50/50 text-red-800 text-sm font-bold uppercase text-center border-b border-red-100">
                    Why Not?
                  </div>
                  <div className="flex-grow p-4 space-y-4 overflow-y-auto bg-red-50/10">
                    {/* User's Own Opinion (Create/Edit) */}
                    {user && (
                      <OpinionCard 
                        opinion={faction.opinions.find(o => o.type === 'WHY_NOT' && o.authorId === user.id)}
                        factionId={faction.id}
                        type="WHY_NOT"
                        currentUser={user}
                        isMember={isMember}
                      />
                    )}
                    
                    {/* Other Members' Opinions */}
                    {faction.opinions
                      .filter(o => o.type === 'WHY_NOT' && (!user || o.authorId !== user.id))
                      .map(opinion => (
                        <OpinionCard 
                          key={opinion.id}
                          opinion={opinion}
                          factionId={faction.id}
                          type="WHY_NOT"
                          currentUser={user}
                          isMember={isMember}
                        />
                      ))
                    }
                    
                    {faction.opinions.filter(o => o.type === 'WHY_NOT').length === 0 && !user && (
                      <div className="text-center py-8 text-gray-400 text-sm italic">
                        No counter-arguments yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
