import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Music, User, Album, TrendingUp, Clock, Loader2 } from 'lucide-react'
import { useStore } from '../../store'
import { audioEngine } from '../../services/audioEngine'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { ScrollArea } from '../ui/ScrollArea'
import { cn } from '../ui/Button'
import { formatTime } from '../../lib/utils'

interface SearchResultItemProps {
  item: any
  type: 'track' | 'artist' | 'album' | 'playlist'
  onClick: () => void
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ item, type, onClick }) => {
  const icons = { track: Music, artist: User, album: Album, playlist: Music }
  const Icon = icons[type]

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
        'hover:bg-white/5 active:bg-white/10 transition-colors',
        'text-left'
      )}
      aria-label={`${type}: ${item.title || item.name}`}
    >
      {item.albumArtUrl || item.imageUrl || item.artworkUrl ? (
        <img
          src={item.albumArtUrl || item.imageUrl || item.artworkUrl}
          alt=""
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded bg-gradient-to-br from-pink-500/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-white/50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate line-clamp-1">
          {item.title || item.name}
        </p>
        <p className="text-sm text-white/50 truncate line-clamp-1">
          {type === 'track' ? item.artist : type === 'album' ? item.artist : `${item.trackCount || 0} tracks`}
        </p>
      </div>
      <Badge variant="default" size="sm" className="text-xs capitalize">{type}</Badge>
    </motion.button>
  )
}

interface SearchBarProps {
  placeholder?: string
  className?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({ placeholder = "Search songs, artists, albums...", className = "" }) => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchDebounceTimer,
    setSearchDebounceTimer,
    currentPage,
    setCurrentPage,
  } = useStore()

  const [showDropdown, setShowDropdown] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowDropdown(value.length > 0)

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    if (value.length < 2) {
      setSearchResults({ tracks: [], artists: [], albums: [], playlists: [] })
      return
    }

    const timer = window.setTimeout(async () => {
      try {
        const results = await window.electronAPI.ytmusic.search(value, 'songs', 10)
        if (results.success && results.data) {
          setSearchResults(results.data)
        }
      } catch (error) {
        console.error('Search error:', error)
      }
    }, 300)

    setSearchDebounceTimer(timer as unknown as NodeJS.Timeout)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = searchResults.tracks.length + searchResults.artists.length + searchResults.albums.length
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          const allItems = [
            ...searchResults.tracks.map(t => ({ ...t, type: 'track' as const })),
            ...searchResults.artists.map(a => ({ ...a, type: 'artist' as const })),
            ...searchResults.albums.map(a => ({ ...a, type: 'album' as const })),
          ]
          const selected = allItems[selectedIndex]
          if (selected) {
            handleResultClick(selected)
          }
        } else if (searchQuery.trim()) {
          setCurrentPage('search-results')
          setShowDropdown(false)
        }
        break
      case 'Escape':
        setShowDropdown(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleResultClick = async (item: any) => {
    if (item.type === 'track') {
      const stream = await window.electronAPI.ytmusic.getStream(item.videoId || item.id)
      if (stream.success && stream.data) {
        audioEngine.playTrack(item, stream.data.streamUrl)
      }
    } else if (item.type === 'artist') {
      setCurrentPage('search-results')
    } else if (item.type === 'album') {
      setCurrentPage('search-results')
    } else if (item.type === 'playlist') {
      setCurrentPage('search-results')
    }
    setShowDropdown(false)
    setSearchQuery('')
    setSelectedIndex(-1)
  }

  const handleClear = () => {
    setSearchQuery('')
    setSearchResults({ tracks: [], artists: [], albums: [] })
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const hasResults = searchResults.tracks.length > 0 || searchResults.artists.length > 0 || searchResults.albums.length > 0 || (searchResults.playlists?.length || 0) > 0

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchQuery.length > 0 && hasResults && setShowDropdown(true)}
          placeholder={placeholder}
          className={cn(
            'input-base w-full pl-12 pr-12 py-2.5',
            'bg-mfy-dark-300/50 border-white/10',
            'focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20',
            'placeholder-white/30',
            className
          )}
          aria-label="Search"
          aria-autocomplete="list"
          aria-controls="search-dropdown"
          aria-expanded={showDropdown && hasResults}
        />
        {searchQuery && (
          <Button
            variant="icon"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && hasResults && (
          <motion.div
            ref={dropdownRef}
            key="dropdown"
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            id="search-dropdown"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50"
            style={{ border: '1px solid rgba(255,255,255,0.05)', maxHeight: 400 }}
          >
            <ScrollArea className="p-2">
              <div className="space-y-1" role="listbox">
                {searchResults.tracks.slice(0, 5).map((track, index) => (
                  <SearchResultItem
                    key={`track-${track.id}`}
                    item={track}
                    type="track"
                    onClick={() => handleResultClick({ ...track, type: 'track' })}
                  />
                ))}
                {searchResults.artists.slice(0, 3).map((artist, index) => (
                  <SearchResultItem
                    key={`artist-${artist.id}`}
                    item={artist}
                    type="artist"
                    onClick={() => handleResultClick({ ...artist, type: 'artist' })}
                  />
                ))}
                {searchResults.albums.slice(0, 3).map((album, index) => (
                  <SearchResultItem
                    key={`album-${album.id}`}
                    item={album}
                    type="album"
                    onClick={() => handleResultClick({ ...album, type: 'album' })}
                  />
                ))}
                {searchResults.playlists?.slice(0, 3).map((playlist, index) => (
                  <SearchResultItem
                    key={`playlist-${playlist.id}`}
                    item={playlist}
                    type="playlist"
                    onClick={() => handleResultClick({ ...playlist, type: 'playlist' })}
                  />
                ))}
              </div>
            </ScrollArea>
            
            <div className="px-3 py-2 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
              <span>Press Enter to search all results</span>
              <TrendingUp className="w-4 h-4" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}