'use client'

import { useState } from 'react'
import { buyPackage } from '@/app/actions'
import { PACKAGES, PackageId } from '@/lib/constants'

interface Purchase {
  packageId: string
  createdAt: Date
  remainingTickets: number
  expiresAt: Date
}

export default function TicketBalance({ tickets, purchases }: { tickets: number, purchases: Purchase[] }) {
  const [showStore, setShowStore] = useState(false)
  const [loading, setLoading] = useState(false)

  // Filter only active purchases for display
  const activePurchases = purchases.filter(p => p.remainingTickets > 0 && new Date(p.expiresAt) > new Date())

  const handleBuy = async (pkgId: PackageId) => {
    setLoading(true)
    try {
      const res = await buyPackage(pkgId)
      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl
      } else {
        alert(res.error || 'Purchase failed')
      }
    } catch {
      alert('Error initiating purchase')
    } finally {
      setLoading(false)
    }
  }

  // Remove old PACKAGES definition

  return (
    <div className="flex items-center justify-between bg-amber-50 rounded px-2 py-1 border border-amber-100 relative">
      <div className="text-xs font-bold text-amber-700 flex items-center gap-1">
        <span>🎟️</span>
        <span>{tickets} Tickets</span>
      </div>
      <button 
        onClick={() => setShowStore(!showStore)}
        className="text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-800 px-1.5 py-0.5 rounded font-bold transition-colors"
      >
        + Add
      </button>

      {showStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowStore(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-amber-50 p-4 border-b border-amber-100 flex justify-between items-center">
              <h3 className="font-bold text-amber-900">Ticket Store</h3>
              <div className="flex gap-2 items-center">
                <button onClick={() => setShowStore(false)} className="text-amber-500 hover:text-amber-700">✕</button>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {/* Active Tickets Summary */}
              {activePurchases.length > 0 && (
                <div className="mb-2 p-2 bg-amber-50 rounded border border-amber-100 text-[10px] text-amber-800">
                  <div className="font-bold mb-1">Your Active Tickets (Expiring Soon)</div>
                  {activePurchases.map((p, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{p.remainingTickets} tickets ({p.packageId})</span>
                      <span className="text-amber-600">Expires: {new Date(p.expiresAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {Object.values(PACKAGES).map(pkg => {
                const lastPurchase = purchases.find(p => p.packageId === pkg.id)
                const isCooldown = lastPurchase && (Date.now() - new Date(lastPurchase.createdAt).getTime() < pkg.limitMs)
                
                return (
                  <div key={pkg.id} className={`border rounded-lg p-3 flex justify-between items-center ${isCooldown ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-amber-200'}`}>
                    <div>
                      <div className="font-bold text-gray-800">{pkg.label} Pack</div>
                      <div className="text-xs text-gray-500">
                        {pkg.tickets} Tickets • ¥{pkg.price}
                      </div>
                    </div>
                    <button
                      onClick={() => handleBuy(pkg.id as PackageId)}
                      disabled={loading || !!isCooldown}
                      className={`px-3 py-1.5 rounded text-sm font-bold ${
                        isCooldown 
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                          : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                      }`}
                    >
                      {isCooldown ? 'Limit Reached' : 'Buy'}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="p-3 bg-gray-50 text-xs text-center text-gray-500 border-t border-gray-100">
              Wechat / Alipay supported.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
