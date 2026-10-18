import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  HardDrive,
  Laptop,
  Headphones,
  CloudSun,
  Cpu,
  ChevronDown,
} from 'lucide-react';

interface SystemVitals {
  cpu_usage: number;
  mem_used_gb: number;
  mem_total_gb: number;
  mem_percent: number;
  battery_percent: number;
  is_charging: boolean;
  has_battery: boolean;
}

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

  // Live System Vitals
  const [vitals, setVitals] = useState<SystemVitals>({
    cpu_usage: 16.4,
    mem_used_gb: 8.8,
    mem_total_gb: 16.0,
    mem_percent: 55.0,
    battery_percent: 94,
    is_charging: true,
    has_battery: true,
  });

  // Fetch real macOS media status
  const fetchMedia = useCallback(async () => {
    try {
      const status = await invoke<MediaPlaybackStatus>('get_media_playback_status');
      if (status && status.active) {
        setNativeMedia(status);
      } else {
        setNativeMedia((prev) => (prev.active ? { ...prev, active: false } : prev));
      }
    } catch {}
  }, []);

  // Fetch real system vitals
  const fetchVitals = useCallback(async () => {
    try {
      const res = await invoke<SystemVitals>('get_system_vitals');
      if (res) {
        setVitals(res);
      }
    } catch {
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

  const handleMediaControl = async (action: 'playpause' | 'next' | 'prev') => {
    try {
      await invoke('control_media_playback', { action });
      setTimeout(fetchMedia, 300);
    } catch (e) {
      console.error('Media control failed:', e);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isMediaActive = nativeMedia.active;
  const isPlaying = isMediaActive ? nativeMedia.state === 'playing' : false;
  const currentTitle = isMediaActive ? nativeMedia.title || 'Unknown Track' : 'No Media Playing';
  const currentArtist = isMediaActive
    ? nativeMedia.artist || (nativeMedia.app ? `${nativeMedia.app}` : 'macOS Media')
    : 'System Audio Idle';
  const currentDuration = isMediaActive ? nativeMedia.duration || 0 : 0;
  const currentPosition = isMediaActive ? nativeMedia.position || 0 : 0;

  const progressPercent = Math.min(
    100,
    currentDuration > 0 ? (currentPosition / currentDuration) * 100 : 0
  );

  // Dynamic Date calculations ("WEDNESDAY 30")
  const now = new Date();
  const weekdayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dayNumber = now.getDate();

  return (
    <div className="w-full h-[184px] max-h-[184px] grid grid-cols-12 gap-2.5 overflow-hidden select-none items-stretch pt-0.5 pb-0.5">
      {/* ===================================================================== */}
      {/* 1. MEDIA PLAYER WIDGET FIRST (Col 1 to 5) - NOTHING UNDERNEATH IT    */}
      {/* ===================================================================== */}
      <div className="col-span-5 h-[184px] bg-[#141418] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden group">
        {/* Subtle audio playing glow when active */}
        {isPlaying && (
          <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full blur-[45px] opacity-25 pointer-events-none bg-emerald-500/30" />
        )}

        {/* Top: Album Art + Track Title & Artist */}
        <div className="flex items-center gap-3 relative z-10 min-w-0">
          <div className="w-13 h-13 rounded-xl overflow-hidden shrink-0 relative bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shadow-sm">
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-5">
                <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_100ms] h-4" />
                <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_300ms] h-5" />
                <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_200ms] h-3.5" />
                <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_400ms] h-4.5" />
              </div>
            ) : (
              <Headphones className="w-6 h-6 text-zinc-500" />
            )}
          </div>

          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                {isPlaying ? (nativeMedia.app || 'Now Playing') : 'Audio Output'}
              </span>
            </div>
            <h4 className="text-[13px] font-semibold text-white truncate tracking-tight leading-snug">
              {currentTitle}
            </h4>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
              {currentArtist}
            </p>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center justify-center gap-4 relative z-10 py-1">
          <button
            onClick={() => handleMediaControl('prev')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>
          <button
            onClick={() => handleMediaControl('playpause')}
            className="w-10 h-10 rounded-full bg-white text-black hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={() => handleMediaControl('next')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Bottom: Progress Bar with Real Scrub Timing */}
        <div className="relative z-10">
          <div className="h-1.5 w-full bg-white/[0.08] rounded-full relative overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                isPlaying ? 'bg-emerald-400' : 'bg-white/30'
              }`}
              style={{
                width: `${isMediaActive && currentDuration > 0 ? progressPercent : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[9.5px] font-mono text-zinc-400 mt-1.5">
            <span>{isMediaActive && currentDuration > 0 ? formatTime(currentPosition) : '0:00'}</span>
            <span>{isMediaActive && currentDuration > 0 ? formatTime(currentDuration) : 'macOS Media'}</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. STATS & HARDWARE VITALS WIDGET SECOND (Col 6 to 8)                 */}
      {/* ===================================================================== */}
      <div className="col-span-4 h-[184px] bg-[#141418] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-[11px] font-semibold text-white">System Vitals</span>
          </div>
          <span className="text-[9.5px] font-mono text-zinc-500">Live</span>
        </div>

        {/* 3 Rings: CPU, Memory, Battery */}
        <div className="flex items-center justify-around py-1">
          {/* Ring 1: CPU Load (Cyan) */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg width="40" height="40" className="rotate-[-90deg]">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="3.5"
                  fill="none"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={
                    2 * Math.PI * 16 * (1 - Math.min(100, Math.max(0, vitals.cpu_usage)) / 100)
                  }
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                <Cpu className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono font-semibold text-white">
                {Math.round(vitals.cpu_usage)}%
              </div>
              <div className="text-[8.5px] font-sans text-zinc-400">CPU</div>
            </div>
          </div>

          {/* Ring 2: Memory / RAM (Purple) */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg width="40" height="40" className="rotate-[-90deg]">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="3.5"
                  fill="none"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="#a855f7"
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={
                    2 * Math.PI * 16 * (1 - Math.min(100, vitals.mem_percent) / 100)
                  }
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                <HardDrive className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono font-semibold text-white">
                {Math.round(vitals.mem_percent)}%
              </div>
              <div className="text-[8.5px] font-sans text-zinc-400">Memory</div>
            </div>
          </div>

          {/* Ring 3: Battery (Green) */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg width="40" height="40" className="rotate-[-90deg]">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="3.5"
                  fill="none"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="#22c55e"
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={
                    2 * Math.PI * 16 * (1 - Math.min(100, vitals.battery_percent) / 100)
                  }
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                <Laptop className="w-3.5 h-3.5" />
              </div>
              {vitals.is_charging && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 text-black font-extrabold text-[7.5px] flex items-center justify-center shadow-sm">
                  ⚡
                </span>
              )}
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono font-semibold text-white">
                {vitals.battery_percent}%
              </div>
              <div className="text-[8.5px] font-sans text-zinc-400">Battery</div>
            </div>
          </div>
        </div>

        {/* Footer Stats summary */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1.5 border-t border-white/[0.04]">
          <span>RAM: {vitals.mem_used_gb.toFixed(1)} / {vitals.mem_total_gb} GB</span>
          <span>{vitals.is_charging ? 'Charging' : 'On Battery'}</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. WEATHER & DATE/CALENDAR WIDGETS THIRD (Col 9 to 12)                */}
      {/* ===================================================================== */}
      <div className="col-span-3 h-[184px] flex flex-col justify-between gap-2">
        {/* 3A. WEATHER CARD (Electric Blue) */}
        <div className="h-[88px] bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af] text-white rounded-2xl p-2.5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-[25px] pointer-events-none" />

          {/* Top: City */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-white/95 relative z-10">
            <span className="flex items-center gap-1">
              Beirut <ChevronDown className="w-2.5 h-2.5 text-white/70" />
            </span>
            <CloudSun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          </div>

          {/* Center: Temperature */}
          <div className="text-[24px] font-bold text-white tracking-tight leading-none my-0.5 relative z-10">
            24°
          </div>

          {/* Bottom: Condition & High / Low */}
          <div className="text-[9.5px] font-medium text-blue-100/90 truncate relative z-10">
            Sunny • H: 27° L: 21°
          </div>
        </div>

        {/* 3B. DATE & SCHEDULE CARD */}
        <div className="h-[88px] bg-[#141418] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between relative overflow-hidden">
          {/* Top: Weekday in coral/rose + Day Number */}
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-extrabold font-mono text-rose-400 tracking-wider">
              {weekdayName}
            </span>
            <span className="text-xl font-bold text-white font-sans leading-none">
              {dayNumber}
            </span>
          </div>

          {/* Bottom: Upcoming Schedule Event with Amber Priority Line */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-[3px] h-6 rounded-full bg-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-white truncate leading-tight">
                Design review
              </p>
              <p className="text-[9px] text-zinc-400 truncate mt-0.5 font-mono">
                12:00 PM • Zoom
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
