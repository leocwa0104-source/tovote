 'use client'
 
 import { createFaction } from '@/app/actions'
 import { checkFactionSimilarity, type FactionSimilarityResult } from '@/app/actions/ai'
 import { useEffect, useState } from 'react'
 
 export default function CreateFactionForm({ topicId, user }: { topicId: string, user: any }) {
   const [name, setName] = useState('')
   const [similarFactions, setSimilarFactions] = useState<FactionSimilarityResult['matches']>([])
   const [isChecking, setIsChecking] = useState(false)
 
   useEffect(() => {
     const timer = setTimeout(async () => {
       if (name.trim().length < 2) {
         setSimilarFactions([])
         return
       }
 
       setIsChecking(true)
       try {
         const result = await checkFactionSimilarity(topicId, name)
         if (result && Array.isArray(result.matches)) {
           setSimilarFactions(result.matches)
         } else {
           setSimilarFactions([])
         }
       } catch (_e) {
         setSimilarFactions([])
       } finally {
         setIsChecking(false)
       }
     }, 600)
 
     return () => clearTimeout(timer)
   }, [name, topicId])
 
   return (
     <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-12">
       <h3 className="text-lg font-semibold mb-4">Start a New Faction</h3>
       {user ? (
         <form action={createFaction.bind(null, topicId)} className="flex flex-col gap-4">
           <div className="relative">
             <input
               type="text"
               name="name"
               placeholder="Faction Name (e.g., Team Cats)"
               value={name}
               onChange={(e) => setName(e.target.value)}
               className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
               required
               autoComplete="off"
             />
             {isChecking && (
               <div className="absolute right-3 top-3">
                 <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
             )}
           </div>
 
           {similarFactions.length > 0 && (
             <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm animate-in fade-in slide-in-from-top-1">
               <p className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                 <span>⚠️ Similar factions found in this topic:</span>
               </p>
               <ul className="space-y-2">
                 {similarFactions.map((f) => (
                   <li key={f.id} className="flex justify-between items-center bg-white p-2 rounded border border-amber-100 shadow-sm">
                     <div>
                       <span className="font-medium text-gray-800 block">{f.name}</span>
                       <span className="text-xs text-gray-500">{f.reason}</span>
                     </div>
                   </li>
                 ))}
               </ul>
             </div>
           )}
 
           <button
             type="submit"
             className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors self-start px-6"
           >
             Create Faction
           </button>
         </form>
       ) : (
         <p className="text-gray-500 italic">Login to create a new faction.</p>
       )}
     </div>
   )
 }
