import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Sparkles,
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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCommand = recordingMode === 'command';
  const isRewrite = recordingMode === 'rewrite';
  const activeMode = isRecording ? 'recording' : superNotchMode;

  // 7 Equalizer Bars calculation for recording mode
  const bars = [0.35, 0.65, 0.95, 1.0, 0.85, 0.55, 0.35];

  const showStatus = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 2000);
  };

  // Smooth shelf open: expand window first, then animate container
  const openShelf = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    invoke('set_notch_expanded', { expanded: true }).catch(() => {});
    setSuperNotchMode('shelf');
    getCurrentWindow().setFocus().catch(() => {});
    const focusSearch = () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };
    setTimeout(focusSearch, 50);
    setTimeout(focusSearch, 150);
    setTimeout(focusSearch, 280);
  }, [setSuperNotchMode]);

  // Smooth shelf close: animate container collapse first, then shrink window
  const closeShelf = useCallback(() => {
    setSuperNotchMode('idle');
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      invoke('set_notch_expanded', { expanded: false }).catch(() => {});
    }, 280);
  }, [setSuperNotchMode]);

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
    closeShelf();
  };

  const handleOpenDashboard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    invoke('open_settings').catch(() => {});
    closeShelf();
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
          showStatus('Activating pixel loupe...');
          closeShelf();
          const hex = await invoke<string>('pick_screen_color');
          if (hex) {
            showStatus(`Sampled: ${hex}`);
          }
        } catch (e: any) {
          showStatus(e?.toString() || 'Color picker cancelled');
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
        showStatus('Pixel Ruler: Hover any UI border to snap');
      },
    },
    {
      id: 'cmd-voice',
      command: '/voice',
      title: 'Voice Dictation',
      subtitle: 'Trigger on-device Whisper speech-to-text',
      icon: Mic,
      action: () => {
        closeShelf();
        setTimeout(() => {
          invoke('toggle_recording').catch(() => {});
          setIsRecording(true);
        }, 150);
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
      title: 'DopeNotch Dashboard',
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
  ], [clipboardItems, closeShelf, handleOpenDashboard, setActiveClipboardCategory, setClipboardItems, setIsRecording, setSuperNotchHudView]);

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

  // Keep selection indexes in bounds
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
    }
  }, [activeMode, setClipboardItems]);

  // Listen for global shortcut toggle HUD event (Option+V / Cmd+Shift+V)
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    listen('murmur://toggle-hud', () => {
      if (superNotchMode === 'shelf') {
        closeShelf();
      } else {
        setSuperNotchHudView('search');
        openShelf();
      }
    }).then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [superNotchMode, openShelf, closeShelf, setSuperNotchHudView]);

  // Auto-close notch on blur (window losing focus) with safety grace period
  useEffect(() => {
    if (activeMode !== 'shelf') return;

    const mountedAt = Date.now();
    const handleBlur = () => {
      // Allow 400ms grace period so initial window focus doesn't falsely trigger blur
      if (Date.now() - mountedAt < 400) return;
      closeShelf();
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [activeMode, closeShelf]);

  // Master Keyboard Navigation (Arrows, Tab, Enter, Esc)
  useEffect(() => {
    if (activeMode !== 'shelf') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeShelf();
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
          if (searchSelectedIndex < searchResults.commands.length) {
            const cmd = searchResults.commands[searchSelectedIndex];
            if (cmd) cmd.action();
          } else {
            const clipIdx = searchSelectedIndex - searchResults.commands.length;
            const clip = searchResults.clips[clipIdx];
            if (clip) handlePaste(clip.content);
          }
        }
      }

      // PAGE 2: HORIZONTAL SHELF KEYBOARD CONTROLS
      if (superNotchHudView === 'shelf') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setShelfSelectedIndex((prev) =>
            prev < filteredShelfItems.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setShelfSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const item = filteredShelfItems[shelfSelectedIndex];
          if (item) handlePaste(item.content);
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
    closeShelf,
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

  const categories: { id: ClipboardCategory | 'pinned'; label: string; count: number }[] = [
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
      {/* Click-outside backdrop to auto-close shelf */}
      {activeMode === 'shelf' && (
        <div
          className="fixed inset-0 pointer-events-auto z-0"
          onClick={closeShelf}
        />
      )}

      {/* ========================================================================= */}
      {/* UNIFIED MORPHING DYNAMIC ISLAND NOTCH CONTAINER                          */}
      {/* ========================================================================= */}
      <motion.div
        layout
        initial={false}
        animate={{
          width: activeMode === 'shelf' ? 740 : activeMode === 'recording' ? 360 : 184,
          height: activeMode === 'shelf' ? 420 : activeMode === 'recording' ? 58 : 34,
          borderRadius: activeMode === 'shelf' ? '0 0 24px 24px' : activeMode === 'recording' ? '0 0 20px 20px' : '0 0 16px 16px',
        }}
        transition={{
          type: 'spring',
          stiffness: 420,
          damping: 32,
          mass: 0.8,
        }}
        onWheel={handleWheel}
        onClick={(e) => {
          if (activeMode === 'idle') {
            e.stopPropagation();
            openShelf();
          }
        }}
        className={`pointer-events-auto relative z-10 flex flex-col items-center overflow-hidden select-none transition-shadow ${
          activeMode === 'shelf'
            ? 'bg-[#0e0e11]/95 backdrop-blur-3xl border-x border-b border-white/[0.08] shadow-[0_28px_70px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)]'
            : activeMode === 'recording'
            ? 'bg-[#0a0a0c] border-x border-b border-white/[0.1] shadow-[0_12px_36px_rgba(0,0,0,0.8)]'
            : 'bg-black cursor-pointer hover:shadow-[0_4px_16px_rgba(245,158,11,0.25)] border-x border-b border-black'
        }`}
      >
        <AnimatePresence mode="wait">
          {/* 1. IDLE NOTCH VIEW */}
          {activeMode === 'idle' && (
            <motion.div
              key="idle-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex items-center justify-between px-3.5 group"
              title="Click or press ⌥V to open DopeNotch Search & Shelf"
            >
              {/* Left ambient lens */}
              <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08] border border-white/[0.05]" />
              
              {/* Center subtle label & audio dot */}
              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/90 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="text-[11px] font-medium tracking-tight text-zinc-300">DopeNotch</span>
              </div>

              {/* Right acoustic sensor */}
              <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08] border border-white/[0.05]" />
            </motion.div>
          )}

          {/* 2. RECORDING NOTCH VIEW */}
          {activeMode === 'recording' && (
            <motion.div
              key="recording-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full px-5 py-2 flex flex-col items-center justify-between"
            >
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
                            ? 'bg-rose-400'
                            : isRewrite
                            ? 'bg-sky-400'
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
                      ? 'text-rose-400'
                      : isRewrite
                      ? 'text-sky-400'
                      : 'text-amber-400'
                  }`}
                >
                  {isCommand ? 'Command' : isRewrite ? 'Rewrite' : 'Dictate'}
                </span>
              </div>

              <div className="w-full text-center px-2">
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
            </motion.div>
          )}

          {/* 3. EXPANDED HUD VIEW (RAYCAST FAST SEARCH & SUPASTE SHELF) */}
          {activeMode === 'shelf' && (
            <motion.div
              key="shelf-view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="w-full h-full p-3.5 flex flex-col justify-between text-[#ededed]"
            >
              {/* TOP HEADER: Clean Search Input + Minimal Glass Segmented Control */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                {/* Search Input Box */}
                <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] focus-within:border-white/[0.2] focus-within:bg-white/[0.07] rounded-xl px-3 py-1.5 flex-1 max-w-[360px] transition-all">
                  <Search className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
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
                    className="w-full bg-transparent border-none text-[13px] text-white placeholder:text-zinc-500 focus:outline-none pointer-events-auto select-text cursor-text font-normal"
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

                {/* Minimalist Segmented View Switcher (Search vs Shelf) */}
                <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
                  <button
                    onClick={() => setSuperNotchHudView('search')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      superNotchHudView === 'search'
                        ? 'bg-white/[0.14] text-white shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Search className="w-3 h-3" />
                    <span>Search</span>
                  </button>
                  <button
                    onClick={() => setSuperNotchHudView('shelf')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      superNotchHudView === 'shelf'
                        ? 'bg-white/[0.14] text-white shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Shelf</span>
                    <span className="text-[10px] text-zinc-400 font-mono">({clipboardItems.length})</span>
                  </button>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1">
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
                    className={`p-1.5 rounded-lg transition-colors ${
                      activeClipboardCategory === 'pinned'
                        ? 'bg-amber-400/20 text-amber-400'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                    title="Toggle Pinned View"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={handleOpenDashboard}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                    title="Open Dashboard"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={closeShelf}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                    title="Close (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ================================================================= */}
              {/* VIEW 1: FAST SEARCH & RAYCAST COMMAND LIST                        */}
              {/* ================================================================= */}
              {superNotchHudView === 'search' && (
                <div className="flex-1 flex flex-col justify-between pt-2 overflow-hidden">
                  {/* Search Results List */}
                  <div
                    ref={searchListScrollRef}
                    className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1 max-h-[305px]"
                  >
                    {searchResults.totalCount === 0 ? (
                      <div className="py-16 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-1.5">
                        <Sparkles className="w-5 h-5 text-zinc-600 mb-1" />
                        <p className="font-medium text-zinc-400">No matching tools or clips</p>
                        <p className="text-[11px] text-zinc-600">
                          Type <span className="font-mono text-zinc-400">/</span> to browse tools, or swipe horizontally to view the shelf.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Section: Tool Commands */}
                        {searchResults.commands.length > 0 && (
                          <div className="mb-2.5">
                            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 px-2 py-1">
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
                                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-white/[0.1] text-white shadow-sm'
                                      : 'hover:bg-white/[0.04] text-zinc-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] text-amber-400/90 flex items-center justify-center flex-shrink-0">
                                      <CmdIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="font-mono text-[12px] font-semibold text-amber-400/90">
                                        {cmd.command}
                                      </span>
                                      <span className="text-[13px] font-medium text-white/95">
                                        {cmd.title}
                                      </span>
                                      <span className="text-[11.5px] text-zinc-400 truncate hidden md:inline">
                                        {cmd.subtitle}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.06]">
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
                            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 px-2 py-1">
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
                                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-white/[0.1] text-white shadow-sm'
                                      : 'hover:bg-white/[0.04] text-zinc-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {/* Category Icon Badge */}
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.06] border border-white/[0.08] ${
                                        item.category === 'dictation'
                                          ? 'text-amber-400'
                                          : item.category === 'code'
                                          ? 'text-sky-400'
                                          : item.category === 'link'
                                          ? 'text-blue-400'
                                          : 'text-zinc-400'
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
                                      className={`text-[12.5px] truncate max-w-[440px] ${
                                        item.category === 'code'
                                          ? 'font-mono text-zinc-200'
                                          : 'text-zinc-200'
                                      }`}
                                    >
                                      {item.content.replace(/\n+/g, ' ')}
                                    </span>
                                  </div>

                                  {/* Source & Timestamp */}
                                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-3">
                                    {item.isPinned && (
                                      <Pin className="w-3 h-3 text-amber-400 fill-current" />
                                    )}
                                    <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[80px] bg-white/[0.04] px-1.5 py-0.5 rounded">
                                      {item.sourceApp || 'Clip'}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-mono">
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

                  {/* Raycast Keyboard Footer */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-zinc-300 font-mono text-[10px]">↵</kbd>
                        <span>Paste</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-zinc-300 font-mono text-[10px]">↑↓</kbd>
                        <span>Select</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-zinc-300 font-mono text-[10px]">Tab</kbd>
                        <span>Shelf View</span>
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-zinc-300 font-mono text-[10px]">Esc</kbd>
                      <span>Close</span>
                    </span>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* VIEW 2: HORIZONTAL VISUAL SHELF                                   */}
              {/* ================================================================= */}
              {superNotchHudView === 'shelf' && (
                <div className="flex-1 flex flex-col justify-between pt-2 overflow-hidden">
                  {/* Category Filter Pills */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      {categories.map((cat) => {
                        const isActive = activeClipboardCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setActiveClipboardCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] transition-all whitespace-nowrap ${
                              isActive
                                ? 'bg-white text-black font-semibold shadow-sm'
                                : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span
                              className={`text-[9.5px] font-mono ${
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
                      Swipe trackpad or use ←→ arrows
                    </span>
                  </div>

                  {/* Horizontal Shelf Stream */}
                  <div
                    ref={shelfScrollRef}
                    className="flex flex-row gap-3 overflow-x-auto no-scrollbar py-1 px-1 items-stretch max-h-[260px] flex-1"
                  >
                    {filteredShelfItems.length === 0 ? (
                      <div className="w-full py-16 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-1">
                        <Layers className="w-5 h-5 text-zinc-600 mb-1" />
                        <p className="font-medium text-zinc-400">No clips found</p>
                        <p className="text-[11px] text-zinc-600">
                          Copy items to your clipboard or dictate speech to see them here.
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
                            className={`w-[168px] min-w-[168px] h-[245px] rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-150 cursor-pointer select-none group relative overflow-hidden ${
                              isColor
                                ? 'border border-white/20'
                                : isSelected
                                ? 'bg-white/[0.1] border border-white/25 shadow-lg'
                                : 'bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.12]'
                            }`}
                            style={
                              isColor
                                ? { backgroundColor: item.content }
                                : undefined
                            }
                          >
                            {/* Hover Actions Bar */}
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinClipboardItem(item.id);
                                }}
                                className={`p-1 rounded-md bg-black/60 backdrop-blur-md transition-colors ${
                                  item.isPinned ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
                                }`}
                                title={item.isPinned ? 'Unpin' : 'Pin'}
                              >
                                <Pin className="w-3 h-3 fill-current" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteClipboardItem(item.id);
                                }}
                                className="p-1 rounded-md bg-black/60 backdrop-blur-md text-zinc-400 hover:text-rose-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Card Body */}
                            {isColor ? (
                              <div className="flex-1 flex flex-col justify-end">
                                <span className="text-xs font-mono font-bold text-white bg-black/60 px-2 py-1 rounded-md backdrop-blur-md self-start">
                                  {item.content}
                                </span>
                              </div>
                            ) : (
                              <div className="flex-1 overflow-hidden pr-1">
                                {item.category === 'dictation' && (
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider font-mono">
                                      Dictation
                                    </span>
                                  </div>
                                )}
                                <p
                                  className={`text-[12.5px] leading-relaxed line-clamp-6 ${
                                    item.category === 'code'
                                      ? 'font-mono text-zinc-300 text-[11.5px]'
                                      : 'text-[#ededed] font-sans'
                                  }`}
                                >
                                  {item.content}
                                </p>
                              </div>
                            )}

                            {/* Card Footer */}
                            <div className="flex items-center justify-between text-[10.5px] text-zinc-400 pt-2 border-t border-white/[0.06] font-mono">
                              <span className="truncate max-w-[85px] text-zinc-400">
                                {item.sourceApp || 'Clipboard'}
                              </span>
                              <span className="text-zinc-500 text-[10px] flex-shrink-0">
                                {item.timestamp}
                              </span>
                            </div>

                            {/* Quick Paste / Copy Hover Bar */}
                            <div className="absolute inset-x-0 bottom-0 py-1.5 bg-black/80 backdrop-blur-md flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[11px] font-medium text-white flex items-center gap-1">
                                <CornerDownLeft className="w-3 h-3" /> Paste
                              </span>
                              <button
                                onClick={(e) => handleCopy(item, e)}
                                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                {isCopied ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Shelf Keyboard Footer */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-zinc-300 font-mono text-[10px]">↵</kbd>
                        <span>Paste</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-zinc-300 font-mono text-[10px]">←→</kbd>
                        <span>Browse</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-zinc-300 font-mono text-[10px]">Tab</kbd>
                        <span>Search View</span>
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-zinc-300 font-mono text-[10px]">Esc</kbd>
                      <span>Close</span>
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
