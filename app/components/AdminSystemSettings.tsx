'use client'

import { useState } from 'react'
import { updateSystemSetting } from '@/app/actions/admin'

interface AdminSystemSettingsProps {
  settings: Record<string, string>
}

export default function AdminSystemSettings({ settings }: AdminSystemSettingsProps) {
  const [publicTopicCooldown, setPublicTopicCooldown] = useState(settings['public_topic_cooldown_minutes'] || '0')
  const [voteCooldown, setVoteCooldown] = useState(settings['faction_vote_cooldown_hours'] || '12')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    setSuccess(false)
    try {
      await Promise.all([
        updateSystemSetting('public_topic_cooldown_minutes', publicTopicCooldown),
        updateSystemSetting('faction_vote_cooldown_hours', voteCooldown)
      ])
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
      
      <div className="max-w-md flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Public Topic Creation Cooldown (Minutes)
          </label>
          <div className="text-xs text-gray-500 mb-2">
            Minimum time a user must wait between creating two public topics. Set to 0 to disable.
          </div>
          <input 
            type="number" 
            min="0"
            value={publicTopicCooldown}
            onChange={e => setPublicTopicCooldown(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Faction Vote Cooldown (Hours)
          </label>
          <div className="text-xs text-gray-500 mb-2">
            Minimum time a user must wait between paid votes on the same faction.
          </div>
          <input 
            type="number" 
            min="0"
            step="0.1"
            value={voteCooldown}
            onChange={e => setVoteCooldown(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Saving Settings...' : 'Save All Settings'}
          </button>
          {success && (
            <p className="mt-2 text-sm text-green-600 text-center">Settings saved successfully!</p>
          )}
        </div>
      </div>
    </div>
  )
}
