import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTopic, getUserMembership, createFaction, joinFaction, leaveFaction, postMessage, getCurrentUser } from '@/app/actions'
import AuthControl from '@/app/components/AuthControl'

export default async function TopicPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const topic = await getTopic(params.id)
  if (!topic) notFound()

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
        <p className="text-xl text-gray-600">{topic.description}</p>
        <div className="mt-4 text-sm text-gray-500">
          Created by {topic.creator.username} on {new Date(topic.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Faction Creation Form */}
      <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-12">
        <h3 className="text-lg font-semibold mb-4">Start a New Faction</h3>
        {user ? (
          <form action={createFaction.bind(null, params.id)} className="flex flex-col gap-4">
            <input
              type="text"
              name="name"
              placeholder="Faction Name (e.g., Team Cats)"
              className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <textarea
              name="description"
              placeholder="Why should people join this faction?"
              className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <button
              type="submit"
              className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors self-start px-6"
            >
              Create Faction
            </button>
          </form>
        ) : (
          <p className="text-gray-500 italic">Login to create a new faction.</p>
        )}
      </div>

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
                <p className="text-gray-600 text-sm mb-4">{faction.description}</p>
                
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

              {/* Message Board */}
              <div className="flex-grow flex flex-col bg-white h-96">
                <div className="p-3 bg-gray-100 border-b border-gray-200 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                  Discussion Board
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {faction.messages.length === 0 ? (
                    <p className="text-gray-400 text-center text-sm italic py-4">No messages yet. Start the conversation!</p>
                  ) : (
                    faction.messages.map((msg) => (
                      <div key={msg.id} className="bg-white p-3 rounded shadow-sm text-sm border border-gray-100">
                        <p className="text-gray-800 break-words">{msg.content}</p>
                        <div className="mt-2 text-xs text-gray-400 flex justify-between">
                          <span>{msg.author.username}</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Message Input */}
                <div className="p-3 border-t border-gray-200 bg-white">
                  {user ? (
                    <form action={postMessage.bind(null, faction.id)} className="flex gap-2">
                      <input
                        type="text"
                        name="content"
                        placeholder="Type a message..."
                        className="flex-grow p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Send
                      </button>
                    </form>
                  ) : (
                    <div className="text-center text-xs text-gray-500 py-2">
                      Login to post
                    </div>
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
