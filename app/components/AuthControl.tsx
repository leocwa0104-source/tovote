'use client'

import { login, logout } from '@/app/actions'
import { useState } from 'react'

export default function AuthControl({ user }: { user: any }) {
  const [loading, setLoading] = useState(false)

  if (user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-gray-700">Hi, {user.username}</span>
        <button 
          onClick={async () => {
            setLoading(true)
            await logout()
            setLoading(false)
          }} 
          disabled={loading}
          className="text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {loading ? '...' : 'Logout'}
        </button>
      </div>
    )
  }

  return (
    <form action={login} className="flex gap-2 items-center">
      <input 
        name="username" 
        placeholder="Username" 
        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
        required 
      />
      <button 
        type="submit" 
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
      >
        Enter
      </button>
    </form>
  )
}
