'use client'

import { useState, useRef, useEffect } from 'react'

interface OpinionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  opinion: {
    summary: string
    detail: string | null
    type: 'WHY' | 'WHY_NOT'
    author: {
      username: string
    }
    faction?: {
      name: string
      topic?: {
        title: string
      }
    }
  }
}

export default function OpinionDetailModal({ isOpen, onClose, opinion }: OpinionDetailModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const modal = modalRef.current
    if (isOpen && modal && !modal.open) {
      modal.showModal()
    } else if (!isOpen && modal && modal.open) {
      modal.close()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <dialog
      ref={modalRef}
      className="p-0 rounded-lg shadow-xl backdrop:bg-black/30 w-[90vw] max-w-md open:animate-fade-in"
      onClick={(e) => {
        if (e.target === modalRef.current) onClose()
      }}
    >
      <div className="bg-white p-6 rounded-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Territory
            </span>
            <div className="text-xs text-gray-500 mt-1">
              Topic: <span className="font-medium text-gray-700">{opinion.faction?.topic?.title || 'Unknown Topic'}</span>
            </div>
            <div className="text-xs text-gray-500">
              Author: <span className="font-medium text-gray-700">{opinion.author.username}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            ✕
          </button>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
          {opinion.summary}
        </h3>

        {opinion.detail ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap border-t pt-3 mt-3">
            {opinion.detail}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic border-t pt-3 mt-3">
            No additional details provided.
          </p>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  )
}
