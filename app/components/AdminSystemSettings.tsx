'use client'

import { useState } from 'react'
import { updateSystemSetting } from '@/app/actions/admin'

interface AdminSystemSettingsProps {
  settings: Record<string, string>
}

export default function AdminSystemSettings({ settings }: AdminSystemSettingsProps) {
  const [cooldown, setCooldown] = useState(settings['public_topic_cooldown_minutes'] || '0')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    setSuccess(false)
    try {
      await updateSystemSetting('public_topic_cooldown_minutes', cooldown)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      alert('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4">System Settings</h2>
      
      <div className="max-w-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Public Topic Creation Cooldown (Minutes)
          </label>
          <div className="text-xs text-gray-500 mb-2">
            Minimum time a user must wait between creating two public topics. Set to 0 to disable.
          </div>
          <div className="flex gap-2">
            <input 
              type="number" 
              min="0"
              value={cooldown}
              onChange={e => setCooldown(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
            />
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
          {success && (
            <p className="mt-2 text-sm text-green-600">Settings saved successfully!</p>
          )}
        </div>
      </div>
    </div>
  )
}
