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

    const roomCode = formData.get('roomCode') as string
    const password = formData.get('password') as string

    if (!roomCode || !password) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    try {
      const result = await joinPrivateTopic(roomCode, password)
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
    } catch {
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Room Code</label>
          <input 
            name="roomCode" 
            type="text" 
            placeholder="Enter 6-digit room code..."
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm tracking-widest font-mono"
            required
            maxLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">Ask the topic creator for the room code.</p>
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

        <div className="mt-2">
          <button
            type="submit"
            className="w-full px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Topic'}
          </button>
        </div>
      </form>
    </div>
    </div>
  )
}
