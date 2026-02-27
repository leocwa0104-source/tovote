import { getCurrentUser } from '@/app/actions'
import CreateTopicForm from '@/app/components/CreateTopicForm'

export const dynamic = 'force-dynamic'

export default async function Home(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams
  const user = await getCurrentUser()
  const initialTitle = Array.isArray(searchParams?.title) ? searchParams?.title?.[0] : searchParams?.title

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to ToVote</h1>
        <p className="text-gray-600">Select a topic from the sidebar to start debating, or create a new one below.</p>
      </div>

      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Create a New Topic</h2>
        <CreateTopicForm user={user} initialTitle={typeof initialTitle === 'string' ? initialTitle : undefined} />
      </div>
    </div>
  )
}
