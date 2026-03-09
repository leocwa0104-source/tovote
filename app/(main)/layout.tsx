import TopicSidebar from '@/app/components/TopicSidebar'
import { WorldProvider } from '@/app/components/WorldContext'
import dynamic from 'next/dynamic'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const WorldGate = dynamic(() => import('@/app/components/WorldGate'), { ssr: false })
  return (
    <WorldProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <TopicSidebar />
        <main className="flex-grow overflow-hidden relative">
          <WorldGate>{children}</WorldGate>
        </main>
      </div>
    </WorldProvider>
  )
}
