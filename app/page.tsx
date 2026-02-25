import { getTopics, getCurrentUser } from './actions'
import Link from 'next/link'
import AuthControl from '@/app/components/AuthControl'
import CreateTopicForm from '@/app/components/CreateTopicForm'
import { Lock } from '@/app/components/Icons'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let topics: Awaited<ReturnType<typeof getTopics>> = []
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null
  let errorMsg: string | null = null

  try {
    topics = await getTopics()
    user = await getCurrentUser()
  } catch (e: any) {
    console.error("Home page error:", e)
    errorMsg = e.message + (e.stack ? "\n" + e.stack : "")
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
              <Link
                key={topic.id}
                href={`/topic/${topic.id}`}
                className="block p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 relative group"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {topic.title}
                    {topic.isPrivate && (
                      <span title="Private Topic">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-gray-600 mt-2">{topic.description}</p>
                <div className="mt-4 text-sm text-gray-400 flex gap-4">
                  <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                  <span>{topic._count.factions} Factions</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

