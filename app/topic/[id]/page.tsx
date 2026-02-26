import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTopic, getUserMembership, joinTopic, leaveTopic, getCurrentUser, checkTopicAccess } from '@/app/actions'
import AuthControl from '@/app/components/AuthControl'
import TopicGate from '@/app/components/TopicGate'
import ShareButton from '@/app/components/ShareButton'
 

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
  const isJoined = !!userMembership

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
          
          <div className="flex items-center gap-4 mt-4">
            <span className="font-mono text-gray-700">已有 {topic._count.memberships} 人加入</span>
            {!user ? (
              <button disabled className="py-2 px-4 bg-gray-100 text-gray-400 rounded font-medium cursor-not-allowed text-sm">
                登录以加入
              </button>
            ) : isJoined ? (
              <form action={leaveTopic.bind(null, params.id)}>
                <button className="py-2 px-4 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium transition-colors">
                  退出话题
                </button>
              </form>
            ) : (
              <form action={joinTopic.bind(null, params.id)}>
                <button className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors">
                  加入话题
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      
    </main>
  )
}
