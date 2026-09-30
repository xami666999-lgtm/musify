import * as React from 'react'
import { motion } from 'framer-motion'
import { Play, Heart, Music, Search, Library, Zap, Clock, TrendingUp, Plus, Shuffle } from 'lucide-react'
import { useStore } from '../store'
import { audioEngine } from '../services/audioEngine'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { SearchBar } from '../components/search/SearchBar'
import { ScrollArea } from '../components/ui/ScrollArea'
import { Badge } from '../components/ui/Badge'
import { cn } from '../components/ui/Button'

interface SectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
}

function Section({ title, subtitle, children, action }: SectionProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-xl gradient-text">{title}</h2>
          {subtitle && <p className="text-white/50 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {children}
      </div>
    </motion.div>
  )
}

function TrackCard({ track, onPlay, onAddToQueue }: { track: any; onPlay: () => void; onAddToQueue: () => void }) {
  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:bg-white/10">
      <CardContent className="p-4">
        <div className="relative aspect-square mb-3 rounded-lg overflow-hidden">
          {track.albumArtUrl ? (
            <img
              src={track.albumArtUrl}
              alt={track.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-cyan-500/30 flex items-center justify-center">
              <Music className="w-12 h-12 text-white/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Button
              variant="primary"
              size="icon"
              onClick={onPlay}
              className="w-12 h-12"
              aria-label="Play"
            >
              <Play className="w-6 h-6 ml-1" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddToQueue}
              className="w-10 h-10"
              aria-label="Add to queue"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <h3 className="font-medium text-white truncate line-clamp-1">{track.title}</h3>
        <p className="text-sm text-white/50 truncate line-clamp-1 mt-0.5">{track.artist}</p>
        {track.album && (
          <p className="text-xs text-white/40 truncate line-clamp-1 mt-0.5">{track.album}</p>
        )}
        {track.duration && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            <span className="text-xs text-white/40">
              <Clock className="w-3 h-3 inline mr-1" />
              {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
            </span>
            {track.isFavorite && (
              <Heart className="w-4 h-4 text-pink-400 fill-current" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QuickActionCard({ icon: Icon, title, description, onClick, gradient }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; onClick: () => void; gradient: string }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative p-6 rounded-2xl text-left overflow-hidden transition-all duration-300',
        'border border-white/10 hover:border-white/20',
        'flex flex-col justify-between min-h-[140px]'
      )}
      style={{ background: `linear-gradient(135deg, ${gradient})` }}
    >
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <Badge variant="default" size="sm">New</Badge>
      </div>
      <div>
        <h3 className="font-semibold text-white text-lg">{title}</h3>
        <p className="text-white/70 text-sm mt-1">{description}</p>
      </div>
    </motion.button>
  )
}

export default function Home() {
  const {
    currentPage,
    setCurrentPage,
    sidebarCollapsed,
    theme,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchDebounceTimer,
    setSearchDebounceTimer,
    playbackState,
    library,
    toggleLikeTrack,
  } = useStore()

  const [recentTracks, setRecentTracks] = React.useState<any[]>([])
  const [trendingTracks, setTrendingTracks] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [recent, trending] = await Promise.all([
        window.electronAPI.ytmusic.search('top hits 2024', 'songs', 10),
        window.electronAPI.ytmusic.search('trending music', 'songs', 10),
      ])
      if (recent.success && recent.data) {
        setRecentTracks(recent.data.tracks)
      }
      if (trending.success && trending.data) {
        setTrendingTracks(trending.data.tracks)
      }
    } catch (error) {
      console.error('Failed to load home data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayTrack = (track: any) => {
    audioEngine.playTrack(track, '')
  }

  const handleAddToQueue = (track: any) => {
    audioEngine.addToQueue(track)
  }

  const handleShufflePlay = async (tracks: any[]) => {
    if (tracks.length === 0) return
    const shuffled = [...tracks].sort(() => Math.random() - 0.5)
    audioEngine.setQueue(shuffled)
    audioEngine.setShuffle(true)
    await audioEngine.playTrackAtIndex(0)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-3xl gradient-text">Musify</h1>
              <p className="text-white/50 mt-1">Your music, your way</p>
            </div>
            <SearchBar
              placeholder="Search songs, artists, albums..."
              className="w-80"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              icon={Shuffle}
              title="Shuffle All"
              description="Mix your library and discover"
              onClick={() => handleShufflePlay([...recentTracks, ...trendingTracks])}
              gradient="#ff6b35, #ff1493"
            />
            <QuickActionCard
              icon={Zap}
              title="Discover Weekly"
              description="Personalized recommendations"
              onClick={() => setCurrentPage('search')}
              gradient="#00d4aa, #0099ff"
            />
            <QuickActionCard
              icon={Heart}
              title="Liked Songs"
              description={`${library.likedTracks.length} tracks`}
              onClick={() => setCurrentPage('library')}
              gradient="#ff1493, #ff6b35"
            />
            <QuickActionCard
              icon={Music}
              title="New Releases"
              description="Latest drops this week"
              onClick={() => setCurrentPage('search')}
              gradient="#7c3aed, #ec4899"
            />
          </div>

          <Section
            title="Recently Played"
            subtitle="Pick up where you left off"
            action={
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage('library')}>
                View All
              </Button>
            }
          >
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-white/10 rounded-lg mb-3" />
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))
            ) : recentTracks.length > 0 ? (
              recentTracks.slice(0, 10).map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onPlay={() => handlePlayTrack(track)}
                  onAddToQueue={() => handleAddToQueue(track)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-white/50">
                <Music className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <p>No recent tracks. Start listening!</p>
              </div>
            )}
          </Section>

          <Section
            title="Trending Now"
            subtitle="What's hot on YouTube Music"
            action={
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage('search')}>
                View All
              </Button>
            }
          >
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-white/10 rounded-lg mb-3" />
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))
            ) : trendingTracks.length > 0 ? (
              trendingTracks.slice(0, 10).map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onPlay={() => handlePlayTrack(track)}
                  onAddToQueue={() => handleAddToQueue(track)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-white/50">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <p>No trending tracks available</p>
              </div>
            )}
          </Section>

          <Section
            title="Made for You"
            subtitle="Playlists and mixes based on your taste"
            action={
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage('search')}>
                View All
              </Button>
            }
          >
            <QuickActionCard
              icon={Music}
              title="Your Mix"
              description="A endless mix of your favorites"
              onClick={() => handleShufflePlay([...library.likedTracks, ...recentTracks].slice(0, 50))}
              gradient="#ff6b35, #ff1493"
            />
            <QuickActionCard
              icon={Heart}
              title="Liked Songs Radio"
              description="Based on your liked tracks"
              onClick={() => handleShufflePlay(library.likedTracks)}
              gradient="#ec4899, #f97316"
            />
            <QuickActionCard
              icon={Zap}
              title="Discovery Mix"
              description="New music you might like"
              onClick={() => setCurrentPage('search')}
              gradient="#00d4aa, #0099ff"
            />
            <QuickActionCard
              icon={Clock}
              title="Throwback Mix"
              description="Your old favorites"
              onClick={() => handleShufflePlay(recentTracks.slice(0, 30))}
              gradient="#7c3aed, #a855f7"
            />
          </Section>
        </div>
      </div>
    </div>
  )
}