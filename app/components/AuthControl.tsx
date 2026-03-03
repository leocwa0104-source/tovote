'use client'
import { logout } from '@/app/actions'
import { useState } from 'react'
import AuthForm from './AuthForm'

export default function AuthControl({ user }: { user: { username: string } | null }) {
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading] = useState(false)

  if (user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-gray-700 truncate max-w-[80px]" title={user.username}>
          {user.username}
        </span>
        <button 
          onClick={async () => {
            setLoading(true)
            await logout()
            setLoading(false)
          }} 
          disabled={loading}
          className="text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {loading ? '...' : 'Exit'}
        </button>
      </div>
    )
  }

  return (
    <>
      <button 
        onClick={() => setShowLogin(true)}
        className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800 font-medium transition-colors"
      >
        Login / Register
      </button>

      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowLogin(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-xl"
            >
              ×
            </button>
            {/* AuthForm has its own card styling */}
            <AuthForm />
          </div>
        </div>
      )}
    </>
  )
}
