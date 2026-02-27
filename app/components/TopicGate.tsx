'use client'

import { useState } from 'react'
import { verifyTopicPassword } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Lock } from './Icons'

export default function TopicGate({ topicId, title }: { topicId: string, title: string }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await verifyTopicPassword(topicId, password)
    
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Invalid password')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border border-gray-200 text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-gray-100 rounded-full">
            <Lock className="text-gray-500 w-8 h-8" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Private Topic</h2>
        <p className="text-gray-600 mb-6">
          The topic <strong>{title}</strong> is password protected.
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full p-3 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Unlock Topic'}
          </button>
        </form>
        
        <div className="mt-6">
          <button 
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:underline"
          >
            &larr; Back to Topics
          </button>
        </div>
      </div>
    </div>
  )
}
