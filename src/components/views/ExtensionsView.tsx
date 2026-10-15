import React, { useState } from 'react';
import {
  Pipette,
  Ruler,
  Mic,
  LayoutGrid,
  Star,
  Settings,
  Trash2,
  Search,
  CheckCircle2,
  Sparkles,
  Command,
  Play,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';

interface ExtensionItem {
  id: string;
  command: string;
  title: string;
  category: 'utilities' | 'ai' | 'clipboard' | 'developer';
  description: string;
  howItWorks: string;
  howToUse: string;
  icon: React.ElementType;
  hotkey?: string;
  status: 'active' | 'ready';
  actionLabel: string;
  onExecute: () => void | Promise<void>;
}

export const ExtensionsView: React.FC = () => {
  const {
    setSuperNotchMode,
    setSuperNotchHudView,
    setActiveClipboardCategory,
    setIsRecording,
    clipboardItems,
    setClipboardItems,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'utilities' | 'ai' | 'clipboard' | 'developer'>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const extensions: ExtensionItem[] = [
    {
      id: 'ext-color',
      command: '/color',
      title: 'Screen Color Eyedropper',
      category: 'developer',
      description: 'Native macOS pixel magnifying loupe for sampling precise screen colors.',
      howItWorks: 'Uses NSColorSampler to open Apple\'s high-DPI pixel grid loupe. Once clicked, copies hex (#RRGGBB) to your system clipboard and pushes it to your shelf.',
      howToUse: 'Press ⌥C or open the Notch and type /color. Click anywhere on your screen to copy the exact pixel color.',
      icon: Pipette,
      hotkey: '⌥C',
      status: 'active',
      actionLabel: 'Sample Color Now',
      onExecute: async () => {
        try {
          showNotification('Magnifying loupe active. Click any pixel...');
          const hex = await invoke<string>('pick_screen_color');
          if (hex) {
            showNotification(`Sampled & Copied ${hex}`);
          }
        } catch (e: any) {
          showNotification(e?.toString() || 'Color picker cancelled');
        }
      },
    },
    {
      id: 'ext-ruler',
      command: '/ruler',
      title: 'Pixel Distance Ruler',
      category: 'developer',
      description: 'On-screen laser measurement guide for inspecting margins, padding, and UI element dimensions.',
      howItWorks: 'Draws a crosshair guide overlay to measure pixel distances between UI elements on retina displays.',
      howToUse: 'Open Notch and type /ruler, or use global hotkey. Click and drag across any window to measure exact pixel dimensions.',
      icon: Ruler,
      hotkey: '⌥R',
      status: 'active',
      actionLabel: 'Inspect Dimensions',
      onExecute: () => {
        invoke('open_ruler').catch(() => {});
        showNotification('Pixel Ruler overlay engaged (press Esc to dismiss)');
      },
    },
    {
      id: 'ext-voice',
      command: '/voice',
      title: 'Voice Dictation & Transcription',
      category: 'ai',
      description: 'Ultra-fast on-device speech-to-text powered by local whisper.cpp GGML models.',
      howItWorks: 'Captures low-latency 16kHz audio from your default mic, processes speech in real-time, and types the result into whichever app is active.',
      howToUse: 'Hold or tap ⌥Space or type /voice in the Notch. Speak naturally, then release or tap again to paste into your active cursor.',
      icon: Mic,
      hotkey: '⌥Space',
      status: 'active',
      actionLabel: 'Start Dictation',
      onExecute: () => {
        invoke('toggle_recording').catch(() => {});
        setIsRecording(true);
        showNotification('Voice dictation active');
      },
    },
    {
      id: 'ext-shelf',
      command: '/shelf',
      title: 'SuPaste Card Shelf',
      category: 'clipboard',
      description: 'Horizontal visual card stream displaying recent clips, links, code, and sampled swatches.',
      howItWorks: 'Monitors macOS pasteboard locally. Automatically tags text types (links, code, colors, dictations) into visual cards.',
      howToUse: 'Tap the top Dynamic Notch, press ⌥V, or type /shelf to browse and drag-and-drop or 1-click paste any historic clip.',
      icon: LayoutGrid,
      hotkey: '⌥V',
      status: 'active',
      actionLabel: 'Open Shelf Overlay',
      onExecute: () => {
        invoke('set_notch_expanded', { expanded: true, width: 860, height: 220 }).catch(() => {});
        setSuperNotchMode('shelf');
        setSuperNotchHudView('shelf');
        showNotification('SuPaste Shelf expanded at screen top');
      },
    },
    {
      id: 'ext-pinned',
      command: '/pinned',
      title: 'Starred & Pinned Clips',
      category: 'clipboard',
      description: 'Persistent vault for frequently reused code snippets, prompt templates, and vital links.',
      howItWorks: 'Pinned clips are immune from auto-pruning and stay permanently saved in your local SQLite store.',
      howToUse: 'Click the Star icon on any clip card, or type /pinned in search to immediately filter your saved favorites.',
      icon: Star,
      hotkey: '⌥P',
      status: 'active',
      actionLabel: 'View Pinned Clips',
      onExecute: () => {
        setActiveClipboardCategory('pinned');
        invoke('set_notch_expanded', { expanded: true, width: 860, height: 220 }).catch(() => {});
        setSuperNotchMode('shelf');
        setSuperNotchHudView('shelf');
        showNotification('Showing Starred & Pinned items');
      },
    },
    {
      id: 'ext-settings',
      command: '/settings',
      title: 'DopeNotch Dashboard',
      category: 'utilities',
      description: 'Central configuration center for Whisper models, audio thresholds, AI prompts, and shortcuts.',
      howItWorks: 'Controls hardware device selection, GGML offline models, prompt injection rules, and hotkey bindings.',
      howToUse: 'Press ⌘, or type /settings in the Notch search bar to bring this Dashboard into focus.',
      icon: Settings,
      hotkey: '⌘,',
      status: 'active',
      actionLabel: 'Dashboard Active',
      onExecute: () => {
        showNotification('DopeNotch Dashboard is currently open');
      },
    },
    {
      id: 'ext-clear',
      command: '/clear',
      title: 'Clear Unpinned History',
      category: 'utilities',
      description: 'One-click local privacy scrubber that erases non-pinned clipboard history and transient logs.',
      howItWorks: 'Prunes temporary SQLite history entries while preserving all clips you have explicitly starred or pinned.',
      howToUse: 'Type /clear in the Notch search bar or click below to immediately reclaim privacy and purge unpinned clips.',
      icon: Trash2,
      status: 'active',
      actionLabel: 'Purge Unpinned Now',
      onExecute: () => {
        invoke('clear_clipboard_history').catch(() => {});
        setClipboardItems(clipboardItems.filter((i) => i.isPinned));
        showNotification('Unpinned clipboard items cleared');
      },
    },
  ];

  const filteredExtensions = extensions.filter((ext) => {
    const matchesSearch =
      ext.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ext.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 h-full flex flex-col bg-[#000000] text-[#ededed] overflow-hidden select-none p-6">
      {/* View Header */}
      <div className="flex items-center justify-between pb-5 border-b border-[#1e1e24]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white">Extensions & Tools</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/10 text-zinc-300">
              {extensions.length} Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Built-in micro-apps and Raycast-style slash commands accessible via the Dynamic Notch.
          </p>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex items-center justify-between gap-4 py-4">
        {/* Search Input */}
        <div className="flex items-center gap-2.5 bg-[#121215] border border-[#1e1e24] rounded-xl px-3.5 py-2 w-72 focus-within:border-white/30 transition-all">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search extensions or /command..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-white placeholder:text-zinc-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-zinc-500 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'All Extensions' },
            { id: 'developer', label: 'Developer' },
            { id: 'clipboard', label: 'Clipboard' },
            { id: 'ai', label: 'Voice & AI' },
            { id: 'utilities', label: 'Utilities' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'bg-[#121215] text-zinc-400 border border-[#1e1e24] hover:text-white hover:border-zinc-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Extensions Grid */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-slim-scrollbar">
        {filteredExtensions.map((ext) => {
          const Icon = ext.icon;
          return (
            <div
              key={ext.id}
              className="p-4 rounded-2xl bg-[#0a0a0c] border border-[#1e1e24] hover:border-zinc-700 transition-all duration-150 flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Icon & Title info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-200 shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-semibold text-white tracking-tight">
                        {ext.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/5 border border-white/10 text-amber-400 font-medium">
                        {ext.command}
                      </span>
                      {ext.hotkey && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 text-zinc-400">
                          {ext.hotkey}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Built-in
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {ext.description}
                    </p>

                    {/* How It Works & How To Use Accordion / Details */}
                    <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-2 gap-4 text-[11.5px]">
                      <div>
                        <span className="text-zinc-500 font-mono uppercase tracking-wider text-[10px] block mb-0.5">
                          How it works
                        </span>
                        <p className="text-zinc-400 leading-normal">
                          {ext.howItWorks}
                        </p>
                      </div>

                      <div>
                        <span className="text-zinc-500 font-mono uppercase tracking-wider text-[10px] block mb-0.5">
                          How to use
                        </span>
                        <p className="text-zinc-400 leading-normal">
                          {ext.howToUse}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Action Trigger */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <button
                    onClick={() => ext.onExecute()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white text-zinc-200 hover:text-black text-xs font-semibold transition-all cursor-pointer shadow-sm border border-white/10 hover:border-white"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{ext.actionLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredExtensions.length === 0 && (
          <div className="py-16 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
            <Command className="w-6 h-6 text-zinc-600 mb-1" />
            <p className="font-medium text-zinc-400">No extensions matched your filter</p>
            <p className="text-[11px] text-zinc-600">
              Try searching for a different keyword or slash command.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
