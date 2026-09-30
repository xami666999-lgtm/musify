import type { Track } from '../types'

type AudioNodeState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

interface AudioNode {
  source: AudioBufferSourceNode | MediaElementAudioSourceNode | null
  gainNode: GainNode
  analyser: AnalyserNode
  state: AudioNodeState
  track: Track | null
  startTime: number
  pauseTime: number
  duration: number
}

type PlaybackStateListener = (state: PlaybackState) => void
type TimeUpdateListener = (currentTime: number, duration: number) => void
type TrackEndListener = (track: Track, completed: boolean) => void
type SilenceDetectListener = (track: Track, silenceStartTime: number) => void

interface PlaybackState {
  currentTrack: Track | null
  queue: Track[]
  queueIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  repeatMode: 'off' | 'one' | 'all'
  shuffle: boolean
  crossfadeEnabled: boolean
  crossfadeDuration: number
}

const DEFAULT_CROSSFADE_DURATION = 5
const SILENCE_THRESHOLD = 0.001
const SILENCE_DURATION_MS = 500
const ANALYSER_FFT_SIZE = 2048

export class AudioEngine {
  private static instance: AudioEngine
  private audioContext: AudioContext | null = null
  private primaryNode: AudioNode
  private secondaryNode: AudioNode
  private activeNode: AudioNode
  private nextNode: AudioNode
  
  private masterGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  
  private state: PlaybackState = {
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    repeatMode: 'off',
    shuffle: false,
    crossfadeEnabled: true,
    crossfadeDuration: DEFAULT_CROSSFADE_DURATION,
  }

  private playbackStateListeners = new Set<PlaybackStateListener>()
  private timeUpdateListeners = new Set<TimeUpdateListener>()
  private trackEndListeners = new Set<TrackEndListener>()
  private silenceDetectListeners = new Set<SilenceDetectListener>()

  private animationFrameId: number | null = null
  private silenceCheckInterval: number | null = null
  private crossfadeTimeout: number | null = null

  private constructor() {
    this.primaryNode = this.createAudioNode()
    this.secondaryNode = this.createAudioNode()
    this.activeNode = this.primaryNode
    this.nextNode = this.secondaryNode
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine()
    }
    return AudioEngine.instance
  }

  private createAudioNode(): AudioNode {
    return {
      source: null,
      gainNode: null!,
      analyser: null!,
      state: 'idle',
      track: null,
      startTime: 0,
      pauseTime: 0,
      duration: 0,
    }
  }

  async initialize(): Promise<void> {
    if (this.audioContext) return

    this.audioContext = new AudioContext({
      latencyHint: 'playback',
      sampleRate: 44100,
    })

    this.masterGain = this.audioContext.createGain()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = ANALYSER_FFT_SIZE
    this.analyser.smoothingTimeConstant = 0.8

    this.primaryNode.gainNode = this.audioContext.createGain()
    this.primaryNode.analyser = this.audioContext.createAnalyser()
    this.primaryNode.analyser.fftSize = ANALYSER_FFT_SIZE

    this.secondaryNode.gainNode = this.audioContext.createGain()
    this.secondaryNode.analyser = this.audioContext.createAnalyser()
    this.secondaryNode.analyser.fftSize = ANALYSER_FFT_SIZE

    this.primaryNode.gainNode.connect(this.masterGain)
    this.secondaryNode.gainNode.connect(this.masterGain)
    this.masterGain.connect(this.analyser)
    this.masterGain.connect(this.audioContext.destination)

    this.masterGain.gain.value = this.state.volume

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  async playTrack(track: Track, streamUrl: string): Promise<boolean> {
    await this.initialize()

    if (this.activeNode.state === 'playing' && this.activeNode.track?.id === track.id) {
      return this.resume()
    }

    this.stopSilenceDetection()
    
    if (this.activeNode.state === 'playing') {
      this.prepareCrossfade(track, streamUrl)
      return true
    }

    return this.loadAndPlay(this.activeNode, track, streamUrl)
  }

  private async loadAndPlay(node: AudioNode, track: Track, streamUrl: string): Promise<boolean> {
    try {
      node.state = 'loading'
      node.track = track
      node.duration = track.duration

      const audioElement = new Audio()
      audioElement.crossOrigin = 'anonymous'
      audioElement.preload = 'metadata'
      audioElement.src = streamUrl

      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audioElement.removeEventListener('canplay', onCanPlay)
          audioElement.removeEventListener('error', onError)
          resolve()
        }
        const onError = () => {
          audioElement.removeEventListener('canplay', onCanPlay)
          audioElement.removeEventListener('error', onError)
          reject(new Error('Failed to load audio'))
        }
        audioElement.addEventListener('canplay', onCanPlay)
        audioElement.addEventListener('error', onError)
      })

      if (node.source) {
        node.source.disconnect()
      }

      node.source = this.audioContext!.createMediaElementSource(audioElement)
      node.source.connect(node.gainNode)

      audioElement.addEventListener('ended', () => this.onTrackEnded(node, true))
      audioElement.addEventListener('error', () => this.onTrackError(node))

      node.startTime = this.audioContext!.currentTime
      node.pauseTime = 0
      node.state = 'playing'

      audioElement.play().catch(err => {
        console.error('Play failed:', err)
        node.state = 'error'
        this.emitStateChange()
      })

      this.state.currentTrack = track
      this.state.isPlaying = true
      this.state.duration = track.duration
      this.state.currentTime = 0

      this.startTimeUpdates()
      this.startSilenceDetection(node)

      this.emitStateChange()
      return true
    } catch (error) {
      console.error('Load and play error:', error)
      node.state = 'error'
      this.emitStateChange()
      return false
    }
  }

  private prepareCrossfade(nextTrack: Track, streamUrl: string): void {
    if (!this.state.crossfadeEnabled) {
      this.stopCurrentTrack()
      this.loadAndPlay(this.activeNode, nextTrack, streamUrl)
      return
    }

    const crossfadeDuration = this.state.crossfadeDuration
    
    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout)
    }

    this.crossfadeTimeout = window.setTimeout(() => {
      this.startCrossfade(nextTrack, streamUrl, crossfadeDuration)
    }, Math.max(0, this.activeNode.track!.duration - this.state.currentTime - crossfadeDuration) * 1000)
  }

  private async startCrossfade(nextTrack: Track, streamUrl: string, duration: number): Promise<void> {
    const next = this.nextNode
    await this.loadAndPlay(next, nextTrack, streamUrl)

    const steps = 20
    const stepTime = (duration * 1000) / steps
    const startGain = this.activeNode.gainNode.gain.value
    const targetGain = next.gainNode.gain.value

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      const easedProgress = this.easeOutCubic(progress)
      
      this.activeNode.gainNode.gain.setValueAtTime(
        startGain * (1 - easedProgress),
        this.audioContext!.currentTime
      )
      next.gainNode.gain.setValueAtTime(
        targetGain * easedProgress,
        this.audioContext!.currentTime
      )
      
      await new Promise(resolve => setTimeout(resolve, stepTime))
    }

    this.stopNode(this.activeNode)
    this.swapNodes()
    this.crossfadeTimeout = null
  }

  private swapNodes(): void {
    const temp = this.activeNode
    this.activeNode = this.nextNode
    this.nextNode = temp
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  private stopCurrentTrack(): void {
    this.stopNode(this.activeNode)
    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout)
      this.crossfadeTimeout = null
    }
  }

  private stopNode(node: AudioNode): void {
    if (node.source) {
      const audioElement = (node.source as MediaElementAudioSourceNode).mediaElement
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }
      node.source.disconnect()
      node.source = null
    }
    node.state = 'idle'
    node.track = null
    node.startTime = 0
    node.pauseTime = 0
    node.duration = 0
    node.gainNode.gain.value = 1
  }

  private onTrackEnded(node: AudioNode, completed: boolean): void {
    if (node !== this.activeNode) return

    this.stopSilenceDetection()
    node.state = 'ended'

    const track = node.track!
    this.emitTrackEnd(track, completed)

    if (this.state.repeatMode === 'one') {
      this.replayCurrentTrack()
    } else if (this.state.queueIndex < this.state.queue.length - 1) {
      this.playNext()
    } else if (this.state.repeatMode === 'all' && this.state.queue.length > 0) {
      this.state.queueIndex = 0
      this.playTrackAtIndex(0)
    } else {
      this.state.isPlaying = false
      this.state.currentTrack = null
      this.emitStateChange()
    }
  }

  private onTrackError(node: AudioNode): void {
    node.state = 'error'
    this.emitStateChange()
  }

  async playNext(): Promise<void> {
    if (this.state.queueIndex < this.state.queue.length - 1) {
      this.state.queueIndex++
      await this.playTrackAtIndex(this.state.queueIndex)
    }
  }

  async playPrevious(): Promise<void> {
    if (this.state.queueIndex > 0) {
      this.state.queueIndex--
      await this.playTrackAtIndex(this.state.queueIndex)
    } else if (this.state.currentTrack) {
      await this.seek(0)
    }
  }

  async playTrackAtIndex(index: number): Promise<void> {
    if (index < 0 || index >= this.state.queue.length) return
    
    this.state.queueIndex = index
    const track = this.state.queue[index]
    
    let streamUrl: string
    
    if (track.sourceType === 'local' || track.sourceType === 'cached') {
      // For local/cached tracks, use the cached path or source URL directly
      streamUrl = track.cachedPath || track.sourceUrl!
    } else if (track.sourceType === 'youtube-music' && track.videoId) {
      // Use YouTube Music API to get stream URL
      const stream = await window.electronAPI.ytmusic.getStream(track.videoId)
      if (!stream.success || !stream.data) {
        console.error('YTMusic stream resolution failed:', stream.error)
        return
      }
      streamUrl = stream.data.streamUrl
    } else if (track.sourceType === 'piped' && track.videoId) {
      // Fallback for Piped instances
      const stream = await window.electronAPI.ytmusic.getStream(track.videoId)
      if (!stream.success || !stream.data) {
        console.error('Stream resolution failed:', stream.error)
        return
      }
      streamUrl = stream.data.streamUrl
    } else {
      console.error('Unsupported source type:', track.sourceType)
      return
    }
    
    await this.playTrack(track, streamUrl)
  }

  async replayCurrentTrack(): Promise<void> {
    if (!this.state.currentTrack) return
    await this.seek(0)
    this.resume()
  }

  async pause(): Promise<void> {
    if (this.activeNode.state === 'playing' && this.activeNode.source) {
      const audioElement = (this.activeNode.source as MediaElementAudioSourceNode).mediaElement
      audioElement.pause()
      this.activeNode.pauseTime = this.state.currentTime
      this.activeNode.state = 'paused'
      this.state.isPlaying = false
      this.stopTimeUpdates()
      this.stopSilenceDetection()
      this.emitStateChange()
    }
  }

  async resume(): Promise<boolean> {
    if (this.activeNode.state === 'paused' && this.activeNode.source) {
      const audioElement = (this.activeNode.source as MediaElementAudioSourceNode).mediaElement
      try {
        await audioElement.play()
        this.activeNode.startTime = this.audioContext!.currentTime - this.activeNode.pauseTime
        this.activeNode.state = 'playing'
        this.state.isPlaying = true
        this.startTimeUpdates()
        this.startSilenceDetection(this.activeNode)
        this.emitStateChange()
        return true
      } catch (error) {
        console.error('Resume failed:', error)
        return false
      }
    }
    return false
  }

  async togglePlayPause(): Promise<void> {
    if (this.state.isPlaying) {
      await this.pause()
    } else if (this.state.currentTrack) {
      await this.resume()
    }
  }

  async seek(time: number): Promise<void> {
    if (this.activeNode.source) {
      const audioElement = (this.activeNode.source as MediaElementAudioSourceNode).mediaElement
      audioElement.currentTime = Math.max(0, Math.min(time, this.state.duration))
      this.activeNode.startTime = this.audioContext!.currentTime - audioElement.currentTime
      this.activeNode.pauseTime = audioElement.currentTime
      this.state.currentTime = audioElement.currentTime
      this.emitTimeUpdate()
    }
  }

  async setVolume(volume: number): Promise<void> {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.state.volume = clampedVolume
    this.state.isMuted = clampedVolume === 0
    if (this.masterGain) {
      this.masterGain.gain.value = clampedVolume
    }
    this.emitStateChange()
  }

  async toggleMute(): Promise<void> {
    if (this.state.isMuted) {
      await this.setVolume(this.state.volume || 1)
    } else {
      await this.setVolume(0)
    }
  }

  setRepeatMode(mode: 'off' | 'one' | 'all'): void {
    this.state.repeatMode = mode
    this.emitStateChange()
  }

  setShuffle(enabled: boolean): void {
    this.state.shuffle = enabled
    this.emitStateChange()
  }

  setCrossfade(enabled: boolean, duration?: number): void {
    this.state.crossfadeEnabled = enabled
    if (duration !== undefined) {
      this.state.crossfadeDuration = Math.max(0, Math.min(30, duration))
    }
    this.emitStateChange()
  }

  setQueue(tracks: Track[], startIndex = 0): void {
    this.state.queue = tracks
    this.state.queueIndex = startIndex
    this.emitStateChange()
  }

  addToQueue(track: Track, index?: number): void {
    if (index !== undefined) {
      this.state.queue.splice(index, 0, track)
    } else {
      this.state.queue.push(track)
    }
    this.emitStateChange()
  }

  removeFromQueue(index: number): void {
    if (index === this.state.queueIndex) {
      this.stopCurrentTrack()
      this.state.queue.splice(index, 1)
      if (this.state.queue.length > 0) {
        this.state.queueIndex = Math.min(index, this.state.queue.length - 1)
        this.playTrackAtIndex(this.state.queueIndex)
      } else {
        this.state.queueIndex = -1
        this.state.currentTrack = null
        this.state.isPlaying = false
      }
    } else {
      this.state.queue.splice(index, 1)
      if (index < this.state.queueIndex) {
        this.state.queueIndex--
      }
    }
    this.emitStateChange()
  }

  reorderQueue(fromIndex: number, toIndex: number): void {
    const [track] = this.state.queue.splice(fromIndex, 1)
    this.state.queue.splice(toIndex, 0, track)
    
    if (fromIndex === this.state.queueIndex) {
      this.state.queueIndex = toIndex
    } else if (fromIndex < this.state.queueIndex && toIndex >= this.state.queueIndex) {
      this.state.queueIndex--
    } else if (fromIndex > this.state.queueIndex && toIndex <= this.state.queueIndex) {
      this.state.queueIndex++
    }
    this.emitStateChange()
  }

  clearQueue(): void {
    this.stopCurrentTrack()
    this.state.queue = []
    this.state.queueIndex = -1
    this.state.currentTrack = null
    this.state.isPlaying = false
    this.emitStateChange()
  }

  getState(): PlaybackState {
    return { ...this.state }
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  getAnalyserData(): Uint8Array | null {
    if (!this.analyser) return null
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  getWaveformData(): Uint8Array | null {
    if (!this.analyser) return null
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(data)
    return data
  }

  onPlaybackStateChange(listener: PlaybackStateListener): () => void {
    this.playbackStateListeners.add(listener)
    return () => this.playbackStateListeners.delete(listener)
  }

  onTimeUpdate(listener: TimeUpdateListener): () => void {
    this.timeUpdateListeners.add(listener)
    return () => this.timeUpdateListeners.delete(listener)
  }

  onTrackEnd(listener: TrackEndListener): () => void {
    this.trackEndListeners.add(listener)
    return () => this.trackEndListeners.delete(listener)
  }

  onSilenceDetected(listener: SilenceDetectListener): () => void {
    this.silenceDetectListeners.add(listener)
    return () => this.silenceDetectListeners.delete(listener)
  }

  private emitStateChange(): void {
    const state = this.getState()
    window.electronAPI.updateMediaSession(state.currentTrack ? { ...state.currentTrack, isPlaying: state.isPlaying } : null)
    for (const listener of this.playbackStateListeners) {
      listener(state)
    }
  }

  private emitTimeUpdate(): void {
    for (const listener of this.timeUpdateListeners) {
      listener(this.state.currentTime, this.state.duration)
    }
  }

  private emitTrackEnd(track: Track, completed: boolean): void {
    for (const listener of this.trackEndListeners) {
      listener(track, completed)
    }
  }

  private emitSilenceDetected(track: Track, silenceStartTime: number): void {
    for (const listener of this.silenceDetectListeners) {
      listener(track, silenceStartTime)
    }
  }

  private startTimeUpdates(): void {
    this.stopTimeUpdates()
    const update = () => {
      if (this.activeNode.state === 'playing' && this.activeNode.source) {
        const audioElement = (this.activeNode.source as MediaElementAudioSourceNode).mediaElement
        this.state.currentTime = audioElement.currentTime
        this.emitTimeUpdate()
      }
      this.animationFrameId = requestAnimationFrame(update)
    }
    this.animationFrameId = requestAnimationFrame(update)
  }

  private stopTimeUpdates(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private startSilenceDetection(node: AudioNode): void {
    this.stopSilenceDetection()
    const analyser = node.analyser
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let silenceStartTime = -1

    const checkSilence = () => {
      if (node.state !== 'playing' || !node.source) {
        this.silenceCheckInterval = null
        return
      }

      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      const normalized = average / 255

      if (normalized < SILENCE_THRESHOLD) {
        if (silenceStartTime === -1) {
          silenceStartTime = this.audioContext!.currentTime
        } else if (this.audioContext!.currentTime - silenceStartTime >= SILENCE_DURATION_MS / 1000) {
          this.emitSilenceDetected(node.track!, silenceStartTime)
          silenceStartTime = -1
        }
      } else {
        silenceStartTime = -1
      }

      this.silenceCheckInterval = window.setTimeout(checkSilence, 100)
    }

    this.silenceCheckInterval = window.setTimeout(checkSilence, 100)
  }

  private stopSilenceDetection(): void {
    if (this.silenceCheckInterval !== null) {
      clearTimeout(this.silenceCheckInterval)
      this.silenceCheckInterval = null
    }
  }

  async destroy(): Promise<void> {
    this.stopTimeUpdates()
    this.stopSilenceDetection()
    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout)
    }
    this.stopNode(this.primaryNode)
    this.stopNode(this.secondaryNode)
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }
  }
}

export const audioEngine = AudioEngine.getInstance()