import * as React from 'react'
import { motion } from 'framer-motion'
import { Home, Search, Library, Settings, Heart, Music, ListMusic, User } from 'lucide-react'
import { useStore } from '../../store'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { cn } from '../ui/Button'

interface SidebarProps {
  onNavigate: (page: string) => void
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { currentPage, sidebarCollapsed, toggleSidebar, library } = useStore()

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="glass-strong h-full flex flex-col border-r border-white/5 overflow-hidden"
      style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg gradient-text">Musify</span>
          </div>
        )}
        <Button
          variant="icon"
          size="icon"
          onClick={toggleSidebar}
          className={sidebarCollapsed ? 'flex-shrink-0 ml-auto' : 'flex-shrink-0 ml-auto'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5l7 7-7 7" /></svg>
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1" role="navigation" aria-label="Main navigation">
        <ul className="space-y-0.5" role="list">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id
            const Icon = item.icon

            return (
              <motion.li key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                    isActive
                      ? 'text-white bg-white/10 font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-pink-400')} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              </motion.li>
            )
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-white/5">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg glass border border-white/5">
            <span className="text-pink-400 text-sm">Musify</span>
            <span className="text-xs text-white/40">v1.0.0</span>
          </div>
        )}
      </div>
    </motion.aside>
  )
}