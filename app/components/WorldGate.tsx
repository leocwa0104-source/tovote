 'use client'

import { useWorld } from '@/app/components/WorldContext'
import RealWorldLayout from '@/app/components/RealWorld/RealWorldLayout'

export default function WorldGate({ children }: { children: React.ReactNode }) {
  const { mode } = useWorld()
  if (mode === 'real') {
    return <RealWorldLayout />
  }
  return <>{children}</>
}
