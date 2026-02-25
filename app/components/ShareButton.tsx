'use client'

import { useState } from 'react'
import { ShareIcon, CheckIcon } from './Icons'

export default function ShareButton({ title, text }: { title: string, text: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href

    // Try native share API first (works on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        })
        return
      } catch (err) {
        // Fallback to clipboard if user cancelled or error
        console.log('Share cancelled or failed', err)
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
      alert('Failed to copy link. Please copy it manually from the address bar.')
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-sm font-medium"
      title="Share Topic"
    >
      {copied ? (
        <>
          <CheckIcon className="w-4 h-4 text-green-600" />
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <ShareIcon className="w-4 h-4" />
          <span>Share</span>
        </>
      )}
    </button>
  )
}
