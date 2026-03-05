'use client'

import { useState } from 'react'
import { VotePackage } from '@/app/types'
import { createVotePackage, updateVotePackage, deleteVotePackage } from '@/app/actions/admin'

interface AdminVotePackagesProps {
  packages: VotePackage[]
}

export default function AdminVotePackages({ packages }: AdminVotePackagesProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    label: '',
    cost: 1,
    value: 10
  })

  const resetForm = () => {
    setForm({
      label: '',
      cost: 1,
      value: 10
    })
    setEditingId(null)
  }

  const handleEdit = (pkg: VotePackage) => {
    setEditingId(pkg.id)
    setForm({
      label: pkg.label,
      cost: pkg.cost,
      value: pkg.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      await updateVotePackage(editingId, form)
    } else {
      await createVotePackage(form)
    }
    resetForm()
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8">
      <h2 className="text-xl font-bold mb-4">Vote Packages (Use Tickets to Vote)</h2>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded border border-gray-200 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Label</label>
          <input 
            type="text" 
            required 
            placeholder="e.g. Basic Vote"
            value={form.label}
            onChange={e => setForm({...form, label: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Cost (Tickets)</label>
          <input 
            type="number" 
            required 
            min="1"
            value={form.cost}
            onChange={e => setForm({...form, cost: parseInt(e.target.value)})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Value (Votes)</label>
          <input 
            type="number" 
            required 
            min="1"
            value={form.value}
            onChange={e => setForm({...form, value: parseInt(e.target.value)})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div className="col-span-3 flex justify-end gap-2 mt-2">
          {editingId && (
            <button 
              type="button" 
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {editingId ? 'Update Option' : 'Create Option'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost (Tickets)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value (Votes)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pkg.label}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.cost}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.value}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                  <button 
                    onClick={() => handleEdit(pkg)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteVotePackage(pkg.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No vote options found. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
