import { getCurrentUser } from '@/app/actions'
import CreatePublicTopicForm from '@/app/components/CreatePublicTopicForm'
import CreatePrivateTopicForm from '@/app/components/CreatePrivateTopicForm'
import JoinPrivateTopicForm from '@/app/components/JoinPrivateTopicForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Home(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams
  const user = await getCurrentUser()
  const initialTitle = Array.isArray(searchParams?.title) ? searchParams?.title?.[0] : searchParams?.title
  const action = Array.isArray(searchParams?.action) ? searchParams?.action?.[0] : searchParams?.action

  // Default to public if no action or invalid action
  const isPrivate = action === 'private'
  const isPublic = !isPrivate

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to ToVote</h1>
        <p className="text-gray-600">Select a topic from the sidebar to start debating, or create a new one below.</p>
      </div>

      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 mb-6 text-sm">
          <Link 
            href="/"
            className={`flex-1 pb-3 text-center font-medium transition-colors ${isPublic ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Public Topic
          </Link>
          <Link 
            href="/?action=private"
            className={`flex-1 pb-3 text-center font-medium transition-colors ${isPrivate ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Private Topic
          </Link>
        </div>

        {isPublic && (
          <>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Create a Public Topic</h2>
            <CreatePublicTopicForm user={user} initialTitle={typeof initialTitle === 'string' ? initialTitle : undefined} />
          </>
        )}

        {isPrivate && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Create a Private Topic</h2>
              <CreatePrivateTopicForm user={user} initialTitle={typeof initialTitle === 'string' ? initialTitle : undefined} />
            </div>
            
            <div className="border-t border-gray-100 pt-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Join a Private Topic</h2>
              <JoinPrivateTopicForm />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
