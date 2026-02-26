import { getTopics, getCurrentUser, joinTopic, leaveTopic, getUserTopicMemberships } from './actions'
import Link from 'next/link'
import AuthControl from '@/app/components/AuthControl'
import CreateTopicForm from '@/app/components/CreateTopicForm'
import { Lock } from '@/app/components/Icons'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let topics: Awaited<ReturnType<typeof getTopics>> = []
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null
  let errorMsg: string | null = null
  let joinedSet: Set<string> = new Set()

  try {
    topics = await getTopics()
    user = await getCurrentUser()
    // Build joined topic set for current user
    const joinedIds = await getUserTopicMemberships()
    joinedSet = new Set(joinedIds)
  } catch (e: unknown) {
    console.error("Home page error:", e)
    errorMsg = String(e)
  }

  if (errorMsg) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 text-gray-900">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-2xl">
          <strong className="font-bold">System Error: </strong>
          <pre className="block sm:inline whitespace-pre-wrap text-xs mt-2">{errorMsg}</pre>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 text-gray-900">
      <div className="z-10 max-w-5xl w-full flex items-center justify-between font-mono text-sm mb-8">
        <h1 className="text-4xl font-bold text-blue-600">Factions Debate</h1>
        <AuthControl user={user ? { username: user.username } : null} />
      </div>

      <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create a New Topic</h2>
        <CreateTopicForm user={user} />
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-semibold mb-4">Active Topics</h2>
        {topics.length === 0 ? (
          <p className="text-gray-500 text-center">No topics yet. Be the first to start a debate!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 relative group"
              >
                <div className="flex justify-between items-start">
                  {joinedSet.has(topic.id) ? (
                    <Link href={`/topic/${topic.id}`} className="text-xl font-bold text-gray-800 flex items-center gap-2 hover:underline">
                      {topic.title}
                      {topic.isPrivate && (
                        <span title="Private Topic">
                          <Lock className="w-4 h-4 text-gray-400" />
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      {topic.title}
                      {topic.isPrivate && (
                        <span title="Private Topic">
                          <Lock className="w-4 h-4 text-gray-400" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-gray-600 mt-2">{topic.description}</p>
                <div className="mt-4 text-sm text-gray-500 flex items-center gap-4">
                  <span className="font-mono">已有 {topic._count.memberships} 人加入</span>
                  {!user ? (
                    <button disabled className="py-2 px-3 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed">
                      登录以加入
                    </button>
                  ) : topic.isPrivate ? (
                    <Link href={`/topic/${topic.id}`}>
                      <button className="py-2 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                        加入话题
                      </button>
                    </Link>
                  ) : joinedSet.has(topic.id) ? (
                    <form action={leaveTopic.bind(null, topic.id)}>
                      <button className="py-2 px-3 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm">
                        退出话题
                      </button>
                    </form>
                  ) : (
                    <form action={joinTopic.bind(null, topic.id)}>
                      <button className="py-2 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                        加入话题
                      </button>
                    </form>
                  )}
                  <span className="ml-auto text-gray-400">{new Date(topic.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
