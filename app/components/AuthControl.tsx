'use client'
import { logout, updateUsername } from '@/app/actions'
import { useState } from 'react'
import AuthForm from './AuthForm'

export default function AuthControl({ user }: { user: { username: string } | null }) {
  const [showLogin, setShowLogin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Settings state
  const [newUsername, setNewUsername] = useState('')
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState('')

  if (user) {
    const initial = user.username.charAt(0).toUpperCase()
    
    return (
      <>
        <button 
          onClick={() => {
            setNewUsername(user.username)
            setShowSettings(true)
            setEditingUsername(false)
            setUsernameError('')
          }}
          className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm hover:bg-indigo-200 transition-colors border border-indigo-200"
          title={user.username}
        >
          {initial}
        </button>

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setShowSettings(false)}></div>
            
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative z-10 flex flex-col items-center p-6 gap-6">
               <button 
                  onClick={() => setShowSettings(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-3xl border-2 border-indigo-200 select-none">
                    {initial}
                  </div>
                  
                  <div className="text-center w-full">
                    {!editingUsername ? (
                      <div className="flex items-center justify-center gap-2 group cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors" onClick={() => setEditingUsername(true)}>
                        <h3 className="text-xl font-bold text-gray-800">{user.username}</h3>
                        <div className="text-gray-400 group-hover:text-indigo-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 w-full max-w-[200px] mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => {
                              setNewUsername(e.target.value)
                              setUsernameError('')
                          }}
                          className="border border-gray-300 rounded px-3 py-1 text-center font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full"
                          autoFocus
                          minLength={3}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                                if (!newUsername || newUsername.trim().length < 3) {
                                  setUsernameError('Min 3 chars')
                                  return
                                }
                                if (newUsername === user.username) {
                                  setEditingUsername(false)
                                  return
                                }
                                
                                setLoading(true)
                                const res = await updateUsername(newUsername)
                                setLoading(false)
                                
                                if (res?.success) {
                                  setEditingUsername(false)
                                  setUsernameError('')
                                } else {
                                  setUsernameError(res?.error || 'Failed')
                                }
                            } else if (e.key === 'Escape') {
                                setEditingUsername(false)
                                setNewUsername(user.username)
                            }
                          }}
                        />
                        {usernameError && <p className="text-xs text-red-500 font-medium">{usernameError}</p>}
                        
                        <div className="flex justify-center gap-2 mt-1">
                          <button 
                            onClick={() => {
                              setEditingUsername(false)
                              setNewUsername(user.username)
                              setUsernameError('')
                            }}
                            className="text-xs px-3 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            disabled={loading}
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={async () => {
                              if (!newUsername || newUsername.trim().length < 3) {
                                setUsernameError('Min 3 chars')
                                return
                              }
                              if (newUsername === user.username) {
                                setEditingUsername(false)
                                return
                              }
                              
                              setLoading(true)
                              const res = await updateUsername(newUsername)
                              setLoading(false)
                              
                              if (res?.success) {
                                setEditingUsername(false)
                                setUsernameError('')
                              } else {
                                setUsernameError(res?.error || 'Failed')
                              }
                            }}
                            className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                            disabled={loading}
                          >
                            {loading ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full border-t border-gray-100"></div>

                <button 
                  onClick={async () => {
                    setLoading(true)
                    await logout()
                  }} 
                  disabled={loading}
                  className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 group"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {loading ? 'Logging out...' : 'Log Out'}
                </button>
            </div>
          </div>
        )}
      </>
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
