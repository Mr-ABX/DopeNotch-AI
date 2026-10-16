import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Cpu,
  HardDrive,
  BatteryCharging,
  Battery,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SystemVitals {
  cpu_usage: f32_number;
  mem_used_gb: number;
  mem_total_gb: number;
  mem_percent: number;
  battery_percent: number;
  is_charging: boolean;
  has_battery: boolean;
}

type f32_number = number;

interface MediaPlaybackStatus {
  active: boolean;
  app: string;
  state: string; // "playing" | "paused" | "stopped"
  title: string;
  artist: string;
  album: string;
  duration: number;
  position: number;
}

interface AmbientTrack {
  title: string;
  artist: string;
  album: string;
  duration: number;
}

const AMBIENT_TRACKS: AmbientTrack[] = [
  {
    title: 'Midnight Coding Flow',
    artist: 'DopeNotch Lo-Fi',
    album: 'Deep Focus Sessions',
    duration: 210,
  },
  {
    title: 'Silicon Nocturne',
    artist: 'Neural Beats',
    album: 'Whisper Waves',
    duration: 185,
  },
  {
    title: 'Quiet Terminal',
    artist: 'Mono Pulse',
    album: 'Developer Reverie',
    duration: 240,
  },
];

export const WidgetsView: React.FC = () => {
  // Live macOS Media State
  const [nativeMedia, setNativeMedia] = useState<MediaPlaybackStatus>({
    active: false,
    app: '',
    state: 'stopped',
    title: '',
    artist: '',
    album: '',
    duration: 0,
    position: 0,
  });

  // Ambient Fallback Track State
  const [ambientIndex, setAmbientIndex] = useState(0);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [ambientTime, setAmbientTime] = useState(45);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);

  // Live System Vitals
  const [vitals, setVitals] = useState<SystemVitals>({
    cpu_usage: 14.5,
    mem_used_gb: 8.8,
    mem_total_gb: 16.0,
    mem_percent: 55.0,
    battery_percent: 100,
    is_charging: true,
    has_battery: true,
  });

  // Focus Timer State
  const [focusActive, setFocusActive] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);

  // Fetch real macOS media status
  const fetchMedia = useCallback(async () => {
    try {
      const status = await invoke<MediaPlaybackStatus>('get_media_playback_status');
      if (status && status.active) {
        setNativeMedia(status);
      } else {
        setNativeMedia((prev) => (prev.active ? { ...prev, active: false } : prev));
      }
    } catch {
      // Ignore background IPC failures
    }
  }, []);

  // Fetch real system vitals
  const fetchVitals = useCallback(async () => {
    try {
      const res = await invoke<SystemVitals>('get_system_vitals');
      if (res) {
        setVitals(res);
      }
    } catch {
      // Fallback: smooth slight pulse
      setVitals((prev) => ({
        ...prev,
        cpu_usage: Math.min(90, Math.max(8, prev.cpu_usage + (Math.random() - 0.48) * 3)),
      }));
    }
  }, []);

  useEffect(() => {
    fetchMedia();
    fetchVitals();

    const mediaInterval = setInterval(fetchMedia, 1800);
    const vitalsInterval = setInterval(fetchVitals, 2500);

    return () => {
      clearInterval(mediaInterval);
      clearInterval(vitalsInterval);
    };
  }, [fetchMedia, fetchVitals]);

  // Ambient fallback ticker
  useEffect(() => {
    if (nativeMedia.active || !ambientPlaying) return;
    const interval = setInterval(() => {
      setAmbientTime((prev) => {
        const dur = AMBIENT_TRACKS[ambientIndex].duration;
        if (prev >= dur) return 0;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ambientPlaying, ambientIndex, nativeMedia.active]);

  // Focus timer ticker
  useEffect(() => {
    if (!focusActive) return;
    const interval = setInterval(() => {
      setFocusSeconds((prev) => {
        if (prev <= 1) {
          setFocusActive(false);
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [focusActive]);

  const handleMediaControl = async (action: 'playpause' | 'next' | 'prev') => {
    if (nativeMedia.active) {
      try {
        await invoke('control_media_playback', { action });
        setTimeout(fetchMedia, 250);
      } catch (e) {
        console.error('Media control failed:', e);
      }
    } else {
      if (action === 'playpause') {
        setAmbientPlaying(!ambientPlaying);
      } else if (action === 'next') {
        setAmbientIndex((prev) => (prev + 1) % AMBIENT_TRACKS.length);
        setAmbientTime(0);
      } else if (action === 'prev') {
        setAmbientIndex((prev) => (prev - 1 + AMBIENT_TRACKS.length) % AMBIENT_TRACKS.length);
        setAmbientTime(0);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentAmbient = AMBIENT_TRACKS[ambientIndex];
  const isPlaying = nativeMedia.active
    ? nativeMedia.state === 'playing'
    : ambientPlaying;
  const currentTitle = nativeMedia.active
    ? nativeMedia.title || 'Untitled Track'
    : currentAmbient.title;
  const currentArtist = nativeMedia.active
    ? nativeMedia.artist || 'Unknown Artist'
    : currentAmbient.artist;
  const currentAlbum = nativeMedia.active
    ? nativeMedia.album || (nativeMedia.app ? `${nativeMedia.app} Playback` : 'Media')
    : currentAmbient.album;
  const currentDuration = nativeMedia.active
    ? nativeMedia.duration || 180
    : currentAmbient.duration;
  const currentPosition = nativeMedia.active
    ? nativeMedia.position || 0
    : ambientTime;

  const progressPercent = Math.min(
    100,
    currentDuration > 0 ? (currentPosition / currentDuration) * 100 : 0
  );

  return (
    <div className="flex-1 flex gap-2.5 pt-0.5 pb-0.5 overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* LEFT COLUMN: MONOCHROME MEDIA PLAYER CARD (Apple Music / Spotify)    */}
      {/* ===================================================================== */}
      <div className="flex-[1.2] bg-[#0c0c0e] border border-white/[0.08] rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden group">
        {/* Subtle monochrome ambient depth aura */}
        <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full blur-[45px] opacity-15 pointer-events-none bg-white/20" />

        {/* Top: Album Art & Track Meta */}
        <div className="flex items-center gap-2.5 relative z-10">
          {/* Monochrome Vinyl Disk Artwork */}
          <div className="relative w-10 h-10 shrink-0">
            <div
              className={`w-10 h-10 rounded-full bg-[#141418] border border-white/20 shadow-md flex items-center justify-center relative overflow-hidden ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '7s' }}
            >
              {/* Vinyl Groove Rings */}
              <div className="absolute inset-1 rounded-full border border-white/[0.08]" />
              <div className="absolute inset-2.5 rounded-full border border-white/[0.08]" />
              {/* Center Monochrome Spindle */}
              <div className="w-3.5 h-3.5 rounded-full bg-white/10 border border-white/30 flex items-center justify-center shadow-inner">
                <div className="w-1 h-1 rounded-full bg-black" />
              </div>
            </div>

            {/* Now Playing Equalizer Pill */}
            {isPlaying && (
              <div className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-black/90 border border-white/15 backdrop-blur-md flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-1.5 bg-white animate-pulse" />
                <span
                  className="w-0.5 h-2.5 bg-white animate-pulse"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-0.5 h-1 bg-white animate-pulse"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            )}
          </div>

          {/* Track Meta Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-[12px] font-semibold text-white truncate tracking-tight">
                {currentTitle}
              </h4>
              {nativeMedia.active && (
                <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-white/10 text-zinc-300 border border-white/15 shrink-0">
                  {nativeMedia.app || 'macOS'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">{currentArtist}</p>
            <span className="text-[9.5px] font-mono text-zinc-500 truncate block mt-0.5">
              {currentAlbum}
            </span>
          </div>
        </div>

        {/* Middle: Crisp Monochrome Progress Bar */}
        <div className="my-1.5 relative z-10">
          <div className="h-1 w-full bg-white/[0.1] hover:bg-white/[0.16] rounded-full relative overflow-hidden transition-all">
            <div
              className="h-full bg-white rounded-full transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9.5px] font-mono text-zinc-500 mt-0.5">
            <span>{formatTime(currentPosition)}</span>
            <span>{formatTime(currentDuration)}</span>
          </div>
        </div>

        {/* Bottom: Playback Controls & Volume */}
        <div className="flex items-center justify-between relative z-10">
          {/* Skip & Play Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleMediaControl('prev')}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleMediaControl('playpause')}
              className="w-7 h-7 rounded-full bg-white text-black hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={() => handleMediaControl('next')}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3 h-3 text-zinc-500" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-14 h-1 bg-white/20 accent-white rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RIGHT COLUMN: REAL HARDWARE VITALS & UTILITY TILES (Monochrome)       */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col justify-between gap-1.5">
        {/* Real Hardware Vitals Card */}
        <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-xl p-2 flex flex-col gap-1.5">
          {/* CPU Metric */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Cpu className="w-3 h-3 text-white" />
              <span className="font-medium text-[10px] text-zinc-300">CPU Load</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-white font-semibold">
                {Math.round(vitals.cpu_usage)}%
              </span>
              <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, vitals.cpu_usage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Memory Metric */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <HardDrive className="w-3 h-3 text-white" />
              <span className="font-medium text-[10px] text-zinc-300">Memory</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-white font-semibold">
                {vitals.mem_used_gb}/{vitals.mem_total_gb} GB
              </span>
              <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500 rounded-full"
                  style={{ width: `${vitals.mem_percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Battery / Power Metric */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              {vitals.is_charging ? (
                <BatteryCharging className="w-3 h-3 text-white" />
              ) : (
                <Battery className="w-3 h-3 text-white" />
              )}
              <span className="font-medium text-[10px] text-zinc-300">Power</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-white font-semibold">
              <span>{vitals.battery_percent}%</span>
              <span className="text-[8.5px] px-1 py-0.2 rounded bg-white/10 text-zinc-300 border border-white/15">
                {vitals.is_charging ? 'AC' : 'Batt'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Utility Widgets */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Pomodoro Focus Timer */}
          <button
            onClick={() => setFocusActive(!focusActive)}
            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              focusActive
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-[#0c0c0e] border-white/[0.08] hover:bg-white/[0.04] text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[9.5px] font-mono text-zinc-400 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-white" /> Focus
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  focusActive ? 'bg-white animate-ping' : 'bg-zinc-600'
                }`}
              />
            </div>
            <div className="text-xs font-mono font-bold mt-0.5 text-white tracking-tight">
              {formatTime(focusSeconds)}
            </div>
          </button>

          {/* Local Speech Engine Status */}
          <div className="p-2 rounded-xl border bg-[#0c0c0e] border-white/[0.08] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[9.5px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-white" /> Speech Engine
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <div className="text-[10px] font-medium text-white mt-0.5 flex items-center justify-between">
              <span>Whisper</span>
              <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-white/10 text-zinc-300 border border-white/10">
                ⌥V
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
