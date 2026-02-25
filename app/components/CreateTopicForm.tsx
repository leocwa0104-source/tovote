'use client'

import { createTopic } from '@/app/actions'
import { useState } from 'react'

export default function CreateTopicForm({ user }: { user: any }) {
  const [isPrivate, setIsPrivate] = useState(false)

  if (!user) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded border border-gray-200 text-gray-600">
        <p className="mb-2">Please login to create a topic.</p>
        <p className="text-sm text-gray-500">Enter a username in the top right corner.</p>
      </div>
    )
  }

  return (
    <form action={createTopic} className="flex flex-col gap-4">
      <input
        type="text"
        name="title"
        placeholder="Topic Title (e.g., Cats vs Dogs)"
        className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <textarea
        name="description"
        placeholder="Brief description..."
        className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={3}
      />
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPrivate"
          name="isPrivate"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
        />
        <label htmlFor="isPrivate" className="text-sm text-gray-700 select-none cursor-pointer">
          Private Topic (requires password)
        </label>
      </div>

      {isPrivate && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <input
            type="password"
            name="password"
            placeholder="Set a password..."
            className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={isPrivate}
          />
          <p className="text-xs text-gray-500 mt-1">
            Users will need this password to view the topic.
          </p>
        </div>
      )}

      <button
        type="submit"
        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors mt-2"
      >
        Create Topic
      </button>
    </form>
  )
}
