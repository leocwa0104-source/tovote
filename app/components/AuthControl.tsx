'use client'
import { logout, updateUsername, updatePassphrase } from '@/app/actions'
import { useState } from 'react'
import AuthForm from './AuthForm'
import Link from 'next/link'

export default function AuthControl({ user }: { user: { username: string; role?: string; passphrase?: string | null } | null }) {
  const [showLogin, setShowLogin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Settings state
  const [newUsername, setNewUsername] = useState('')
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState('')

  const [newPassphrase, setNewPassphrase] = useState('')
  const [editingPassphrase, setEditingPassphrase] = useState(false)
  const [passphraseError, setPassphraseError] = useState('')

  if (user) {
    const initial = user.username.charAt(0).toUpperCase()
    
    return (
      <>
        <button 
          onClick={() => {
            setNewUsername(user.username)
            setNewPassphrase(user.passphrase || '')
            setShowSettings(true)
            setEditingUsername(false)
            setEditingPassphrase(false)
            setUsernameError('')
            setPassphraseError('')
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

                  {/* Passphrase Section */}
                  <div className="text-center w-full">
                    {!editingPassphrase ? (
                      <div className="flex items-center justify-center gap-2 group cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors" onClick={() => setEditingPassphrase(true)}>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-400 font-medium">Passphrase (Login ID)</span>
                            <h3 className="text-lg font-medium text-gray-700">{user.passphrase || 'Set a Passphrase'}</h3>
                        </div>
                        <div className="text-gray-400 group-hover:text-indigo-600 transition-colors self-end mb-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 w-full max-w-[200px] mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        <span className="text-xs text-gray-400 font-medium">Passphrase</span>
                        <input
                          type="text"
                          value={newPassphrase}
                          onChange={(e) => {
                              setNewPassphrase(e.target.value)
                              setPassphraseError('')
                          }}
                          placeholder="e.g. Open Sesame"
                          className="border border-gray-300 rounded px-3 py-1 text-center font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full"
                          autoFocus
                          minLength={1}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                                if (!newPassphrase || newPassphrase.trim().length < 1) {
                                  setPassphraseError('Cannot be empty')
                                  return
                                }
                                if (newPassphrase === user.passphrase) {
                                  setEditingPassphrase(false)
                                  return
                                }
                                
                                setLoading(true)
                                const res = await updatePassphrase(newPassphrase)
                                setLoading(false)
                                
                                if (res?.success) {
                                  setEditingPassphrase(false)
                                  setPassphraseError('')
                                } else {
                                  setPassphraseError(res?.error || 'Failed')
                                }
                            } else if (e.key === 'Escape') {
                                setEditingPassphrase(false)
                                setNewPassphrase(user.passphrase || '')
                            }
                          }}
                        />
                        {passphraseError && <p className="text-xs text-red-500 font-medium">{passphraseError}</p>}
                        
                        <div className="flex justify-center gap-2 mt-1">
                          <button 
                            onClick={() => {
                              setEditingPassphrase(false)
                              setNewPassphrase(user.passphrase || '')
                              setPassphraseError('')
                            }}
                            className="text-xs px-3 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            disabled={loading}
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={async () => {
                              if (!newPassphrase || newPassphrase.trim().length < 1) {
                                setPassphraseError('Cannot be empty')
                                return
                              }
                              if (newPassphrase === user.passphrase) {
                                setEditingPassphrase(false)
                                return
                              }
                              
                              setLoading(true)
                              const res = await updatePassphrase(newPassphrase)
                              setLoading(false)
                              
                              if (res?.success) {
                                setEditingPassphrase(false)
                                setPassphraseError('')
                              } else {
                                setPassphraseError(res?.error || 'Failed')
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

                {user.role === 'ADMIN' && (
                  <Link 
                    href="/admin"
                    onClick={() => setShowSettings(false)}
                    className="w-full py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 group"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin Dashboard
                  </Link>
                )}

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
