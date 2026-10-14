import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Copy,
  Pin,
  Trash2,
  X,
  CornerDownLeft,
  Star,
  Settings,
  Mic,
  Pipette,
  Ruler,
  Code,
  Link2,
  Layers,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  useAppStore,
  ClipboardCategory,
  ClipboardItem,
} from '../../stores/appStore';

export const SuperNotch: React.FC = () => {
  const {
    isRecording,
    audioLevel,
    streamingText,
    recordingMode,
    superNotchMode,
    superNotchHudView,
    setSuperNotchMode,
    setSuperNotchHudView,
    setIsRecording,
    clipboardItems,
    activeClipboardCategory,
    setActiveClipboardCategory,
    clipboardSearchQuery,
    setClipboardSearchQuery,
    togglePinClipboardItem,
    deleteClipboardItem,
    setClipboardItems,
  } = useAppStore();

  const [shelfSelectedIndex, setShelfSelectedIndex] = useState<number>(0);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const shelfScrollRef = useRef<HTMLDivElement>(null);
  const searchListScrollRef = useRef<HTMLDivElement>(null);

  const isCommand = recordingMode === 'command';
  const isRewrite = recordingMode === 'rewrite';
  const activeMode = isRecording ? 'recording' : superNotchMode;

  // 7 Equalizer Bars calculation for recording mode
  const bars = [0.35, 0.65, 0.95, 1.0, 0.85, 0.55, 0.35];

  const showStatus = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 2000);
  };

  const handleCopy = (item: ClipboardItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    showStatus('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePaste = async (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await invoke('paste_text_direct', { text });
    } catch {
      await navigator.clipboard.writeText(text);
    }
    setSuperNotchMode('idle');
  };

  const handleOpenDashboard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    invoke('open_settings').catch(() => {});
    setSuperNotchMode('idle');
  };

  // Raycast Tool Commands
  const toolCommands = useMemo(() => [
    {
      id: 'cmd-color',
      command: '/color',
      title: 'Screen Color Eyedropper',
      subtitle: 'Native macOS pixel loupe • copies hex to clipboard',
      icon: Pipette,
      action: async () => {
        try {
          showStatus('Click any pixel on screen...');
          const hex = await invoke<string>('pick_screen_color');
          if (hex && hex.trim()) {
            showStatus(`Sampled ${hex} to clipboard!`);
          } else {
            showStatus('Color sampling cancelled');
          }
        } catch (err) {
          console.error(err);
          showStatus('Color sampling cancelled');
        }
      },
    },
    {
      id: 'cmd-ruler',
      command: '/ruler',
      title: 'Pixel Distance Ruler',
      subtitle: 'Snapping laser measurement for margins & padding',
      icon: Ruler,
      action: () => {
        showStatus('Laser Ruler active • Press Esc to cancel');
      },
    },
    {
      id: 'cmd-voice',
      command: '/voice',
      title: 'Voice Dictation',
      subtitle: 'Trigger on-device Whisper speech-to-text',
      icon: Mic,
      action: () => {
        setSuperNotchMode('idle');
        invoke('start_recording').catch(() => {});
        setIsRecording(true);
      },
    },
    {
      id: 'cmd-shelf',
      command: '/shelf',
      title: 'Switch to Horizontal Shelf',
      subtitle: 'View SuPaste card gallery',
      icon: Layers,
      action: () => {
        setSuperNotchHudView('shelf');
      },
    },
    {
      id: 'cmd-pinned',
      command: '/pinned',
      title: 'View Pinned Clips',
      subtitle: 'Filter history by starred items',
      icon: Star,
      action: () => {
        setActiveClipboardCategory('pinned');
        setSuperNotchHudView('shelf');
      },
    },
    {
      id: 'cmd-settings',
      command: '/settings',
      title: 'Liquid Voice Dashboard',
      subtitle: 'Open preferences, models & audio settings',
      icon: Settings,
      action: () => {
        handleOpenDashboard();
      },
    },
    {
      id: 'cmd-clear',
      command: '/clear',
      title: 'Clear Unpinned Clips',
      subtitle: 'Prune non-pinned items from history',
      icon: Trash2,
      action: () => {
        invoke('clear_clipboard_history').catch(() => {});
        setClipboardItems(clipboardItems.filter((i) => i.isPinned));
        showStatus('Cleared non-pinned history');
      },
    },
  ], [clipboardItems, handleOpenDashboard, setActiveClipboardCategory, setClipboardItems, setIsRecording, setSuperNotchHudView, setSuperNotchMode]);

  // Combined fast search results (Commands + Clips)
  const searchResults = useMemo(() => {
    const q = clipboardSearchQuery.trim().toLowerCase();
    const isSlash = q.startsWith('/');

    // Matching tool commands
    const matchingCommands = toolCommands.filter((cmd) => {
      if (isSlash) {
        return (
          cmd.command.toLowerCase().includes(q) ||
          cmd.title.toLowerCase().includes(q.slice(1))
        );
      }
      return (
        cmd.command.toLowerCase().includes(q) ||
        cmd.title.toLowerCase().includes(q) ||
        cmd.subtitle.toLowerCase().includes(q)
      );
    });

    // Matching clipboard/dictation items
    const matchingClips = clipboardItems.filter((item) => {
      if (isSlash) return false;
      if (!q) return true;
      return (
        item.content.toLowerCase().includes(q) ||
        (item.sourceApp && item.sourceApp.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    });

    return {
      commands: matchingCommands,
      clips: matchingClips,
      totalCount: matchingCommands.length + matchingClips.length,
    };
  }, [clipboardSearchQuery, toolCommands, clipboardItems]);

  // Filter items for Page 2: Horizontal Shelf
  const filteredShelfItems = useMemo(() => {
    return clipboardItems.filter((item) => {
      if (activeClipboardCategory === 'pinned' && !item.isPinned) return false;
      if (activeClipboardCategory === 'dictation' && item.category !== 'dictation') return false;
      if (activeClipboardCategory === 'clipboard' && item.category !== 'clipboard') return false;
      if (activeClipboardCategory === 'code' && item.category !== 'code') return false;
      if (activeClipboardCategory === 'link' && item.category !== 'link') return false;
      if (activeClipboardCategory === 'color' && item.category !== 'color') return false;

      if (clipboardSearchQuery.trim() && !clipboardSearchQuery.startsWith('/')) {
        const q = clipboardSearchQuery.toLowerCase();
        return (
          item.content.toLowerCase().includes(q) ||
          (item.sourceApp && item.sourceApp.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeClipboardCategory, clipboardItems, clipboardSearchQuery]);

  // Calculate live counts for each category badge
  const counts = useMemo(() => ({
    all: clipboardItems.length,
    dictation: clipboardItems.filter((c) => c.category === 'dictation').length,
    clipboard: clipboardItems.filter((c) => c.category === 'clipboard').length,
    pinned: clipboardItems.filter((c) => c.isPinned).length,
    code: clipboardItems.filter((c) => c.category === 'code').length,
    link: clipboardItems.filter((c) => c.category === 'link').length,
    color: clipboardItems.filter((c) => c.category === 'color').length,
  }), [clipboardItems]);

  // Adjust selection within bounds
  useEffect(() => {
    if (searchSelectedIndex >= searchResults.totalCount) {
      setSearchSelectedIndex(Math.max(0, searchResults.totalCount - 1));
    }
  }, [searchResults.totalCount, searchSelectedIndex]);

  useEffect(() => {
    if (shelfSelectedIndex >= filteredShelfItems.length) {
      setShelfSelectedIndex(Math.max(0, filteredShelfItems.length - 1));
    }
  }, [filteredShelfItems.length, shelfSelectedIndex]);

  // Sync window size with Tauri backend & fetch fresh clipboard items
  useEffect(() => {
    if (activeMode === 'shelf') {
      invoke<any[]>('get_clipboard_history')
        .then((items) => {
          if (Array.isArray(items)) {
            setClipboardItems(
              items.map((it) => ({
                id: it.id,
                content: it.content,
                category: it.category,
                timestamp: it.timestamp,
                timestampRaw: it.timestamp_raw || Date.now(),
                sourceApp: it.source_app || 'Clipboard',
                charCount: it.char_count || it.content.length,
                wordCount: it.word_count || it.content.split(/\s+/).filter(Boolean).length,
                isPinned: it.is_pinned || false,
              }))
            );
          }
        })
        .catch(() => {});
      invoke('set_notch_expanded', { expanded: true }).catch(() => {});
      getCurrentWindow().setFocus().catch(() => {});
      const focusSearch = () => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      };
      setTimeout(focusSearch, 40);
      setTimeout(focusSearch, 120);
      setTimeout(focusSearch, 260);
    } else {
      invoke('set_notch_expanded', { expanded: false }).catch(() => {});
    }
  }, [activeMode, setClipboardItems]);

  // Listen for global shortcut toggle HUD event (Option+V / Cmd+Shift+V)
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    listen('murmur://toggle-hud', () => {
      setSuperNotchMode(superNotchMode === 'shelf' ? 'idle' : 'shelf');
      if (superNotchMode !== 'shelf') {
        setSuperNotchHudView('search');
      }
    }).then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [superNotchMode, setSuperNotchMode, setSuperNotchHudView]);

  // Auto-close notch on blur (window losing focus) with safety grace period
  useEffect(() => {
    if (activeMode !== 'shelf') return;

    const mountedAt = Date.now();
    const handleBlur = () => {
      // Allow 400ms grace period so initial window focus doesn't falsely trigger blur
      if (Date.now() - mountedAt < 400) return;
      setSuperNotchMode('idle');
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [activeMode, setSuperNotchMode]);

  // Master Keyboard Navigation (Arrows, Tab, Enter, Esc)
  useEffect(() => {
    if (activeMode !== 'shelf') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuperNotchMode('idle');
        return;
      }

      // Tab switches between Search View and Horizontal Shelf View
      if (e.key === 'Tab') {
        e.preventDefault();
        setSuperNotchHudView(superNotchHudView === 'search' ? 'shelf' : 'search');
        return;
      }

      // PAGE 1: SEARCH VIEW KEYBOARD CONTROLS
      if (superNotchHudView === 'search') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSearchSelectedIndex((prev) =>
            prev < searchResults.totalCount - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSearchSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const cmdCount = searchResults.commands.length;
          if (searchSelectedIndex < cmdCount) {
            const cmd = searchResults.commands[searchSelectedIndex];
            if (cmd) cmd.action();
          } else {
            const clipIdx = searchSelectedIndex - cmdCount;
            const clip = searchResults.clips[clipIdx];
            if (clip) handlePaste(clip.content);
          }
        }
      }

      // PAGE 2: SHELF VIEW KEYBOARD CONTROLS
      if (superNotchHudView === 'shelf') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setShelfSelectedIndex((prev) =>
            prev < filteredShelfItems.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setShelfSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && filteredShelfItems[shelfSelectedIndex]) {
          e.preventDefault();
          handlePaste(filteredShelfItems[shelfSelectedIndex].content);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeMode,
    superNotchHudView,
    searchResults,
    searchSelectedIndex,
    filteredShelfItems,
    shelfSelectedIndex,
    setSuperNotchMode,
    setSuperNotchHudView,
  ]);

  // Scroll active shelf card into view
  useEffect(() => {
    if (activeMode === 'shelf' && superNotchHudView === 'shelf' && shelfScrollRef.current) {
      const selectedEl = shelfScrollRef.current.children[shelfSelectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [shelfSelectedIndex, activeMode, superNotchHudView]);

  // Handle Trackpad Horizontal Swipe to switch pages
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 28) {
      if (e.deltaX > 28 && superNotchHudView === 'search') {
        setSuperNotchHudView('shelf');
      } else if (e.deltaX < -28 && superNotchHudView === 'shelf') {
        setSuperNotchHudView('search');
      }
    }
  };

  const categories: Array<{ id: ClipboardCategory; label: string; count: number }> = [
    { id: 'all', label: 'History', count: counts.all },
    { id: 'dictation', label: 'Dictations', count: counts.dictation },
    { id: 'clipboard', label: 'Clips', count: counts.clipboard },
    { id: 'code', label: 'Code', count: counts.code },
    { id: 'color', label: 'Colors', count: counts.color },
    { id: 'link', label: 'Links', count: counts.link },
    { id: 'pinned', label: 'Pinned', count: counts.pinned },
  ];

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none flex flex-col items-center select-none overflow-hidden bg-transparent">
      <AnimatePresence mode="wait">
        {/* ========================================================================= */}
        {/* 1. IDLE NOTCH: Exact Apple Cutout Shape (Pure #000, No Shadow, No Border) */}
        {/* ========================================================================= */}
        {activeMode === 'idle' && (
          <motion.div
            key="notch-idle"
            initial={{ y: -35, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -35, opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 480 }}
            onClick={() => setSuperNotchMode('shelf')}
            className="pointer-events-auto cursor-pointer flex flex-col items-center group"
            title="Click to open DopeNotch Fast Search & Shelf"
          >
            {/* Authentic Apple Notch SVG with concave ear wings */}
            <svg
              width="170"
              height="30"
              viewBox="0 0 170 30"
              fill="none"
              className="overflow-visible"
            >
              <path
                d="M 0 0 C 5 0, 8 3, 8 8 L 8 18 C 8 25, 13 30, 20 30 L 150 30 C 157 30, 162 25, 162 18 L 162 8 C 162 3, 165 0, 170 0 Z"
                fill="#000000"
              />
            </svg>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 2. RECORDING NOTCH: 7-bar audio visualizer + real-time transcription stream */}
        {/* ========================================================================= */}
        {activeMode === 'recording' && (
          <motion.div
            key="notch-recording"
            initial={{ y: -60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 450 }}
            className="pointer-events-auto flex flex-col items-center w-[360px] max-w-[92vw]"
          >
            <div className="relative w-full">
              {/* Apple Notch Background Shell */}
              <svg
                width="100%"
                height="62"
                viewBox="0 0 360 62"
                preserveAspectRatio="none"
                className="overflow-visible"
              >
                <path
                  d="M 0 0 C 7 0, 10 4, 10 10 L 10 44 C 10 54, 18 62, 28 62 L 332 62 C 342 62, 350 54, 350 44 L 350 10 C 350 4, 353 0, 360 0 Z"
                  fill="#000000"
                />
              </svg>

              {/* Foreground Visualizer Content */}
              <div className="absolute inset-0 px-6 pt-2.5 pb-2 flex flex-col items-center justify-between">
                {/* Top Row: Equalizer Bars + Mode Badge */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-[2.5px] h-3.5">
                    {bars.map((mult, i) => {
                      const heightPercent = Math.max(
                        20,
                        Math.min(100, audioLevel * 100 * mult * 2.5)
                      );
                      return (
                        <div
                          key={i}
                          className={`w-[2.5px] rounded-full transition-all duration-75 ${
                            isCommand
                              ? 'bg-red-500'
                              : isRewrite
                              ? 'bg-blue-400'
                              : 'bg-amber-400'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      );
                    })}
                  </div>

                  <span
                    className={`text-[11px] font-semibold tracking-wide ${
                      isCommand
                        ? 'text-red-400'
                        : isRewrite
                        ? 'text-blue-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {isCommand ? 'Command' : isRewrite ? 'Rewrite' : 'Dictate'}
                  </span>
                </div>

                {/* Bottom Row: Speech Preview */}
                <div className="w-full text-center px-1">
                  <p className="text-xs text-[#ededed] font-medium leading-tight line-clamp-1">
                    {streamingText ? (
                      <>
                        <span>{streamingText}</span>
                        <span className="inline-block w-1 h-3 bg-white ml-1 animate-pulse align-middle" />
                      </>
                    ) : (
                      <span className="text-zinc-500 text-[11px]">Listening to your voice...</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 3. DUAL-HUD EXPANDED NOTCH (Page 1: Fast Search | Page 2: Horizontal Shelf) */}
        {/* ========================================================================= */}
        {activeMode === 'shelf' && (
          <>
            {/* Click-outside backdrop to auto-close shelf */}
            <div
              className="fixed inset-0 pointer-events-auto z-0"
              onClick={() => setSuperNotchMode('idle')}
            />
            <motion.div
              key="notch-expanded"
              initial={{ y: -100, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -100, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 400 }}
              onWheel={handleWheel}
              className="pointer-events-auto relative z-10 flex flex-col items-center w-[760px] max-w-[96vw]"
            >
              <div className="relative w-full">
                {/* Apple Notch Expanded Cutout Shell */}
                <svg
                  width="100%"
                  height="286"
                  viewBox="0 0 760 286"
                  preserveAspectRatio="none"
                  className="overflow-visible"
                >
                  <path
                    d="M 0 0 C 10 0, 16 5, 16 14 L 16 262 C 16 275, 27 286, 40 286 L 720 286 C 733 286, 744 275, 744 262 L 744 14 C 744 5, 750 0, 760 0 Z"
                    fill="#000000"
                  />
                </svg>

                {/* HUD Interior Content */}
                <div className="absolute inset-0 px-6 pt-3 pb-3 flex flex-col justify-between text-[#ededed]">
                  {/* TOP HEADER: Search Input + 2-Page Toggle Tabs + Quick Actions */}
                  <div className="flex items-center justify-between gap-3 px-1 border-b border-white/5 pb-2.5">
                    {/* Left: Raycast Search Input */}
                    <div className="flex items-center gap-2 bg-[#141416] border border-white/10 rounded-full px-3.5 py-1.5 w-72 flex-shrink-0">
                      <Search className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search clips or type '/' for tools..."
                        value={clipboardSearchQuery}
                        onChange={(e) => setClipboardSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                        }}
                        autoFocus
                        className="w-full bg-transparent border-none text-xs text-white placeholder:text-zinc-500 focus:outline-none pointer-events-auto select-text cursor-text"
                      />
                      {clipboardSearchQuery && (
                        <button
                          onClick={() => setClipboardSearchQuery('')}
                          className="text-zinc-500 hover:text-white text-xs px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Center: 2-Page Dual-View Tabs (Search vs Shelf) */}
                    <div className="flex items-center bg-[#141416] p-1 rounded-full border border-white/10">
                      <button
                        onClick={() => setSuperNotchHudView('search')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                          superNotchHudView === 'search'
                            ? 'bg-amber-500 text-black font-semibold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Search className="w-3 h-3" />
                        <span>Search</span>
                      </button>
                      <button
                        onClick={() => setSuperNotchHudView('shelf')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                          superNotchHudView === 'shelf'
                            ? 'bg-white text-black font-semibold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Layers className="w-3 h-3" />
                        <span>Shelf</span>
                        <span className="text-[10px] opacity-75 font-mono">({clipboardItems.length})</span>
                      </button>
                    </div>

                    {/* Right: Feedback & Quick Actions */}
                    <div className="flex items-center gap-1.5">
                      {statusFeedback && (
                        <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-fade-in truncate max-w-[140px]">
                          {statusFeedback}
                        </span>
                      )}

                      <button
                        onClick={() =>
                          setActiveClipboardCategory(
                            activeClipboardCategory === 'pinned' ? 'all' : 'pinned'
                          )
                        }
                        className={`p-1.5 rounded-full transition-colors ${
                          activeClipboardCategory === 'pinned'
                            ? 'bg-amber-400/20 text-amber-400'
                            : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1c]'
                        }`}
                        title="Toggle Pinned View"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={handleOpenDashboard}
                        className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-[#1a1a1c] transition-colors"
                        title="Open Dashboard"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSuperNotchMode('idle')}
                        className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-[#1a1a1c] transition-colors"
                        title="Close (Esc)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ================================================================= */}
                  {/* VIEW 1: FAST SEARCH & RAYCAST COMMAND LIST (DEFAULT)              */}
                  {/* ================================================================= */}
                  {superNotchHudView === 'search' && (
                    <div className="flex-1 flex flex-col justify-between pt-2">
                      {/* Search Results List */}
                      <div
                        ref={searchListScrollRef}
                        className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1 max-h-[188px]"
                      >
                        {searchResults.totalCount === 0 ? (
                          <div className="py-8 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-1">
                            <p className="font-medium text-zinc-400">No matching tools or clips</p>
                            <p className="text-[11px] text-zinc-600">
                              Type <span className="font-mono text-amber-400">/</span> to browse tools, or swipe horizontally to view the full shelf.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Section: Tool Commands */}
                            {searchResults.commands.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 px-2 py-0.5">
                                  Quick Tools & Actions
                                </div>
                                {searchResults.commands.map((cmd, i) => {
                                  const isSelected = searchSelectedIndex === i;
                                  const CmdIcon = cmd.icon;
                                  return (
                                    <div
                                      key={cmd.id}
                                      onClick={() => cmd.action()}
                                      onMouseEnter={() => setSearchSelectedIndex(i)}
                                      className={`flex items-center justify-between px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                                        isSelected
                                          ? 'bg-amber-500/15 border border-amber-500/30 text-white'
                                          : 'hover:bg-white/5 text-zinc-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                                          <CmdIcon className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex items-center gap-2 truncate">
                                          <span className="font-mono text-xs font-bold text-amber-400">
                                            {cmd.command}
                                          </span>
                                          <span className="text-xs font-medium text-zinc-200">
                                            {cmd.title}
                                          </span>
                                          <span className="text-[11px] text-zinc-500 truncate hidden sm:inline">
                                            {cmd.subtitle}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500/80 px-1.5 py-0.2 rounded bg-amber-500/10">
                                        Tool
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Section: Clips & Dictations */}
                            {searchResults.clips.length > 0 && (
                              <div>
                                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 px-2 py-0.5">
                                  Recent Clips & Dictations
                                </div>
                                {searchResults.clips.map((item, idx) => {
                                  const overallIndex = searchResults.commands.length + idx;
                                  const isSelected = searchSelectedIndex === overallIndex;
                                  const isColor = item.category === 'color';

                                  return (
                                    <div
                                      key={item.id}
                                      onClick={() => handlePaste(item.content)}
                                      onMouseEnter={() => setSearchSelectedIndex(overallIndex)}
                                      className={`flex items-center justify-between px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                                        isSelected
                                          ? 'bg-white/10 ring-1 ring-white/20 text-white'
                                          : 'hover:bg-white/5 text-zinc-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        {/* Category Icon Badge */}
                                        <div
                                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            item.category === 'dictation'
                                              ? 'bg-amber-500/20 text-amber-400'
                                              : item.category === 'code'
                                              ? 'bg-indigo-500/20 text-indigo-400'
                                              : item.category === 'color'
                                              ? 'border border-white/20'
                                              : item.category === 'link'
                                              ? 'bg-blue-500/20 text-blue-400'
                                              : 'bg-zinc-800 text-zinc-400'
                                          }`}
                                          style={isColor ? { backgroundColor: item.content } : undefined}
                                        >
                                          {item.category === 'dictation' ? (
                                            <Mic className="w-3.5 h-3.5" />
                                          ) : item.category === 'code' ? (
                                            <Code className="w-3.5 h-3.5" />
                                          ) : item.category === 'link' ? (
                                            <Link2 className="w-3.5 h-3.5" />
                                          ) : isColor ? null : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </div>

                                        {/* Content Preview */}
                                        <span
                                          className={`text-xs truncate max-w-[420px] ${
                                            item.category === 'code'
                                              ? 'font-mono text-zinc-200'
                                              : 'text-zinc-200'
                                          }`}
                                        >
                                          {item.content.replace(/\n+/g, ' ')}
                                        </span>
                                      </div>

                                      {/* Source & Timestamp */}
                                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                        {item.isPinned && (
                                          <Pin className="w-3 h-3 text-amber-400 fill-current" />
                                        )}
                                        <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[80px]">
                                          {item.sourceApp || 'Clip'}
                                        </span>
                                        <span className="text-[10px] text-zinc-600 font-mono">
                                          {item.timestamp}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Search View Keyboard Shortcut Bar */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1.5 border-t border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-white/10 text-zinc-300">↵</span> Paste
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-white/10 text-zinc-300">↑↓</span> Select
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-white/10 text-zinc-300">Tab</span> Shelf View
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <span className="px-1 py-0.2 rounded bg-white/10 text-zinc-300">Esc</span> Close
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* VIEW 2: HORIZONTAL VISUAL SHELF (ACCESSED VIA TAB OR SWIPE)       */}
                  {/* ================================================================= */}
                  {superNotchHudView === 'shelf' && (
                    <div className="flex-1 flex flex-col justify-between pt-1.5">
                      {/* Filter Pills Header */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                          {categories.map((cat) => {
                            const isActive = activeClipboardCategory === cat.id;
                            return (
                              <button
                                key={cat.id}
                                onClick={() => setActiveClipboardCategory(cat.id)}
                                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] transition-all whitespace-nowrap ${
                                  isActive
                                    ? 'bg-white text-black font-semibold'
                                    : 'bg-[#18181a] text-zinc-400 hover:text-zinc-200 hover:bg-[#222226]'
                                }`}
                              >
                                <span>{cat.label}</span>
                                <span
                                  className={`text-[9px] ${
                                    isActive ? 'text-zinc-600 font-bold' : 'text-zinc-500'
                                  }`}
                                >
                                  {cat.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                          Scroll left/right to browse
                        </span>
                      </div>

                      {/* Main Horizontal Scrollable Shelf Cards */}
                      <div
                        ref={shelfScrollRef}
                        className="flex flex-row gap-3 overflow-x-auto no-scrollbar py-1 px-1 items-stretch max-h-[160px]"
                      >
                        {filteredShelfItems.length === 0 ? (
                          <div className="w-full py-6 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-1">
                            <p className="font-medium text-zinc-400">No clips found</p>
                            <p className="text-[11px] text-zinc-600">
                              Copy items to your clipboard or speak to see them appear here.
                            </p>
                          </div>
                        ) : (
                          filteredShelfItems.map((item, index) => {
                            const isSelected = shelfSelectedIndex === index;
                            const isCopied = copiedId === item.id;
                            const isColor = item.category === 'color';

                            return (
                              <div
                                key={item.id}
                                onClick={() => handlePaste(item.content)}
                                onMouseEnter={() => setShelfSelectedIndex(index)}
                                className={`w-[155px] min-w-[155px] h-[142px] rounded-[18px] p-3 flex flex-col justify-between transition-all duration-150 cursor-pointer select-none group relative overflow-hidden ${
                                  isColor
                                    ? 'border border-white/10'
                                    : isSelected
                                    ? 'bg-[#1c1c1f] ring-1 ring-white/20'
                                    : 'bg-[#141416] hover:bg-[#18181b]'
                                }`}
                                style={
                                  isColor
                                    ? { backgroundColor: item.content }
                                    : undefined
                                }
                              >
                                {/* Hover Actions Bar */}
                                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePinClipboardItem(item.id);
                                    }}
                                    className={`p-1 rounded-full bg-black/60 backdrop-blur-md transition-colors ${
                                      item.isPinned ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
                                    }`}
                                    title={item.isPinned ? 'Unpin' : 'Pin'}
                                  >
                                    <Pin className="w-2.5 h-2.5 fill-current" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteClipboardItem(item.id);
                                    }}
                                    className="p-1 rounded-full bg-black/60 backdrop-blur-md text-zinc-400 hover:text-red-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                {/* Card Body */}
                                {isColor ? (
                                  <div className="flex-1 flex flex-col justify-end">
                                    <span className="text-xs font-mono font-bold text-white bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-md self-start">
                                      {item.content}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex-1 overflow-hidden pr-2">
                                    {item.category === 'dictation' && (
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        <span className="text-[10px] font-semibold text-amber-400">
                                          Dictation
                                        </span>
                                      </div>
                                    )}
                                    <p
                                      className={`text-[12px] leading-relaxed line-clamp-4 ${
                                        item.category === 'code'
                                          ? 'font-mono text-zinc-300 text-[11px]'
                                          : 'text-[#EDEDED] font-sans'
                                      }`}
                                    >
                                      {item.content}
                                    </p>
                                  </div>
                                )}

                                {/* Card Footer */}
                                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1.5 mt-1 border-t border-white/5 font-mono">
                                  <div className="flex items-center gap-1 truncate">
                                    <span className="truncate max-w-[80px] text-zinc-400">
                                      {item.sourceApp || 'Clipboard'}
                                    </span>
                                  </div>

                                  <span className="text-zinc-500 text-[9px] flex-shrink-0">
                                    {item.timestamp}
                                  </span>
                                </div>

                                {/* Quick Paste / Copy Hover Bar */}
                                <div className="absolute inset-x-0 bottom-0 py-1 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[10px] font-semibold text-white flex items-center gap-1">
                                    <CornerDownLeft className="w-2.5 h-2.5" /> Paste
                                  </span>
                                  <button
                                    onClick={(e) => handleCopy(item, e)}
                                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                    {isCopied ? 'Copied' : 'Copy'}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Shelf View Keyboard Shortcut Bar */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-white/10 text-zinc-300">↵</span> Paste
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-white/10 text-zinc-300">←→</span> Browse
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-white/10 text-zinc-300">Tab</span> Search View
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <span className="px-1 py-0.2 rounded bg-white/10 text-zinc-300">Esc</span> Close
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
