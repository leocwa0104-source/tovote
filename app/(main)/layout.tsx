import TopicSidebar from '@/app/components/TopicSidebar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <TopicSidebar />
      <main className="flex-grow overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}
