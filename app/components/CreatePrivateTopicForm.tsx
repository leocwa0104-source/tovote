'use client'

import { createTopic } from '@/app/actions'
import { useState } from 'react'

type User = { id: string; username: string }

export default function CreatePrivateTopicForm({ user, initialTitle }: { user: User | null, initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle ?? '')
  const [seekBrainstorming, setSeekBrainstorming] = useState(false)
  const [seekRational, setSeekRational] = useState(false)

  if (!user) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded border border-gray-200 text-gray-600">
        <p className="mb-2">Please login to create a private topic.</p>
        <p className="text-sm text-gray-500">Enter a username in the top right corner.</p>
      </div>
    )
  }

  const handleSubmit = async (formData: FormData) => {
    // Manual validation for checkboxes
    const isBrainstorming = formData.get('seekBrainstorming') === 'on'
    const isRational = formData.get('seekRational') === 'on'
    
    if (!isBrainstorming && !isRational) {
      alert('Please select at least one discussion style (Brainstorming or Rational).')
      return
    }

    const result = await createTopic(null, formData)
    if (result && result.message !== 'success') {
      alert(result.message)
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {/* Hidden input to ensure it is created as private */}
      <input type="hidden" name="isPrivate" value="on" />

      <div className="relative">
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Private Topic Title"
          className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          autoComplete="off"
        />
      </div>

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

      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
        <input
          type="password"
          name="password"
          placeholder="Set a password for this private topic..."
          className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Users will need this password to view the topic.
        </p>
      </div>

      <button
        type="submit"
        className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition-colors mt-2"
      >
        Create Private Topic
      </button>
    </form>
  )
}
