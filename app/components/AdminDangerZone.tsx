'use client'

import { useState } from 'react'
import { resetAllUserData } from '@/app/actions/admin'

export default function AdminDangerZone() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async () => {
    if (confirmCode !== 'DELETE') {
      return
    }

    if (!window.confirm('Are you absolutely sure? This action CANNOT be undone.')) {
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await resetAllUserData()
      if (res.success) {
        alert('System reset successfully. All topics and user data have been cleared.')
        setShowConfirm(false)
        setConfirmCode('')
        window.location.reload()
      } else {
        setError(res.error || 'Reset failed')
      }
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
      <h2 className="text-xl font-bold mb-4 text-red-600">Danger Zone</h2>
      
      <div className="border-l-4 border-red-500 bg-red-50 p-4 mb-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Reset System Data
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                This action will delete all <strong>Topics</strong>, <strong>Factions</strong>, <strong>Opinions</strong>, <strong>Votes</strong>, and <strong>Purchases</strong>.
              </p>
              <p className="mt-1">
                User accounts and system settings will be preserved, but user balances (tickets/eyes/trash) will be reset to default.
              </p>
            </div>
          </div>
        </div>
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Reset All Data
        </button>
      ) : (
        <div className="max-w-md animate-in fade-in slide-in-from-top-2 duration-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <strong>DELETE</strong> to confirm:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={confirmCode}
              onChange={e => {
                setConfirmCode(e.target.value)
                setError('')
              }}
              placeholder="DELETE"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm px-3 py-2 border"
            />
            <button
              onClick={handleReset}
              disabled={loading || confirmCode !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded transition-colors whitespace-nowrap"
            >
              {loading ? 'Deleting...' : 'Confirm Reset'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false)
                setConfirmCode('')
                setError('')
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
        </div>
      )}
    </div>
  )
}
