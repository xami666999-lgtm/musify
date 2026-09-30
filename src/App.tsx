import * as React from 'react'
import { useEffect } from 'react'
import { useStore } from './store'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/sidebar/Sidebar'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Settings from './pages/Settings'
import { cn } from './components/ui/Button'

const PAGES = {
  home: Home,
  search: Search,
  library: Library,
  settings: Settings,
} as const

type PageComponent = typeof PAGES[keyof typeof PAGES]

type PageKey = keyof typeof PAGES

export default function App() {
  const {
    currentPage,
    setCurrentPage,
    sidebarCollapsed,
    theme,
  } = useStore()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const CurrentPage = PAGES[currentPage as PageKey] || Home

  const handleNavigate = (page: string) => {
    setCurrentPage(page as PageKey)
  }

  return (
    <div className={cn('h-screen flex flex-col bg-mfy-dark-400', theme === 'dark' && 'dark')}>
      <TitleBar />
      
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar onNavigate={handleNavigate} />
        
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto">
            <CurrentPage />
          </div>
        </main>
      </div>
    </div>
  )
}