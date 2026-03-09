 'use client'
 
 import { useWorld } from '@/app/components/WorldContext'
 
 export default function SidebarOnlineOnly({ children }: { children: React.ReactNode }) {
   const { mode } = useWorld()
   if (mode === 'real') return null
   return <>{children}</>
 }
