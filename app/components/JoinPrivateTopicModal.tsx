'use client'

import { useRef, useEffect, useState } from 'react'
import { joinPrivateTopic } from '@/app/actions'
import { useRouter } from 'next/navigation'

interface JoinPrivateTopicModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function JoinPrivateTopicModal({ isOpen, onClose }: JoinPrivateTopicModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const modal = modalRef.current
    if (isOpen && modal && !modal.open) {
      modal.showModal()
    } else if (!isOpen && modal && modal.open) {
      modal.close()
    }
  }, [isOpen])

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
        onClose()
        if (result.topicId) {
          router.push(`/topic/${result.topicId}`)
        } else {
          router.refresh()
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

  if (!isOpen) return null

  return (
    <dialog
      ref={modalRef}
      className="p-0 rounded-lg shadow-xl backdrop:bg-black/30 w-[90vw] max-w-md open:animate-fade-in"
      onClick={(e) => {
        if (e.target === modalRef.current) onClose()
      }}
      onClose={onClose}
    >
      <div className="bg-white p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Join Private Topic</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            ✕
          </button>
        </div>

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
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Topic'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
