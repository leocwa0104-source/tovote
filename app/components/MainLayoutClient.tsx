'use client'

import { WorldProvider } from '@/app/components/WorldContext'
import dynamic from 'next/dynamic'
import React from 'react'

const WorldGate = dynamic(() => import('@/app/components/WorldGate'), { ssr: false })

export default function MainLayoutClient({
  children,
  sidebar,
}: {
  children: React.ReactNode
  sidebar: React.ReactNode
}) {
  return (
    <WorldProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {sidebar}
        <main className="flex-grow overflow-hidden relative">
          <WorldGate>{children}</WorldGate>
        </main>
      </div>
    </WorldProvider>
  )
}
