'use client'

import { createTopic } from '@/app/actions'
import { checkTopicSimilarity, type SimilarityResult } from '@/app/actions/ai'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type User = { id: string; username: string }

export default function CreatePublicTopicForm({ user, initialTitle }: { user: User | null, initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle ?? '')
  const [seekBrainstorming, setSeekBrainstorming] = useState(false)
  const [seekRational, setSeekRational] = useState(false)
  const [similarTopics, setSimilarTopics] = useState<SimilarityResult['matches']>([])
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title.trim().length < 3) {
        setSimilarTopics([])
        return
      }
      
      setIsChecking(true)
      try {
        const result = await checkTopicSimilarity(title)
        // Ensure result and matches exist before setting
        if (result && Array.isArray(result.matches)) {
          setSimilarTopics(result.matches)
        } else {
          setSimilarTopics([])
        }
      } catch (e) {
        console.error("Similarity check failed", e)
        setSimilarTopics([])
      } finally {
        setIsChecking(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [title])

  if (!user) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded border border-gray-200 text-gray-600">
        <p className="mb-2">Please login to create a topic.</p>
        <p className="text-sm text-gray-500">Enter a username in the top right corner.</p>
      </div>
    )
  }

  const handleSubmit = async (formData: FormData) => {
    if (similarTopics.length > 0) {
      if (!confirm('There are similar topics already. Are you sure you want to create a new one?')) {
        return
      }
    }

    // Manual validation for checkboxes
    const isBrainstorming = formData.get('seekBrainstorming') === 'on'
    const isRational = formData.get('seekRational') === 'on'
    
    if (!isBrainstorming && !isRational) {
      alert('Please select at least one discussion style (Brainstorming or Rational).')
      return
    }

    const result = await createTopic(null, formData)
    if (result && !result.success) {
      alert(result.error || 'Failed to create topic')
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="relative">
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Topic Title (e.g., Cats vs Dogs)"
          className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          autoComplete="off"
        />
        {isChecking && (
          <div className="absolute right-3 top-3">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {similarTopics.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm animate-in fade-in slide-in-from-top-1">
          <p className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <span>⚠️ Similar topics found:</span>
          </p>
          <ul className="space-y-2">
            {similarTopics.map((topic) => (
              <li key={topic.id} className="flex justify-between items-center bg-white p-2 rounded border border-amber-100 shadow-sm">
                <div>
                  <span className="font-medium text-gray-800 block">{topic.title}</span>
                  <span className="text-xs text-gray-500">{topic.reason}</span>
                </div>
                <Link 
                  href={`/topic/${topic.id}`}
                  className="text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors font-medium whitespace-nowrap ml-2"
                >
                  Join Debate
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded border border-gray-100">
        <span className="text-sm font-semibold text-gray-700">Discussion Style (Required - select at least one):</span>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="seekBrainstorming"
              name="seekBrainstorming"
              checked={seekBrainstorming}
              onChange={(e) => setSeekBrainstorming(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
            />
            <label htmlFor="seekBrainstorming" className="text-sm text-gray-700 select-none cursor-pointer flex items-center gap-1">
              <span>🧠</span> Seek Brainstorming
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="seekRational"
              name="seekRational"
              checked={seekRational}
              onChange={(e) => setSeekRational(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="seekRational" className="text-sm text-gray-700 select-none cursor-pointer flex items-center gap-1">
              <span>📊</span> Seek Rational
            </label>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors mt-2"
      >
        Create Public Topic
      </button>
    </form>
  )
}
