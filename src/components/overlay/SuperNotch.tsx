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
  LayoutGrid,
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
  const isSearch = superNotchHudView === 'search';

  // 7 Equalizer Bars calculation for recording mode
  const bars = [0.35, 0.65, 0.95, 1.0, 0.85, 0.55, 0.35];

  const showStatus = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 2000);
  };

  // Target window dimensions for each state (fixed 860px width for both views, only height toggles)
  const getExpandedDimensions = useCallback((view: 'shelf' | 'search') => {
    if (view === 'search') {
      return { width: 860, height: 410 };
    }
    return { width: 860, height: 220 };
  }, []);

  // Smooth shelf open: expand window first, then animate container
  const openShelf = useCallback((targetView?: 'shelf' | 'search') => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const view = targetView || superNotchHudView;
    const dims = getExpandedDimensions(view);

    invoke('set_notch_expanded', {
      expanded: true,
      width: dims.width,
      height: dims.height,
    }).catch(() => {});

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
  }, [getExpandedDimensions, setSuperNotchMode, superNotchHudView]);

  // Smooth shelf close: animate container collapse first, then shrink window
  const closeShelf = useCallback(() => {
    setSuperNotchMode('idle');
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      invoke('set_notch_expanded', {
        expanded: false,
        width: 160,
        height: 28,
      }).catch(() => {});
    }, 250);
  }, [setSuperNotchMode]);

  // Switch between Shelf (SuPaste) and Search (Raycast) views
  const handleToggleView = (newView: 'shelf' | 'search') => {
    setSuperNotchHudView(newView);
    const dims = getExpandedDimensions(newView);
    invoke('set_notch_expanded', {
      expanded: true,
      width: dims.width,
      height: dims.height,
    }).catch(() => {});
  };

  const handleCopy = (item: ClipboardItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    showStatus('Copied');
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

  // Built-in Extensions & Tools
  const toolCommands = useMemo(() => [
    {
      id: 'cmd-color',
      command: '/color',
      title: 'Screen Color Eyedropper',
      subtitle: 'Native macOS pixel magnifying loupe • copies hex',
      icon: Pipette,
      action: async () => {
        try {
          showStatus('Pixel Loupe Active...');
          closeShelf();
          const hex = await invoke<string>('pick_screen_color');
          if (hex) {
            showStatus(`Sampled ${hex}`);
          }
        } catch (e: any) {
          showStatus(e?.toString() || 'Picker cancelled');
        }
      },
    },
    {
      id: 'cmd-ruler',
      command: '/ruler',
      title: 'Pixel Distance Ruler',
      subtitle: 'Screen laser measurement for margins & padding',
      icon: Ruler,
      action: () => {
        closeShelf();
        setTimeout(() => {
          invoke('open_ruler').catch(() => {});
        }, 120);
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
      title: 'SuPaste Card Shelf',
      subtitle: 'Switch to horizontal clipboard card view',
      icon: LayoutGrid,
      action: () => {
        handleToggleView('shelf');
      },
    },
    {
      id: 'cmd-pinned',
      command: '/pinned',
      title: 'Starred & Pinned Clips',
      subtitle: 'Filter history by saved items',
      icon: Star,
      action: () => {
        setActiveClipboardCategory('pinned');
        handleToggleView('shelf');
      },
    },
    {
      id: 'cmd-settings',
      command: '/settings',
      title: 'DopeNotch Dashboard',
      subtitle: 'Preferences, whisper engines & shortcuts',
      icon: Settings,
      action: () => {
        handleOpenDashboard();
      },
    },
    {
      id: 'cmd-clear',
      command: '/clear',
      title: 'Clear Unpinned History',
      subtitle: 'Prune non-pinned items from local storage',
      icon: Trash2,
      action: () => {
        invoke('clear_clipboard_history').catch(() => {});
        setClipboardItems(clipboardItems.filter((i) => i.isPinned));
        showStatus('Pruned unpinned items');
      },
    },
  ], [clipboardItems, closeShelf, handleOpenDashboard, setActiveClipboardCategory, setClipboardItems, setIsRecording]);

  // Combined fast search results
  const searchResults = useMemo(() => {
    const q = clipboardSearchQuery.trim().toLowerCase();
    const isSlash = q.startsWith('/');

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

  // Filtered shelf items by category
  const filteredShelfItems = useMemo(() => {
    let items = clipboardItems;
    if (activeClipboardCategory === 'pinned') {
      items = items.filter((i) => i.isPinned);
    } else if (activeClipboardCategory !== 'all') {
      items = items.filter((i) => i.category === activeClipboardCategory);
    }
    if (clipboardSearchQuery.trim()) {
      const q = clipboardSearchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.content.toLowerCase().includes(q) ||
          (i.sourceApp && i.sourceApp.toLowerCase().includes(q))
      );
    }
    return items;
  }, [clipboardItems, activeClipboardCategory, clipboardSearchQuery]);

  // Category items with counts (1:1 with SuPaste Screenshot)
  const categories: { id: ClipboardCategory; label: string; count: number }[] = useMemo(() => {
    return [
      { id: 'all', label: 'All', count: clipboardItems.length },
      {
        id: 'dictation',
        label: 'Dictations',
        count: clipboardItems.filter((i) => i.category === 'dictation').length,
      },
      {
        id: 'code',
        label: 'Code',
        count: clipboardItems.filter((i) => i.category === 'code').length,
      },
      {
        id: 'link',
        label: 'Links',
        count: clipboardItems.filter((i) => i.category === 'link').length,
      },
      {
        id: 'color',
        label: 'Colors',
        count: clipboardItems.filter((i) => i.category === 'color').length,
      },
      {
        id: 'pinned',
        label: 'Pinned',
        count: clipboardItems.filter((i) => i.isPinned).length,
      },
    ];
  }, [clipboardItems]);

  // Listen for backend toggle events
  useEffect(() => {
    const unlistenToggle = listen('murmur://toggle-shelf', () => {
      if (activeMode === 'shelf') {
        closeShelf();
      } else {
        openShelf();
      }
    });

    const unlistenOpen = listen('murmur://open-shelf', () => {
      openShelf();
    });

    return () => {
      unlistenToggle.then((f) => f());
      unlistenOpen.then((f) => f());
    };
  }, [activeMode, closeShelf, openShelf]);

  // Keyboard navigation inside Notch
  useEffect(() => {
    if (activeMode !== 'shelf') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeShelf();
        return;
      }

      // Switch views on Tab
      if (e.key === 'Tab') {
        e.preventDefault();
        handleToggleView(superNotchHudView === 'shelf' ? 'search' : 'shelf');
        return;
      }

      if (superNotchHudView === 'search') {
        const total = searchResults.commands.length + searchResults.clips.length;
        if (total === 0) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSearchSelectedIndex((prev) => (prev + 1) % total);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSearchSelectedIndex((prev) => (prev - 1 + total) % total);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (searchSelectedIndex < searchResults.commands.length) {
            searchResults.commands[searchSelectedIndex].action();
          } else {
            const clipIdx = searchSelectedIndex - searchResults.commands.length;
            const clip = searchResults.clips[clipIdx];
            if (clip) handlePaste(clip.content);
          }
        }
      } else {
        // Shelf view navigation with arrows
        const count = filteredShelfItems.length;
        if (count === 0) return;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIdx = Math.min(count - 1, shelfSelectedIndex + 1);
          setShelfSelectedIndex(nextIdx);
          shelfScrollRef.current?.children[nextIdx]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIdx = Math.max(0, shelfSelectedIndex - 1);
          setShelfSelectedIndex(prevIdx);
          shelfScrollRef.current?.children[prevIdx]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
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
    closeShelf,
    filteredShelfItems,
    handlePaste,
    handleToggleView,
    searchResults,
    searchSelectedIndex,
    shelfSelectedIndex,
    superNotchHudView,
  ]);

  // Horizontal wheel scroll handler for shelf
  const handleWheel = (e: React.WheelEvent) => {
    if (activeMode === 'shelf' && superNotchHudView === 'shelf' && shelfScrollRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        shelfScrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Dimensions based on state (fixed 860px width for both shelf & search views)
  const targetWidth =
    activeMode === 'shelf'
      ? 860
      : activeMode === 'recording'
      ? 340
      : 160;

  const targetHeight =
    activeMode === 'shelf'
      ? isSearch
        ? 410
        : 220
      : activeMode === 'recording'
      ? 44
      : 28;

  const targetRadius =
    activeMode === 'shelf'
      ? '0 0 24px 24px'
      : activeMode === 'recording'
      ? '0 0 18px 18px'
      : '0 0 14px 14px';

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none flex flex-col items-center select-none overflow-visible bg-transparent">
      {/* Click-outside backdrop to auto-close shelf */}
      {activeMode === 'shelf' && (
        <div
          className="fixed inset-0 pointer-events-auto z-0"
          onClick={closeShelf}
        />
      )}

      {/* ========================================================================= */}
      {/* UNIFIED MORPHING DYNAMIC ISLAND (PURE JET BLACK #000000 MATCHING MACBOOK) */}
      {/* ========================================================================= */}
      <motion.div
        layout
        initial={false}
        animate={{
          width: targetWidth,
          height: targetHeight,
        }}
        transition={{
          type: 'spring',
          stiffness: 440,
          damping: 34,
          mass: 0.8,
        }}
        onWheel={handleWheel}
        onClick={(e) => {
          if (activeMode === 'idle') {
            e.stopPropagation();
            openShelf();
          }
        }}
        className="pointer-events-auto relative z-10 flex flex-col items-center select-none"
      >
        {/* Top Left Ear (Concave Fillet connecting seamlessly to top screen bezel) */}
        <svg
          width={activeMode === 'shelf' ? 18 : 10}
          height={activeMode === 'shelf' ? 18 : 10}
          viewBox={activeMode === 'shelf' ? '0 0 18 18' : '0 0 10 10'}
          className={`absolute top-0 pointer-events-none fill-black z-20 ${
            activeMode === 'shelf' ? '-left-[18px]' : '-left-[10px]'
          }`}
        >
          {activeMode === 'shelf' ? (
            <path d="M 0 0 H 18 V 18 C 18 8.059 9.941 0 0 0 Z" />
          ) : (
            <path d="M 0 0 H 10 V 10 C 10 4.477 5.523 0 0 0 Z" />
          )}
        </svg>

        {/* Top Right Ear (Concave Fillet connecting seamlessly to top screen bezel) */}
        <svg
          width={activeMode === 'shelf' ? 18 : 10}
          height={activeMode === 'shelf' ? 18 : 10}
          viewBox={activeMode === 'shelf' ? '0 0 18 18' : '0 0 10 10'}
          className={`absolute top-0 pointer-events-none fill-black z-20 ${
            activeMode === 'shelf' ? '-right-[18px]' : '-right-[10px]'
          }`}
        >
          {activeMode === 'shelf' ? (
            <path d="M 18 0 H 0 V 18 C 0 8.059 8.059 0 18 0 Z" />
          ) : (
            <path d="M 10 0 H 0 V 10 C 0 4.477 4.477 0 10 0 Z" />
          )}
        </svg>

        {/* Main Notch Body Container */}
        <div
          style={{ borderRadius: targetRadius }}
          className={`w-full h-full flex flex-col items-center overflow-hidden bg-black transition-shadow ${
            activeMode === 'shelf'
              ? 'shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-x border-b border-white/[0.08]'
              : activeMode === 'recording'
              ? 'shadow-[0_10px_30px_rgba(0,0,0,0.85)] border-x border-b border-white/[0.1]'
              : 'cursor-pointer border-none'
          }`}
        >
          <AnimatePresence mode="wait">
          {/* 1. IDLE NOTCH VIEW (Pure Hardware Bezel - ZERO TEXT, ZERO DOTS) */}
          {activeMode === 'idle' && (
            <motion.div
              key="idle-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="w-full h-full cursor-pointer bg-black"
              title="Click or press ⌥V to open SuPaste shelf"
            />
          )}

          {/* 2. RECORDING NOTCH VIEW (Sleek Audio Waveform) */}
          {activeMode === 'recording' && (
            <motion.div
              key="recording-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full px-4 flex items-center justify-between bg-black text-[#ededed]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-[2px] h-3.5">
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

              <div className="flex-1 px-3 truncate text-center">
                <span className="text-xs text-zinc-300 font-mono">
                  {streamingText || 'Listening...'}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  invoke('toggle_recording').catch(() => {});
                  setIsRecording(false);
                }}
                className="w-5 h-5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                title="Stop recording"
              >
                <div className="w-2 h-2 rounded-sm bg-rose-400" />
              </button>
            </motion.div>
          )}

          {/* 3. EXPANDED SHELF / RAYCAST SEARCH NOTCH */}
          {activeMode === 'shelf' && (
            <motion.div
              key="shelf-view"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="w-full h-full p-3 flex flex-col justify-between text-[#ededed] bg-black"
            >
              {/* TOP HEADER: Clean Minimal Search + Unboxed Icon Toggles (1:1 with SuPaste) */}
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/[0.08]">
                {/* Left: Roomy Search Bar + Action Toggles positioned immediately after it */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.08] focus-within:bg-white/[0.09] focus-within:ring-1 focus-within:ring-white/20 rounded-xl px-3.5 h-10 w-[300px] transition-all">
                    <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search..."
                      value={clipboardSearchQuery}
                      onChange={(e) => {
                        setClipboardSearchQuery(e.target.value);
                        if (e.target.value.startsWith('/') && superNotchHudView !== 'search') {
                          handleToggleView('search');
                        }
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full bg-transparent border-none text-[13px] text-white placeholder:text-zinc-500 focus:outline-none select-text cursor-text font-normal"
                    />
                    {clipboardSearchQuery && (
                      <button
                        onClick={() => setClipboardSearchQuery('')}
                        className="text-zinc-500 hover:text-white text-xs cursor-pointer p-0.5"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Unboxed Action Icons right after the search bar (1:1 with SuPaste) */}
                  <div className="flex items-center gap-1 ml-1">
                    {/* Star / Pinned Toggle */}
                    <button
                      onClick={() =>
                        setActiveClipboardCategory(
                          activeClipboardCategory === 'pinned' ? 'all' : 'pinned'
                        )
                      }
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        activeClipboardCategory === 'pinned'
                          ? 'text-amber-400 bg-white/10'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="Favorites"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>

                    {/* View Mode Switcher (Grid / Shelf vs Search List) */}
                    <button
                      onClick={() =>
                        handleToggleView(
                          superNotchHudView === 'shelf' ? 'search' : 'shelf'
                        )
                      }
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        superNotchHudView === 'search'
                          ? 'text-white bg-white/10'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                      title={
                        superNotchHudView === 'shelf'
                          ? 'Switch to Raycast Search (Tab)'
                          : 'Switch to SuPaste Shelf (Tab)'
                      }
                    >
                      {superNotchHudView === 'shelf' ? (
                        <LayoutGrid className="w-4 h-4" />
                      ) : (
                        <Layers className="w-4 h-4" />
                      )}
                    </button>

                    {/* Open Dashboard */}
                    <button
                      onClick={handleOpenDashboard}
                      className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      title="Open Dashboard"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Side: Status Feedback & Close Button */}
                <div className="flex items-center gap-2">
                  {statusFeedback && (
                    <span className="text-[11px] text-zinc-400 font-mono pr-2 truncate max-w-[140px]">
                      {statusFeedback}
                    </span>
                  )}

                  {/* Close Notch */}
                  <button
                    onClick={closeShelf}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ================================================================= */}
              {/* VIEW A: SUPASTE HORIZONTAL VISUAL SHELF (1:1 with Screenshot 1)  */}
              {/* ================================================================= */}
              {superNotchHudView === 'shelf' && (
                <div className="flex-1 flex flex-col justify-between pt-1.5 overflow-hidden">
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1.5">
                    {categories.map((cat) => {
                      const isActive = activeClipboardCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveClipboardCategory(cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] transition-all whitespace-nowrap cursor-pointer ${
                            isActive
                              ? 'bg-white text-black font-semibold shadow-sm'
                              : 'bg-[#18181c] text-zinc-400 hover:text-white'
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

                  {/* Compact Horizontal Shelf Stream (140px x 105px cards) */}
                  <div
                    ref={shelfScrollRef}
                    className="flex flex-row gap-2.5 overflow-x-auto py-1 px-0.5 items-stretch flex-1 custom-slim-scrollbar"
                  >
                    {filteredShelfItems.length === 0 ? (
                      <div className="w-full py-8 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-1">
                        <p className="font-medium text-zinc-400">No clips found</p>
                        <p className="text-[11px] text-zinc-600">
                          Copy text, code or links to see them on the shelf.
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
                            className={`w-[140px] min-w-[140px] h-[105px] rounded-xl p-2.5 flex flex-col justify-between transition-all duration-100 cursor-pointer select-none group relative overflow-hidden ${
                              isColor
                                ? 'border border-white/20'
                                : isSelected
                                ? 'bg-[#1e1e22] border border-white/30 shadow-md'
                                : 'bg-[#141416] border border-white/[0.08] hover:bg-[#1a1a1e] hover:border-white/20'
                            }`}
                            style={
                              isColor
                                ? { backgroundColor: item.content }
                                : undefined
                            }
                          >
                            {/* Hover Quick Action Buttons */}
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinClipboardItem(item.id);
                                }}
                                className={`p-1 rounded bg-black/70 backdrop-blur-md transition-colors ${
                                  item.isPinned
                                    ? 'text-amber-400'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                                title={item.isPinned ? 'Unpin' : 'Pin'}
                              >
                                <Pin className="w-2.5 h-2.5 fill-current" />
                              </button>

                              <button
                                onClick={(e) => handleCopy(item, e)}
                                className={`p-1 rounded bg-black/70 backdrop-blur-md transition-colors ${
                                  isCopied ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
                                }`}
                                title="Copy"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteClipboardItem(item.id);
                                }}
                                className="p-1 rounded bg-black/70 backdrop-blur-md text-zinc-400 hover:text-rose-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            {/* Card Content Body */}
                            {isColor ? (
                              <div className="flex-1 flex flex-col justify-end">
                                <span className="text-[11px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-md self-start">
                                  {item.content}
                                </span>
                              </div>
                            ) : (
                              <div className="flex-1 overflow-hidden pr-0.5">
                                <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono mb-1">
                                  {item.category === 'dictation' ? (
                                    <Mic className="w-2.5 h-2.5 text-amber-400" />
                                  ) : item.category === 'code' ? (
                                    <Code className="w-2.5 h-2.5 text-zinc-400" />
                                  ) : item.category === 'link' ? (
                                    <Link2 className="w-2.5 h-2.5 text-zinc-400" />
                                  ) : null}
                                  <span className="truncate max-w-[90px]">
                                    {item.sourceApp || 'Text'}
                                  </span>
                                </div>
                                <p
                                  className={`text-[11px] leading-tight line-clamp-2 ${
                                    item.category === 'code'
                                      ? 'font-mono text-zinc-300'
                                      : 'text-zinc-200'
                                  }`}
                                >
                                  {item.content}
                                </p>
                              </div>
                            )}

                            {/* Card Footer: Timestamp & Paste Overlay */}
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 font-mono">
                              <span>{item.timestamp}</span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium flex items-center gap-0.5">
                                <CornerDownLeft className="w-2.5 h-2.5" /> Paste
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* VIEW B: RAYCAST SEARCH VIEW (1:1 with Screenshots 2 & 3)         */}
              {/* ================================================================= */}
              {superNotchHudView === 'search' && (
                <div className="flex-1 flex flex-col justify-between pt-1 overflow-hidden">
                  {/* Results List */}
                  <div
                    ref={searchListScrollRef}
                    className="flex-1 overflow-y-auto custom-slim-scrollbar space-y-0.5 pr-1 max-h-[300px]"
                  >
                    {searchResults.totalCount === 0 ? (
                      <div className="py-12 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-1">
                        <Sparkles className="w-4 h-4 text-zinc-600 mb-1" />
                        <p className="font-medium text-zinc-400">No matching commands or clips</p>
                      </div>
                    ) : (
                      <>
                        {/* Section: Extensions & Tools */}
                        {searchResults.commands.length > 0 && (
                          <div className="mb-2">
                            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 px-2 py-1">
                              Extensions & Tools
                            </div>
                            {searchResults.commands.map((cmd, i) => {
                              const isSelected = searchSelectedIndex === i;
                              const CmdIcon = cmd.icon;
                              return (
                                <div
                                  key={cmd.id}
                                  onClick={() => cmd.action()}
                                  onMouseEnter={() => setSearchSelectedIndex(i)}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-white/[0.1] text-white shadow-sm'
                                      : 'hover:bg-white/[0.04] text-zinc-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-md bg-white/[0.06] text-zinc-300 flex items-center justify-center flex-shrink-0">
                                      <CmdIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="font-mono text-[11px] font-semibold text-zinc-200">
                                        {cmd.command}
                                      </span>
                                      <span className="text-xs font-medium text-white truncate">
                                        {cmd.title}
                                      </span>
                                      <span className="text-[11px] text-zinc-500 truncate hidden md:inline">
                                        {cmd.subtitle}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.2 rounded bg-white/[0.04]">
                                    Extension
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
                              Clipboard & Dictations
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
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-white/[0.1] text-white shadow-sm'
                                      : 'hover:bg-white/[0.04] text-zinc-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div
                                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-white/[0.06] text-zinc-400"
                                      style={isColor ? { backgroundColor: item.content } : undefined}
                                    >
                                      {item.category === 'dictation' ? (
                                        <Mic className="w-3 h-3 text-amber-400" />
                                      ) : item.category === 'code' ? (
                                        <Code className="w-3 h-3" />
                                      ) : item.category === 'link' ? (
                                        <Link2 className="w-3 h-3" />
                                      ) : isColor ? null : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </div>

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

                                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    {item.isPinned && (
                                      <Pin className="w-2.5 h-2.5 text-amber-400 fill-current" />
                                    )}
                                    <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[70px]">
                                      {item.sourceApp || 'Clip'}
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

                  {/* Raycast Keyboard Footer (1:1 with Images 2 & 3) */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-white/[0.06] font-mono">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">↵</kbd>
                        <span>Open</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">↑↓</kbd>
                        <span>Navigate</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">Tab</kbd>
                        <span>Shelf</span>
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">Esc</kbd>
                      <span>Close</span>
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </motion.div>
    </div>
  );
};
