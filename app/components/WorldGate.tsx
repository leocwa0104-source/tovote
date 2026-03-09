 'use client'
 
 import { useWorld } from '@/app/components/WorldContext'
 
 export default function WorldGate({ children }: { children: React.ReactNode }) {
   const { mode } = useWorld()
   if (mode === 'real') {
     return null
   }
   return <>{children}</>
 }
