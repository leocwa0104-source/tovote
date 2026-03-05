'use client'

import { useState } from 'react'
import { TicketPackage } from '@/app/types'
import { createTicketPackage, updateTicketPackage, deleteTicketPackage } from '@/app/actions/admin'

interface AdminTicketPackagesProps {
  packages: TicketPackage[]
}

export default function AdminTicketPackages({ packages }: AdminTicketPackagesProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    ticketCount: 1,
    price: 0,
    duration: 24,
    cooldown: 0
  })

  const resetForm = () => {
    setForm({
      name: '',
      ticketCount: 1,
      price: 0,
      duration: 24,
      cooldown: 0
    })
    setEditingId(null)
  }

  const handleEdit = (pkg: TicketPackage) => {
    setEditingId(pkg.id)
    setForm({
      name: pkg.name,
      ticketCount: pkg.ticketCount,
      price: pkg.price,
      duration: pkg.duration,
      cooldown: pkg.cooldown
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      await updateTicketPackage(editingId, form)
    } else {
      await createTicketPackage(form)
    }
    resetForm()
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Ticket Packages</h2>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded border border-gray-200 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Package Name</label>
          <input 
            type="text" 
            required 
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Tickets</label>
          <input 
            type="number" 
            required 
            min="1"
            value={form.ticketCount}
            onChange={e => setForm({...form, ticketCount: parseInt(e.target.value)})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Price (¥)</label>
          <input 
            type="number" 
            required 
            min="0"
            step="0.01"
            value={form.price}
            onChange={e => setForm({...form, price: parseFloat(e.target.value)})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Duration (Hours)</label>
          <input 
            type="number" 
            required 
            min="1"
            value={form.duration}
            onChange={e => setForm({...form, duration: parseInt(e.target.value)})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Cooldown (Hours)</label>
          <input 
            type="number" 
            required 
            min="0"
            value={form.cooldown}
            onChange={e => setForm({...form, cooldown: parseInt(e.target.value)})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div className="col-span-2 flex justify-end gap-2 mt-2">
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
            {editingId ? 'Update Package' : 'Create Package'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (¥)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cooldown</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pkg.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.ticketCount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥{pkg.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.duration}h</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.cooldown}h</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                  <button 
                    onClick={() => handleEdit(pkg)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteTicketPackage(pkg.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No packages found. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
