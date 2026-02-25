import { getUserDashboardData } from '@/app/actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AuthControl from '@/app/components/AuthControl'
import { Lock } from '@/app/components/Icons'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const data = await getUserDashboardData()

  if (!data) {
    redirect('/')
  }

  const { user, joinedFactions, createdTopics } = data

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 text-gray-900">
      <div className="z-10 max-w-5xl w-full flex items-center justify-between font-mono text-sm mb-12">
        <Link href="/" className="text-2xl font-bold text-blue-600 hover:underline">
          &larr; Factions Debate
        </Link>
        <AuthControl user={user} />
      </div>

      <div className="w-full max-w-5xl">
        <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
        <p className="text-gray-500 mb-12">Welcome back, {user.username}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Section: My Factions (Participated) */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {joinedFactions.length}
              </span>
              My Factions
            </h2>
            
            {joinedFactions.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
                You haven't joined any factions yet.
                <br />
                <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block">
                  Browse Topics
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {joinedFactions.map((membership) => (
                  <Link 
                    key={membership.id}
                    href={`/topic/${membership.topicId}`}
                    className="block bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all hover:border-blue-300"
                  >
                    <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-semibold">
                      Topic
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3 line-clamp-1">
                      {membership.topic.title}
                    </h3>
                    
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-100">
                      <div>
                        <span className="text-xs text-gray-500 block">Your Faction</span>
                        <span className="font-semibold text-blue-700">{membership.faction.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Teammates</span>
                        <span className="font-mono font-medium">{membership.faction._count.members - 1}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Section: My Topics (Created) */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {createdTopics.length}
              </span>
              My Topics
            </h2>

            {createdTopics.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
                You haven't created any topics yet.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {createdTopics.map((topic) => (
                  <Link 
                    key={topic.id}
                    href={`/topic/${topic.id}`}
                    className="block bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all hover:border-purple-300 group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-700 transition-colors flex items-center gap-2">
                        {topic.title}
                        {topic.isPrivate && (
                          <Lock className="w-4 h-4 text-gray-400" />
                        )}
                      </h3>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {topic.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                      <span className="flex items-center gap-1">
                        <span className="font-bold text-gray-700">{topic._count.factions}</span> Factions
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-bold text-gray-700">{topic._count.memberships}</span> Participants
                      </span>
                      <span className="ml-auto">
                        {new Date(topic.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  )
}
