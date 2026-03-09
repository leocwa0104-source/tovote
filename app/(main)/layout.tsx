import TopicSidebar from '@/app/components/TopicSidebar'
import MainLayoutClient from '@/app/components/MainLayoutClient'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MainLayoutClient sidebar={<TopicSidebar />}>
      {children}
    </MainLayoutClient>
  )
}
