 'use client'
 
 import { useWorld } from '@/app/components/WorldContext'
 
 export default function WorldToggle({ className = '' }: { className?: string }) {
   const { mode, toggle } = useWorld()
   const isReal = mode === 'real'
   return (
     <button
       onClick={toggle}
       aria-label={isReal ? '切换到网上世界' : '切换到现实世界'}
       title={isReal ? '切换到网上世界' : '切换到现实世界'}
       className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
         isReal
           ? 'border-red-200 text-red-600 hover:bg-red-50'
           : 'border-gray-200 text-gray-600 hover:bg-gray-100'
       } ${className}`}
     >
       {isReal ? '现实世界' : '网上世界'}
     </button>
   )
 }
