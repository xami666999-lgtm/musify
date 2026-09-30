import * as React from 'react'
import { motion } from 'framer-motion'
import { Music, Volume2, Zap, Shield, Palette, Download, Globe, Database, Bell, Trash2, Key, Cpu, Monitor, Headphones, Settings as SettingsIcon, Save, Archive, Cloud, Moon, Sun, MonitorSmartphone, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Switch } from '../components/ui/Switch'
import { Select } from '../components/ui/Select'
import { Slider } from '../components/ui/Slider'
import { Separator } from '../components/ui/Separator'
import { ScrollArea } from '../components/ui/ScrollArea'
import { Badge } from '../components/ui/Badge'
import { cn } from '../components/ui/Button'

interface SettingSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  description?: string
}

function SettingSection({ title, icon: Icon, children, description }: SettingSectionProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/30 to-cyan-500/30 flex items-center justify-center">
          <Icon className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          {description && <p className="text-sm text-white/50">{description}</p>}
        </div>
      </div>
      <div className="ml-10 border-l border-white/10 pl-4 space-y-4">
        {children}
      </div>
    </motion.div>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <p className="font-medium text-white">{label}</p>
        {description && <p className="text-sm text-white/50">{description}</p>}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  )
}

function SettingSwitch({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <SettingRow label={label} description={description}>
      <Switch checked={checked} onCheckedChange={onChange} />
    </SettingRow>
  )
}

function SettingSelect({ label, description, value, onChange, options }: { label: string; description?: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <SettingRow label={label} description={description}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        placeholder="Select..."
      />
    </SettingRow>
  )
}

function SettingSlider({ label, description, value, onChange, min, max, step, unit }: { label: string; description?: string; value: number; onChange: (value: number) => void; min: number; max: number; step: number; unit?: string }) {
  return (
    <SettingRow label={label} description={description}>
      <div className="flex items-center gap-4 w-64">
        <Slider value={value} onValueChange={onChange} min={min} max={max} step={step} className="flex-1" />
        <span className="text-white/50 text-sm w-10 text-right">{value}{unit || ''}</span>
      </div>
    </SettingRow>
  )
}

export default function Settings() {
  const { settings, setSettings, theme, setTheme } = useStore()

  const handleYTMusicCookies = async () => {
    const path = await window.electronAPI.selectFile({ filters: [{ name: 'Cookies', extensions: ['txt', 'json'] }] })
    if (path) {
      await window.electronAPI.ytmusic.setCookies(path)
      setSettings({ youtubeMusic: { ...settings.youtubeMusic, cookiesPath: path } })
    }
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="font-display font-bold text-3xl gradient-text">Settings</h1>

        <SettingSection title="Appearance" icon={Palette} description="Customize how Musify looks">
          <SettingSelect
            label="Theme"
            description="Choose your preferred color theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'oled', label: 'OLED' },
            ]}
          />
          <SettingSelect
            label="Accent Color"
            description="Primary accent color for the UI"
            value={settings.appearance.accentColor}
            onChange={(value) => setSettings({ appearance: { ...settings.appearance, accentColor: value } })}
            options={[
              { value: '#ff6b35', label: 'Orange' },
              { value: '#ff1493', label: 'Pink' },
              { value: '#00d4aa', label: 'Teal' },
              { value: '#7c3aed', label: 'Purple' },
              { value: '#ec4899', label: 'Rose' },
              { value: '#f97316', label: 'Orange Red' },
            ]}
          />
          <SettingSwitch
            label="Compact Mode"
            description="Reduce spacing for more content"
            checked={settings.appearance.compactMode}
            onChange={(checked) => setSettings({ appearance: { ...settings.appearance, compactMode: checked } })}
          />
          <SettingSwitch
            label="Show Visualizer"
            description="Display audio visualizer during playback"
            checked={settings.appearance.showVisualizer}
            onChange={(checked) => setSettings({ appearance: { ...settings.appearance, showVisualizer: checked } })}
          />
          <SettingSwitch
            label="Reduce Motion"
            description="Minimize animations for accessibility"
            checked={settings.appearance.reduceMotion}
            onChange={(checked) => setSettings({ appearance: { ...settings.appearance, reduceMotion: checked } })}
          />
        </SettingSection>

        <SettingSection title="Playback" icon={Music} description="Audio playback settings">
          <SettingSelect
            label="Audio Quality"
            description="Streaming quality for YouTube Music"
            value={settings.playback.quality}
            onChange={(value) => {
              setSettings({ playback: { ...settings.playback, quality: value as any } })
              youtubeMusicService.setQuality(value as any)
            }}
            options={[
              { value: 'high', label: 'High (256kbps AAC)' },
              { value: 'medium', label: 'Medium (128kbps AAC)' },
              { value: 'low', label: 'Low (96kbps AAC)' },
            ]}
          />
          <SettingSwitch
            label="Crossfade"
            description="Smooth transitions between tracks"
            checked={settings.general.crossfadeEnabled}
            onChange={(checked) => setSettings({ general: { ...settings.general, crossfadeEnabled: checked } })}
          />
          <SettingSlider
            label="Crossfade Duration"
            description="Length of crossfade in seconds"
            value={settings.general.crossfadeDuration}
            onChange={(value) => setSettings({ general: { ...settings.general, crossfadeDuration: value } })}
            min={1}
            max={15}
            step={1}
            unit="s"
          />
          <SettingSwitch
            label="Gapless Playback"
            description="Play tracks without gaps between them"
            checked={settings.playback.gaplessPlayback}
            onChange={(checked) => setSettings({ playback: { ...settings.playback, gaplessPlayback: checked } })}
          />
          <SettingSwitch
            label="Volume Normalization"
            description="Normalize volume across tracks"
            checked={settings.playback.normalization}
            onChange={(checked) => setSettings({ playback: { ...settings.playback, normalization: checked } })}
          />
          <SettingSwitch
            label="Auto-play Next"
            description="Automatically play the next track"
            checked={settings.general.autoPlayNext}
            onChange={(checked) => setSettings({ general: { ...settings.general, autoPlayNext: checked } })}
          />
          <SettingSwitch
            label="Auto-play Related"
            description="Play related music when queue ends"
            checked={settings.general.autoPlayRelated}
            onChange={(checked) => setSettings({ general: { ...settings.general, autoPlayRelated: checked } })}
          />
        </SettingSection>

        <SettingSection title="YouTube Music" icon={Music} description="YouTube Music integration settings">
          <div className="space-y-4">
            <SettingRow
              label="Cookies File"
              description="Optional: Export cookies from browser for authenticated access"
            >
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleYTMusicCookies}>
                  <Key className="w-4 h-4 mr-2" />
                  Select cookies.txt
                </Button>
                {settings.youtubeMusic.cookiesPath && (
                  <Badge variant="default" size="sm">Loaded</Badge>
                )}
              </div>
            </SettingRow>
            <SettingSelect
              label="Region"
              description="Content region for YouTube Music"
              value={settings.youtubeMusic.region}
              onChange={(value) => setSettings({ youtubeMusic: { ...settings.youtubeMusic, region: value } })}
              options={[
                { value: 'US', label: 'United States' },
                { value: 'GB', label: 'United Kingdom' },
                { value: 'CA', label: 'Canada' },
                { value: 'AU', label: 'Australia' },
                { value: 'DE', label: 'Germany' },
                { value: 'FR', label: 'France' },
                { value: 'JP', label: 'Japan' },
                { value: 'KR', label: 'Korea' },
              ]}
            />
          </div>
        </SettingSection>

        <SettingSection title="Privacy & Security" icon={Shield} description="Control your data and privacy">
          <SettingSwitch
            label="Block Tracking"
            description="Block analytics and tracking requests"
            checked={settings.privacy.blockTracking}
            onChange={(checked) => setSettings({ privacy: { ...settings.privacy, blockTracking: checked } })}
          />
          <SettingSwitch
            label="Analytics"
            description="Send anonymous usage statistics"
            checked={settings.privacy.analytics}
            onChange={(checked) => setSettings({ privacy: { ...settings.privacy, analytics: checked } })}
          />
          <SettingSwitch
            label="Crash Reporting"
            description="Automatically send crash reports"
            checked={settings.privacy.crashReporting}
            onChange={(checked) => setSettings({ privacy: { ...settings.privacy, crashReporting: checked } })}
          />
          <SettingSwitch
            label="Clear History on Exit"
            description="Clear play history when closing the app"
            checked={settings.privacy.clearHistoryOnExit}
            onChange={(checked) => setSettings({ privacy: { ...settings.privacy, clearHistoryOnExit: checked } })}
          />
        </SettingSection>

        <SettingSection title="Network" icon={Globe} description="Network and connection settings">
          <SettingSwitch
            label="DNS over HTTPS"
            description="Encrypt DNS queries for privacy"
            checked={settings.network.dnsOverHttps}
            onChange={(checked) => setSettings({ network: { ...settings.network, dnsOverHttps: checked } })}
          />
          <SettingSwitch
            label="Offline Mode"
            description="Work offline with cached content"
            checked={settings.network.offlineMode}
            onChange={(checked) => setSettings({ network: { ...settings.network, offlineMode: checked } })}
          />
        </SettingSection>

        <SettingSection title="Library" icon={Database} description="Manage your music library">
          <SettingSwitch
            label="Auto-add Liked Songs"
            description="Automatically add liked songs to library"
            checked={settings.library.autoAddLiked}
            onChange={(checked) => setSettings({ library: { ...settings.library, autoAddLiked: checked } })}
          />
          <SettingSwitch
            label="Show Local Files"
            description="Display local music files in library"
            checked={settings.library.showLocalFiles}
            onChange={(checked) => setSettings({ library: { ...settings.library, showLocalFiles: checked } })}
          />
          <SettingSwitch
            label="Organize Imports"
            description="Automatically organize imported music"
            checked={settings.library.organizeImports}
            onChange={(checked) => setSettings({ library: { ...settings.library, organizeImports: checked } })}
          />
        </SettingSection>

        <SettingSection title="About" icon={SettingsIcon} description="Application information">
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-white">Version</p>
                <p className="text-sm text-white/50">1.0.0</p>
              </div>
              <Badge variant="default" size="sm">Stable</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-white">Electron</p>
                <p className="text-sm text-white/50">{window.electronAPI?.getAppVersion ? '35.x' : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-white">Platform</p>
                <p className="text-sm text-white/50">{window.electronAPI?.getPlatform ? 'win32' : 'N/A'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => window.electronAPI.openExternal('https://github.com/xami666999-lgtm/musify')}>
              <ChevronRight className="w-4 h-4 mr-2" />
              View on GitHub
            </Button>
          </div>
        </SettingSection>
      </div>
    </div>
  )
}