'use client'

import { Eye, Trash } from './Icons'

interface TokenBalanceProps {
  eyes: number
  trash: number
}

export function TokenBalance({ eyes, trash }: TokenBalanceProps) {
  return (
    <div className="flex items-center justify-between bg-slate-100 rounded px-2 py-1 border border-slate-200 mt-1">
      <div className="flex items-center gap-1.5" title="Eyes">
        <Eye className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-xs font-bold text-slate-700">{eyes}</span>
      </div>
      <div className="w-px h-3 bg-slate-300 mx-2"></div>
      <div className="flex items-center gap-1.5" title="Trash">
        <Trash className="w-3.5 h-3.5 text-red-600" />
        <span className="text-xs font-bold text-slate-700">{trash}</span>
      </div>
    </div>
  )
}
