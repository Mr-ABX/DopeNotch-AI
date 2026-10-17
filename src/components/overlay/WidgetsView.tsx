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
  Moon,
  Pipette,
  Ruler,
  Mic,
  Check,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

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

interface AmbientTrack {
  title: string;
  artist: string;
  album: string;
  duration: number;
}

const AMBIENT_TRACKS: AmbientTrack[] = [
  {
    title: 'Slow Tide',
    artist: 'Mira Vale',
    album: 'Sunset Drift EP',
    duration: 215,
  },
  {
    title: 'Midnight Coding Flow',
    artist: 'DopeNotch Lo-Fi',
    album: 'Deep Focus Sessions',
    duration: 195,
  },
  {
    title: 'Silicon Nocturne',
    artist: 'Neural Beats',
    album: 'Whisper Waves',
    duration: 240,
  },
];

interface ReminderTask {
  id: string;
  text: string;
  completed: boolean;
}

const DEFAULT_TASKS: ReminderTask[] = [
  { id: '1', text: 'Pick up the charger', completed: false },
  { id: '2', text: 'Record the new demo', completed: false },
  { id: '3', text: 'Reply to the App Store review', completed: true },
];

export const WidgetsView: React.FC = () => {
  const {
    focusTimerRunning,
    focusTimerRemaining,
    startFocusTimer,
    pauseFocusTimer,
    setIsRecording,
  } = useAppStore();

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
  const [ambientTime, setAmbientTime] = useState(72);

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

  // Interactive Checklist Tasks (stored in localStorage)
  const [tasks, setTasks] = useState<ReminderTask[]>(() => {
    try {
      const saved = localStorage.getItem('dopenotch_today_tasks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TASKS;
  });

  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Save tasks on change
  useEffect(() => {
    try {
      localStorage.setItem('dopenotch_today_tasks', JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = () => {
    if (!newTaskInput.trim()) {
      setIsAddingTask(false);
      return;
    }
    const item: ReminderTask = {
      id: `task-${Date.now()}`,
      text: newTaskInput.trim(),
      completed: false,
    };
    setTasks((prev) => [...prev, item]);
    setNewTaskInput('');
    setIsAddingTask(false);
  };

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
  const isPlaying = nativeMedia.active ? nativeMedia.state === 'playing' : ambientPlaying;
  const currentTitle = nativeMedia.active ? nativeMedia.title || 'Slow Tide' : currentAmbient.title;
  const currentArtist = nativeMedia.active ? nativeMedia.artist || 'Mira Vale' : currentAmbient.artist;
  const currentDuration = nativeMedia.active ? nativeMedia.duration || 215 : currentAmbient.duration;
  const currentPosition = nativeMedia.active ? nativeMedia.position || 0 : ambientTime;

  const progressPercent = Math.min(
    100,
    currentDuration > 0 ? (currentPosition / currentDuration) * 100 : 0
  );

  // Dynamic Date calculations matching screenshot ("WEDNESDAY 30")
  const now = new Date();
  const weekdayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dayNumber = now.getDate();

  // Active uncompleted task count
  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="flex-1 flex flex-col justify-between gap-2 pt-0.5 pb-0.5 overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* ROW 1: Music Player (50%) + Weather Card (25%) + Calendar Card (25%) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-12 gap-2 h-[96px]">
        {/* 1. MUSIC PLAYER CARD (1:1 with Reference Screenshot) */}
        <div className="col-span-6 bg-gradient-to-r from-[#24101e] via-[#1a1226] to-[#12121a] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle warm sunset glow */}
          <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full blur-[40px] opacity-25 pointer-events-none bg-rose-500/30" />

          {/* Top: Album Art + Song & Artist + Controls */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Sunset Album Cover Artwork */}
              <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 relative bg-gradient-to-b from-[#ff7e5f] to-[#feb47b] flex items-center justify-center">
                {/* Stylized Sunset Art */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#200020]/90 via-[#701040]/50 to-transparent" />
                <div className="w-4 h-4 rounded-full bg-amber-200 shadow-[0_0_8px_rgba(253,230,138,0.9)] relative z-10 translate-y-[-2px]" />
                <div className="absolute bottom-1 inset-x-1.5 h-[1.5px] bg-amber-300/60" />
                <div className="absolute bottom-2 inset-x-2 h-[1px] bg-amber-300/40" />
              </div>

              {/* Title & Artist */}
              <div className="min-w-0 pr-1">
                <h4 className="text-[12px] font-semibold text-white truncate tracking-tight leading-tight">
                  {currentTitle}
                </h4>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">
                  {currentArtist}
                </p>
              </div>
            </div>

            {/* Playback Controls (1:1 with Screenshot) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleMediaControl('prev')}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Previous"
              >
                <SkipBack className="w-3.5 h-3.5 fill-current" />
              </button>
              <button
                onClick={() => handleMediaControl('playpause')}
                className="w-7 h-7 rounded-full bg-white text-black hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={() => handleMediaControl('next')}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Next"
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>

          {/* Bottom: Progress Bar with Scrub Pill */}
          <div className="relative z-10 mt-1">
            <div className="h-1.5 w-full bg-white/[0.12] rounded-full relative overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 mt-1">
              <span>{formatTime(currentPosition)}</span>
              <span>{formatTime(currentDuration)}</span>
            </div>
          </div>
        </div>

        {/* 2. WEATHER CARD (Electric Blue - 1:1 with Reference Screenshot) */}
        <div className="col-span-3 bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af] text-white rounded-2xl p-2.5 flex flex-col justify-between shadow-md relative overflow-hidden group">
          {/* Soft cloud depth glow */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-[25px] pointer-events-none" />

          {/* Top: City & Dropdown chevron */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-white/95">
            <span className="flex items-center gap-1">
              Beirut <ChevronDown className="w-2.5 h-2.5 text-white/70" />
            </span>
          </div>

          {/* Center: Big Temperature */}
          <div className="text-[26px] font-bold text-white tracking-tight leading-none my-0.5">
            24°
          </div>

          {/* Bottom: Condition & High / Low */}
          <div className="flex items-center gap-1.5 text-[9.5px] font-medium text-blue-100/90 truncate">
            <CloudSun className="w-3 h-3 text-amber-300 shrink-0" />
            <span className="truncate">H: 27° L: 21°</span>
          </div>
        </div>

        {/* 3. CALENDAR & SCHEDULE CARD (1:1 with Reference Screenshot) */}
        <div className="col-span-3 bg-[#121216] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between relative overflow-hidden">
          {/* Top: Weekday in red/coral caps + Day Number */}
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
              <p className="text-[10.5px] font-semibold text-white truncate leading-tight">
                Design review
              </p>
              <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                12:00 PM • Zoom
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ROW 2: Activity Rings (25%) + Control Center (25%) + Today Tasks (50%) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-12 gap-2 h-[96px]">
        {/* 4. ACTIVITY & HARDWARE RINGS CARD (1:1 with Reference Screenshot) */}
        <div className="col-span-3 bg-[#121216] border border-white/[0.08] rounded-2xl p-2 flex items-center justify-around relative">
          {/* Ring 1: Laptop Battery (Green) */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg width="32" height="32" className="rotate-[-90deg]">
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 13}
                  strokeDashoffset={
                    2 * Math.PI * 13 * (1 - Math.min(100, vitals.battery_percent) / 100)
                  }
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-zinc-200">
                <Laptop className="w-3.5 h-3.5" />
              </div>
              {vitals.is_charging && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 text-black font-extrabold text-[7px] flex items-center justify-center">
                  +
                </span>
              )}
            </div>
            <span className="text-[8.5px] font-mono text-zinc-400 font-medium">
              {vitals.battery_percent}%
            </span>
          </div>

          {/* Ring 2: AirPods / Headphones (White) */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg width="32" height="32" className="rotate-[-90deg]">
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 13}
                  strokeDashoffset={2 * Math.PI * 13 * (1 - 0.88)}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-zinc-200">
                <Headphones className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-[8.5px] font-mono text-zinc-400 font-medium">
              88%
            </span>
          </div>

          {/* Ring 3: RAM / Memory Load (Cyan) */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg width="32" height="32" className="rotate-[-90deg]">
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 13}
                  strokeDashoffset={
                    2 * Math.PI * 13 * (1 - Math.min(100, vitals.mem_percent) / 100)
                  }
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-zinc-200">
                <HardDrive className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-[8.5px] font-mono text-zinc-400 font-medium">
              {Math.round(vitals.mem_percent)}%
            </span>
          </div>
        </div>

        {/* 5. CONTROL CENTER 2X2 TOGGLES (1:1 with Reference Screenshot) */}
        <div className="col-span-3 bg-[#121216] border border-white/[0.08] rounded-2xl p-2 grid grid-cols-2 gap-1.5 items-center justify-center">
          {/* Toggle 1: Focus Mode Toggle (Active: Solid White with Black Icon) */}
          <button
            onClick={() => {
              if (focusTimerRunning) {
                pauseFocusTimer();
              } else {
                startFocusTimer(25, 'Deep Focus');
              }
            }}
            className={`w-full h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              focusTimerRunning
                ? 'bg-white text-black shadow-md scale-102'
                : 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
            }`}
            title={focusTimerRunning ? `Pause Focus Mode (${Math.floor(focusTimerRemaining / 60)}m left)` : 'Start Focus Mode (25m)'}
          >
            <Moon className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Toggle 2: Screen Ruler Toggle */}
          <button
            onClick={() => {
              invoke('open_ruler').catch(() => {});
            }}
            className="w-full h-8 rounded-full bg-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.14] flex items-center justify-center transition-all cursor-pointer"
            title="Launch Pixel Distance Ruler (⌥R)"
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>

          {/* Toggle 3: Screen Color Eyedropper / Loupe */}
          <button
            onClick={() => {
              invoke('open_loupe').catch(() => {});
            }}
            className="w-full h-8 rounded-full bg-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.14] flex items-center justify-center transition-all cursor-pointer"
            title="Screen Color Loupe & Eyedropper"
          >
            <Pipette className="w-3.5 h-3.5" />
          </button>

          {/* Toggle 4: Mic / Dictation Toggle */}
          <button
            onClick={() => {
              invoke('toggle_recording').catch(() => {});
              setIsRecording(true);
            }}
            className="w-full h-8 rounded-full bg-white/[0.08] text-zinc-300 hover:text-amber-400 hover:bg-white/[0.14] flex items-center justify-center transition-all cursor-pointer"
            title="Start Whisper Voice Dictation"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6. TODAY'S REMINDERS & FOCUS TASKS (1:1 with Reference Screenshot) */}
        <div className="col-span-6 bg-[#121216] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          {/* Header: "Today" in blue accent + count badge */}
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
            <span className="text-[11px] font-bold text-sky-400">Today</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-500 font-medium">
                {pendingCount}
              </span>
              <button
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="w-4 h-4 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                title="Add Task"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Task List Items (1:1 with Screenshot) */}
          <div className="flex-1 flex flex-col justify-center gap-1 overflow-hidden">
            {isAddingTask ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="New focus task..."
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTask();
                    if (e.key === 'Escape') setIsAddingTask(false);
                  }}
                  autoFocus
                  className="flex-1 bg-white/[0.08] text-white text-[10.5px] px-2 py-0.5 rounded outline-none border border-white/20"
                />
                <button
                  onClick={handleAddTask}
                  className="px-1.5 py-0.5 rounded bg-white text-black font-semibold text-[9.5px] cursor-pointer"
                >
                  Add
                </button>
              </div>
            ) : (
              tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <div
                    className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${
                      task.completed
                        ? 'bg-sky-500 border-sky-400 text-white'
                        : 'border-zinc-500 group-hover:border-zinc-300'
                    }`}
                  >
                    {task.completed && <Check className="w-2 h-2 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-[10.5px] truncate font-sans ${
                      task.completed
                        ? 'line-through text-zinc-500'
                        : 'text-zinc-200 group-hover:text-white'
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
