import { useState, useEffect } from 'react'
import Sidebar from '@/app/components/@system/Sidebar'
import Header from '@/app/components/@system/Header'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function Layout({ children }) {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close mobile drawer when viewport grows to desktop
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false)
  }, [isMobile])

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      {/* Main area — offset by sidebar width on desktop */}
      <div className="flex flex-col min-h-screen md:ml-64">
        <Header onMenuToggle={() => setSidebarOpen(v => !v)} />
        {/* pt-16 clears the fixed header height */}
        <main className="flex-1 overflow-auto p-4 pt-20 pb-safe sm:p-6 sm:pt-20">
          {children}
        </main>
      </div>
    </div>
  )
}
