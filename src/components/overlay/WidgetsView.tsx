import React, { useState, useEffect } from 'react';
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
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

interface Track {
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverGradient: string;
}

const PLAYLIST: Track[] = [
  {
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    duration: 243,
    coverGradient: 'from-cyan-500 via-indigo-600 to-purple-800',
  },
  {
    title: 'Starboy',
    artist: 'The Weeknd ft. Daft Punk',
    album: 'Starboy',
    duration: 230,
    coverGradient: 'from-rose-500 via-red-600 to-amber-700',
  },
  {
    title: 'After Hours',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 361,
    coverGradient: 'from-amber-500 via-orange-600 to-stone-900',
  },
];

export const WidgetsView: React.FC = () => {
  // Media Player State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(74); // 1:14
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  // Focus Timer State
  const [focusActive, setFocusActive] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);

  // Live System Metrics (Simulated smoothly for realistic hardware feedback)
  const [cpuUsage, setCpuUsage] = useState(18);
  const [ramUsage, setRamUsage] = useState(8.4);
  const [batteryLevel] = useState(94);
  const [isCharging] = useState(true);

  const currentTrack = PLAYLIST[currentTrackIndex];

  // Playback timer ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= currentTrack.duration) {
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack.duration]);

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

  // Smooth slight fluctuations for CPU load to give live pulse feel
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = (Math.random() - 0.48) * 4;
        return Math.min(55, Math.max(12, Math.round(prev + delta)));
      });
      setRamUsage((prev) => {
        const delta = (Math.random() - 0.5) * 0.1;
        return Number(Math.min(12.5, Math.max(7.8, prev + delta)).toFixed(1));
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(Math.floor(pos * currentTrack.duration));
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
    setCurrentTime(0);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
    setCurrentTime(0);
  };

  const progressPercent = Math.min(100, (currentTime / currentTrack.duration) * 100);

  return (
    <div className="flex-1 flex gap-3 pt-2 pb-1 overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* LEFT COLUMN: INTERACTIVE NOW PLAYING MEDIA PLAYER                     */}
      {/* ===================================================================== */}
      <div className="flex-[1.2] bg-[#121215] border border-white/[0.08] rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden group">
        {/* Subtle Ambient Backlight Glow */}
        <div
          className={`absolute -top-12 -left-12 w-48 h-48 rounded-full blur-[40px] opacity-25 pointer-events-none bg-gradient-to-br ${currentTrack.coverGradient}`}
        />

        {/* Top: Album Art & Track Meta */}
        <div className="flex items-center gap-3 relative z-10">
          {/* Animated Vinyl Artwork */}
          <div className="relative w-14 h-14 shrink-0">
            {/* Spinning Vinyl Disk */}
            <div
              className={`w-14 h-14 rounded-full bg-[#0a0a0c] border border-white/20 shadow-xl flex items-center justify-center relative overflow-hidden ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '6s' }}
            >
              {/* Vinyl Groove Rings */}
              <div className="absolute inset-1.5 rounded-full border border-white/[0.07]" />
              <div className="absolute inset-3 rounded-full border border-white/[0.07]" />
              <div className="absolute inset-4 rounded-full border border-white/[0.09]" />
              {/* Center Gradient Label */}
              <div
                className={`w-5 h-5 rounded-full bg-gradient-to-tr ${currentTrack.coverGradient} flex items-center justify-center shadow-inner`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-black/80" />
              </div>
            </div>

            {/* Small Now Playing Equalizer Badge */}
            {isPlaying && (
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-black/80 border border-white/10 backdrop-blur-md flex items-end gap-0.5 h-3.5">
                <span className="w-0.5 h-2 bg-emerald-400 animate-pulse" />
                <span
                  className="w-0.5 h-3 bg-emerald-400 animate-pulse"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-0.5 h-1.5 bg-emerald-400 animate-pulse"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            )}
          </div>

          {/* Track Meta Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-white truncate tracking-tight">
                {currentTrack.title}
              </h4>
            </div>
            <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
            <span className="text-[10px] font-mono text-zinc-500 truncate block mt-0.5">
              {currentTrack.album}
            </span>
          </div>
        </div>

        {/* Middle: Scrubbable Progress Bar */}
        <div className="my-2 relative z-10">
          <div
            onClick={handleSeek}
            className="h-1.5 w-full bg-white/[0.1] hover:bg-white/[0.15] rounded-full cursor-pointer relative overflow-hidden transition-all group/bar"
          >
            <div
              className="h-full bg-white rounded-full transition-all duration-100 relative"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(currentTrack.duration)}</span>
          </div>
        </div>

        {/* Bottom: Playback Controls & Volume Slider */}
        <div className="flex items-center justify-between pt-1 relative z-10">
          {/* Skip & Play Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevTrack}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Previous"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-white text-black hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={nextTrack}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Next"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
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
              className="w-16 h-1 bg-white/20 accent-white rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RIGHT COLUMN: SYSTEM MONITOR & QUICK UTILITIES                        */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col justify-between gap-2">
        {/* System Vitals Card */}
        <div className="bg-[#121215] border border-white/[0.08] rounded-xl p-2.5 flex flex-col gap-2">
          {/* CPU Metric */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium text-[11px]">CPU Load</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-300 font-semibold">{cpuUsage}%</span>
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-500 rounded-full"
                  style={{ width: `${cpuUsage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Memory Metric */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium text-[11px]">Memory</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-300 font-semibold">{ramUsage} GB</span>
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.round((ramUsage / 16) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Battery Metric */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium text-[11px]">Power</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-300 font-semibold">
              <span>{batteryLevel}%</span>
              {isCharging && (
                <span className="text-[9px] text-amber-400 px-1 py-0.2 rounded bg-amber-400/10 border border-amber-400/20">
                  Charging
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Utility Widgets */}
        <div className="grid grid-cols-2 gap-2">
          {/* Pomodoro Focus Timer */}
          <button
            onClick={() => setFocusActive(!focusActive)}
            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              focusActive
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-[#121215] border-white/[0.08] hover:bg-white/[0.04] text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Focus
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  focusActive ? 'bg-amber-400 animate-ping' : 'bg-zinc-600'
                }`}
              />
            </div>
            <div className="text-sm font-mono font-bold mt-1 tracking-tight">
              {formatTime(focusSeconds)}
            </div>
          </button>

          {/* AI Quick Voice Prompt */}
          <div className="p-2 rounded-xl border bg-[#121215] border-white/[0.08] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" /> Smart Mic
              </span>
              <Zap className="w-2.5 h-2.5 text-emerald-400" />
            </div>
            <div className="text-[11px] font-medium text-zinc-200 mt-1 flex items-center justify-between">
              <span>Local Whisper</span>
              <span className="text-[9px] font-mono text-emerald-400">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
