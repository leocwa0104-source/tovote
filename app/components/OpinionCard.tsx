'use client'

import { useState } from 'react'
import { createOpinion, deleteOpinion } from '@/app/actions'

interface Opinion {
  id: string
  summary: string
  detail: string | null
  type: 'WHY' | 'WHY_NOT'
  authorId: string
  author: {
    username: string
  }
  updatedAt: Date
}

interface OpinionCardProps {
  opinion?: Opinion
  factionId: string
  type: 'WHY' | 'WHY_NOT'
  currentUser: { id: string; username: string } | null
  isMember: boolean
}

export default function OpinionCard({ opinion, factionId, type, currentUser, isMember }: OpinionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  const isOwner = currentUser && opinion?.authorId === currentUser.id
  
  // Avatar color generator
  const getAvatarColor = (username: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
      'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 
      'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 
      'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
      'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      await createOpinion(formData)
      setIsEditing(false)
    } catch (error) {
      console.error(error)
      alert('Failed to save opinion')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!opinion) return
    if (!confirm('Are you sure you want to remove your opinion?')) return

    setLoading(true)
    try {
      await deleteOpinion(opinion.id)
    } catch (error) {
      console.error(error)
      alert('Failed to delete opinion')
    } finally {
      setLoading(false)
    }
  }

  // If editing or no opinion yet (and is member), show form
  if (isEditing || (!opinion && isMember)) {
    // If not member, don't show create form
    if (!isMember) return null

    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">
          {opinion ? 'Edit your opinion' : `Add your "${type === 'WHY' ? 'Why Join' : 'Why Not'}" opinion`}
        </h4>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="factionId" value={factionId} />
          <input type="hidden" name="type" value={type} />
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Core Argument (Summary)</label>
            <input
              type="text"
              name="summary"
              defaultValue={opinion?.summary || ''}
              placeholder="E.g., It's the most logical choice because..."
              className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              required
              maxLength={100}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Detailed Explanation (Optional)</label>
            <textarea
              name="detail"
              defaultValue={opinion?.detail || ''}
              placeholder="Expand on your point..."
              className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm min-h-[100px]"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            {opinion && (
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Opinion'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Display Mode
  if (!opinion) return null

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ${getAvatarColor(opinion.author.username)}`}>
          {opinion.author.username[0].toUpperCase()}
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 font-medium">{opinion.author.username}</span>
            {isOwner && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button 
                  onClick={handleDelete} 
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          
          <h5 className="font-semibold text-gray-800 text-sm mt-1 break-words">{opinion.summary}</h5>
          
          {opinion.detail && (
            <div className="mt-2">
              {isExpanded ? (
                <div className="text-sm text-gray-600 whitespace-pre-wrap break-words border-t border-gray-100 pt-2 mt-2">
                  {opinion.detail}
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="block mt-2 text-xs text-blue-500 hover:underline"
                  >
                    Show less
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="text-xs text-blue-500 hover:underline mt-1"
                >
                  Read more...
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
