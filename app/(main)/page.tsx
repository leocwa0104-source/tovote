import { getCurrentUser } from '@/app/actions'
import CreatePublicTopicForm from '@/app/components/CreatePublicTopicForm'
import CreatePrivateTopicForm from '@/app/components/CreatePrivateTopicForm'
import JoinPrivateTopicForm from '@/app/components/JoinPrivateTopicForm'

export const dynamic = 'force-dynamic'

export default async function Home(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // Added timestamp to force rebuild
  const timestamp = Date.now()
  const searchParams = await props.searchParams
  const user = await getCurrentUser()
  const initialTitle = Array.isArray(searchParams?.title) ? searchParams?.title?.[0] : searchParams?.title
  const action = Array.isArray(searchParams?.action) ? searchParams?.action?.[0] : searchParams?.action

  // Default to public if no action or invalid action
  const isCreatePrivate = action === 'create-private'
  const isJoinPrivate = action === 'join-private'
  const isPublic = !isCreatePrivate && !isJoinPrivate

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to ToVote</h1>
        <p className="text-gray-600">Select a topic from the sidebar to start debating, or create a new one below.</p>
      </div>

      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {isPublic && (
          <>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Create a Public Topic</h2>
            <CreatePublicTopicForm 
              key={typeof initialTitle === 'string' ? initialTitle : 'default'}
              user={user} 
              initialTitle={typeof initialTitle === 'string' ? initialTitle : undefined} 
            />
          </>
        )}

        {isCreatePrivate && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Create a Private Topic</h2>
            <CreatePrivateTopicForm 
              key={typeof initialTitle === 'string' ? initialTitle : 'default'}
              user={user} 
              initialTitle={typeof initialTitle === 'string' ? initialTitle : undefined} 
            />
          </div>
        )}
        
        {isJoinPrivate && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Join a Private Topic</h2>
            <JoinPrivateTopicForm />
          </div>
        )}
      </div>
    </div>
  )
}
