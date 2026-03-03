'use client'

import { Opinion, User } from '@/app/types'
import OpinionDetailView from './OpinionDetailView'

interface OpinionDetailModalProps {
  opinion: Opinion
  user?: User | null
  onClose: () => void
}

export default function OpinionDetailModal({ opinion, user = null, onClose }: OpinionDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex-1 overflow-hidden p-6">
            <OpinionDetailView 
                opinion={opinion} 
                user={user}
                onClose={onClose} 
            />
        </div>
      </div>
    </div>
  )
}
