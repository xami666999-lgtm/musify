import * as React from 'react'
import { motion } from 'framer-motion'
import { Heart, Music, ListMusic, Album, User, Play, Shuffle, Plus, Filter, X, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import { audioEngine } from '../services/audioEngine'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ScrollArea } from '../components/ui/ScrollArea'
import { Card, CardContent } from '../components/ui/Card'
import { cn } from '../components/ui/Button'
import { formatTime } from '../lib/utils'

interface LibrarySectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  count: number
  onClick: () => void
  gradient: string
}

function LibrarySection({ title, icon: Icon, count, onClick, gradient }: LibrarySectionProps) {
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
        <Badge variant="default" size="sm">{count}</Badge>
      </div>
      <div>
        <h3 className="font-semibold text-white text-lg">{title}</h3>
        <p className="text-white/70 text-sm mt-1">{count} {title.toLowerCase()}</p>
      </div>
    </motion.button>
  )
}

function TrackRow({ track, index, onPlay, onAddToQueue, isPlaying }: { track: any; index: number; onPlay: () => void; onAddToQueue: () => void; isPlaying: boolean }) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'group hover:bg-white/5 transition-colors cursor-pointer',
        isPlaying && 'bg-white/5'
      )}
      onClick={onPlay}
    >
      <td className="px-4 py-3 w-12 text-white/50 group-hover:text-white">
        {isPlaying ? (
          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} className="text-pink-400">
            <Music className="w-5 h-5" />
          </motion.span>
        ) : (
          <span className="font-medium">{index + 1}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {track.albumArtUrl ? (
            <img src={track.albumArtUrl} alt="" className="w-10 h-10 rounded object-cover" />
          ) : (
            <div className="w-10 h-10 rounded bg-gradient-to-br from-pink-500/30 to-cyan-500/30 flex items-center justify-center">
              <Music className="w-5 h-5 text-white/50" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-white truncate line-clamp-1">{track.title}</p>
            <p className="text-sm text-white/50 truncate line-clamp-1">{track.artist}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-white/50">
        {track.album}
      </td>
      <td className="px-4 py-3 text-white/40 w-20 text-right">
        {track.duration ? formatTime(track.duration) : ''}
      </td>
      <td className="px-4 py-3 w-12">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="icon" size="icon" onClick={(e) => { e.stopPropagation(); onAddToQueue() }} className="text-white/40 hover:text-white" aria-label="Add to queue">
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="icon" size="icon" onClick={(e) => { e.stopPropagation(); onPlay() }} className={isPlaying ? 'text-pink-400' : 'text-white/40 hover:text-white'} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <div className="w-4 h-4 flex gap-1"><div className="w-1 h-4 bg-current rounded animate-pulse" /><div className="w-1 h-4 bg-current rounded animate-pulse" style={{animationDelay: '0.2s'}} /><div className="w-1 h-4 bg-current rounded animate-pulse" style={{animationDelay: '0.4s'}} /></div> : <Play className="w-4 h-4 ml-0.5" />}
          </Button>
        </div>
      </td>
    </motion.tr>
  )
}

function TrackList({ tracks, title, emptyMessage, onPlayTrack, onAddToQueue, currentTrack, isPlaying }: { tracks: any[]; title: string; emptyMessage: string; onPlayTrack: (track: any) => void; onAddToQueue: (track: any) => void; currentTrack: any; isPlaying: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="font-display font-bold text-xl gradient-text">{title}</h2>
      {tracks.length > 0 ? (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 hidden md:table-cell">Album</th>
                  <th className="px-4 py-3 w-20 text-right">Duration</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    onPlay={() => onPlayTrack(track)}
                    onAddToQueue={() => onAddToQueue(track)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-white/50">
          <Music className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <p>{emptyMessage}</p>
        </div>
      )}
    </motion.div>
  )
}

export default function Library() {
  const {
    library,
    playbackState,
    toggleLikeTrack,
  } = useStore()

  const { currentTrack, isPlaying, queue } = playbackState

  const handlePlayTrack = (track: any) => {
    audioEngine.playTrack(track, '')
  }

  const handleAddToQueue = (track: any) => {
    audioEngine.addToQueue(track)
  }

  const handleShufflePlay = (tracks: any[]) => {
    if (tracks.length === 0) return
    const shuffled = [...tracks].sort(() => Math.random() - 0.5)
    audioEngine.setQueue(shuffled)
    audioEngine.setShuffle(true)
    audioEngine.playTrackAtIndex(0)
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-3xl gradient-text">Library</h1>
          <Button variant="secondary" onClick={() => handleShufflePlay(library.likedTracks)}>
            <Shuffle className="w-4 h-4 mr-2" />
            Shuffle All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <LibrarySection
            title="Liked Songs"
            icon={Heart}
            count={library.likedTracks.length}
            onClick={() => {}}
            gradient="#ff1493, #ff6b35"
          />
          <LibrarySection
            title="Playlists"
            icon={ListMusic}
            count={library.playlists.length}
            onClick={() => {}}
            gradient="#00d4aa, #0099ff"
          />
          <LibrarySection
            title="Artists"
            icon={User}
            count={library.artists.length}
            onClick={() => {}}
            gradient="#7c3aed, #a855f7"
          />
          <LibrarySection
            title="Albums"
            icon={Album}
            count={library.albums.length}
            onClick={() => {}}
            gradient="#ec4899, #f97316"
          />
        </div>

        <TrackList
          tracks={library.likedTracks}
          title="Liked Songs"
          emptyMessage="No liked songs yet. Click the heart icon on any track to add it here."
          onPlayTrack={handlePlayTrack}
          onAddToQueue={handleAddToQueue}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
        />

        <TrackList
          tracks={queue}
          title="Queue"
          emptyMessage="Queue is empty. Add tracks from search or your library."
          onPlayTrack={handlePlayTrack}
          onAddToQueue={handleAddToQueue}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
        />
      </div>
    </div>
  )
}