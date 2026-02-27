'use client'

import { useState } from 'react'
import { joinPrivateTopic } from '@/app/actions'
import { useRouter } from 'next/navigation'

export default function JoinPrivateTopicForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError(null)

    const title = formData.get('title') as string
    const creatorName = formData.get('creatorName') as string
    const password = formData.get('password') as string

    if (!title || !creatorName || !password) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    try {
      const result = await joinPrivateTopic(title, creatorName, password)
      if (result.success) {
        if (result.topicId) {
          router.push(`/topic/${result.topicId}`)
        } else {
          router.refresh()
          router.push('/')
        }
      } else {
        setError(result.error || 'Failed to join topic')
      }
    } catch (e) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic Name</label>
          <input 
            name="title" 
            type="text" 
            placeholder="Enter topic name..."
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Creator Username</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">@</span>
            <input 
              name="creatorName" 
              type="text" 
              placeholder="username"
              className="w-full p-2 pl-7 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input 
            name="password" 
            type="password" 
            placeholder="Enter topic password..."
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            required
          />
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="submit"
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Private Topic'}
          </button>
        </div>
      </form>
    </div>
  )
}
