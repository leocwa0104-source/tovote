 'use client'
 
 import { createFaction } from '@/app/actions'
 import { checkFactionSimilarity, type FactionSimilarityResult } from '@/app/actions/ai'
 import { useEffect, useState } from 'react'
 
type User = { id: string; username: string }

export default function CreateFactionForm({ topicId, user, initialName }: { topicId: string; user: User | null, initialName?: string }) {
   const [name, setName] = useState(initialName ?? '')
  const [seekBrainstorming, setSeekBrainstorming] = useState(false)
  const [seekRational, setSeekRational] = useState(false)
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
      } catch {
        setSimilarFactions([])
      } finally {
        setIsChecking(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [name, topicId])

  const handleSubmit = async (formData: FormData) => {
    // Manual validation for checkboxes
    const isBrainstorming = formData.get('seekBrainstorming') === 'on'
    const isRational = formData.get('seekRational') === 'on'
    
    if (!isBrainstorming && !isRational) {
      alert('Please select at least one faction style (Brainstorming or Rational).')
      return
    }

    const result = await createFaction(topicId, null, formData)
    if (result && !result.success) {
      alert(result.error || 'Failed to create faction')
    }
  }

  return (
    <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-12">
      <h3 className="text-lg font-semibold mb-4">Start a New Faction</h3>
      {user ? (
        <form action={handleSubmit} className="flex flex-col gap-4">
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

           <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded border border-gray-100">
             <span className="text-sm font-semibold text-gray-700">Faction Style (Required - select at least one):</span>
             <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <input
                   type="checkbox"
                   id="seekBrainstorming"
                   name="seekBrainstorming"
                   checked={seekBrainstorming}
                   onChange={(e) => setSeekBrainstorming(e.target.checked)}
                   className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                 />
                 <label htmlFor="seekBrainstorming" className="text-sm text-gray-700 select-none cursor-pointer flex items-center gap-1">
                   <span>🧠</span> Brainstorming
                 </label>
               </div>
               <div className="flex items-center gap-2">
                 <input
                   type="checkbox"
                   id="seekRational"
                   name="seekRational"
                   checked={seekRational}
                   onChange={(e) => setSeekRational(e.target.checked)}
                   className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                 />
                 <label htmlFor="seekRational" className="text-sm text-gray-700 select-none cursor-pointer flex items-center gap-1">
                   <span>📊</span> Rational
                 </label>
               </div>
             </div>
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
