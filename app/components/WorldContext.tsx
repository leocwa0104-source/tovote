 'use client'
 
 import { createContext, useContext, useEffect, useMemo, useState } from 'react'
 
 type WorldMode = 'online' | 'real'
 
 type WorldContextValue = {
   mode: WorldMode
   setMode: (m: WorldMode) => void
   toggle: () => void
 }
 
 const WorldContext = createContext<WorldContextValue | null>(null)
 
 export function WorldProvider({ children }: { children: React.ReactNode }) {
   const [mode, setModeState] = useState<WorldMode>('online')
 
   useEffect(() => {
     try {
       const saved = localStorage.getItem('worldMode')
       if (saved === 'online' || saved === 'real') {
         setModeState(saved)
       }
     } catch {
       /* noop */
     }
   }, [])
 
   useEffect(() => {
     try {
       localStorage.setItem('worldMode', mode)
     } catch {
       /* noop */
     }
   }, [mode])
 
   const setMode = (m: WorldMode) => setModeState(m)
   const toggle = () => setModeState(prev => (prev === 'online' ? 'real' : 'online'))
 
   const value = useMemo<WorldContextValue>(() => ({ mode, setMode, toggle }), [mode])
 
   return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
 }
 
 export function useWorld() {
   const ctx = useContext(WorldContext)
   if (!ctx) {
     throw new Error('useWorld must be used within WorldProvider')
   }
   return ctx
 }
 
