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
  LayoutDashboard,
  Sparkles,
  ScanText,
  ZoomIn,
  Calculator,
  Wand2,
  Terminal,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  useAppStore,
  ClipboardCategory,
  ClipboardItem,
} from '../../stores/appStore';
import { WidgetsView } from './WidgetsView';
import { evaluateQuickCalc } from '../../services/quickCalc';
import { polishTextForChat } from '../../services/quickPrompt';

interface UserExtension {
  id: string;
  title: string;
  description: string;
  icon: string;
  mode: string;
  file_path: string;
  language: string;
  author?: string;
}

export const SuperNotch: React.FC = () => {
  const {
    isRecording,
    audioLevel,
    superNotchMode,
    superNotchHudView,
    orbTheme,
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
  const [userExtensions, setUserExtensions] = useState<UserExtension[]>([]);

  // In-Place /prompt & /fix live match (direct to chat box, zero friction)
  const promptLiveMatch = useMemo(() => {
    const query = clipboardSearchQuery.trim();
    const match = query.match(/^\/(?:prompt|fix|grammar)\s+(.+)$/i);
    if (!match) return null;
    const rawText = match[1];
    const polished = polishTextForChat(rawText);
    return {
      raw: rawText,
      polished,
    };
  }, [clipboardSearchQuery]);

  const loadExtensions = useCallback(async () => {
    try {
      const list = await invoke<UserExtension[]>('load_user_extensions');
      if (Array.isArray(list)) {
        setUserExtensions(list);
      }
    } catch (e) {
      console.error('Failed to load user extensions', e);
    }
  }, []);

  useEffect(() => {
    loadExtensions();
  }, [loadExtensions]);

  const quickCalcMatch = useMemo(() => {
    return evaluateQuickCalc(clipboardSearchQuery);
  }, [clipboardSearchQuery]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const shelfScrollRef = useRef<HTMLDivElement>(null);
  const searchListScrollRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedAtRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const activeMode = isRecording ? 'recording' : superNotchMode;

  const showStatus = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 2000);
  };

  // Target window dimensions for each state:
  // All standard tabs (shelf, widgets, and new tabs) have the EXACT same height (250px).
  // Only the Extensions tab ('search') expands to 410px to accommodate the command palette list.
  const getExpandedDimensions = useCallback((view: 'shelf' | 'search' | 'widgets') => {
    if (view === 'search') {
      return { width: 860, height: 410 };
    }
    return { width: 860, height: 250 };
  }, []);

  // Smooth shelf open: expand window first, then animate container
  const openShelf = useCallback((targetView?: 'shelf' | 'search' | 'widgets') => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    openedAtRef.current = Date.now();
    const view = targetView || superNotchHudView;
    if (targetView) {
      setSuperNotchHudView(targetView);
    }
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
  }, [getExpandedDimensions, setSuperNotchMode, superNotchHudView, setSuperNotchHudView]);

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

  const handleCopyCalcResult = useCallback(async () => {
    if (!quickCalcMatch) return;
    try {
      await navigator.clipboard.writeText(quickCalcMatch.result);
      invoke('paste_text_direct', { text: quickCalcMatch.result }).catch(() => {});
      showStatus(`Copied: ${quickCalcMatch.result}`);
      closeShelf();
    } catch {}
  }, [quickCalcMatch, closeShelf]);

  // Switch between Shelf (SuPaste), Search (Raycast), and Widgets views
  const handleToggleView = (newView: 'shelf' | 'search' | 'widgets') => {
    setSuperNotchHudView(newView);
    const dims = getExpandedDimensions(newView);
    invoke('set_notch_expanded', {
      expanded: true,
      width: dims.width,
      height: dims.height,
    }).catch(() => {});
  };

  const handleCopy = async (item: ClipboardItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.category === 'image') {
      try {
        await invoke('paste_image_direct', { base64Data: item.content });
      } catch {
        // Fallback
      }
    } else {
      navigator.clipboard.writeText(item.content);
    }
    setCopiedId(item.id);
    showStatus('Copied');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePaste = async (itemOrText: ClipboardItem | string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isItem = typeof itemOrText === 'object';
    const isImage = isItem && itemOrText.category === 'image';
    const content = isItem ? itemOrText.content : itemOrText;

    try {
      if (isImage) {
        await invoke('paste_image_direct', { base64Data: content });
      } else {
        await invoke('paste_text_direct', { text: content });
      }
    } catch {
      if (!isImage) {
        await navigator.clipboard.writeText(content);
      }
    }
    closeShelf();
  };

  const handleOpenDashboard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    invoke('open_settings').catch(() => {});
    closeShelf();
  };

  // Instant In-Place Chat Text & Grammar Polish Handler (Zero friction, auto-pastes to chat)
  const handleInstantPromptPolish = useCallback(async (sourceText?: string) => {
    try {
      let text = sourceText;
      if (!text) {
        try {
          const cb = await navigator.clipboard.readText();
          if (cb && cb.trim()) text = cb.trim();
        } catch {}
      }
      if (!text) {
        const latestClip = clipboardItems.find(
          (i) => i.category === 'clipboard' || i.category === 'code' || i.category === 'dictation'
        );
        if (latestClip) text = latestClip.content;
      }
      if (!text || !text.trim()) {
        showStatus('Copy text first or type /prompt <text>');
        return;
      }
      const polished = polishTextForChat(text);
      closeShelf();
      await invoke('paste_text_direct', { text: polished });
      showStatus('Fixed & pasted to chat!');
    } catch (e: any) {
      showStatus(e?.toString() || 'Polish failed');
    }
  }, [clipboardItems, closeShelf]);

  // Built-in Extensions & Tools
  const toolCommands = useMemo(() => [
    {
      id: 'cmd-ocr',
      command: '/ocr',
      title: 'Screen Text Grabber',
      subtitle: 'Drag selection box over any screen area or video to copy text (On-Device)',
      icon: ScanText,
      action: async () => {
        try {
          showStatus('Select area on screen...');
          closeShelf();
          const text = await invoke<string>('grab_screen_ocr');
          if (text && text.trim()) {
            showStatus(`Copied ${text.trim().split(/\s+/).length} words!`);
          } else {
            showStatus('OCR cancelled');
          }
        } catch (e: any) {
          showStatus(e?.toString() || 'OCR failed');
        }
      },
    },
    {
      id: 'cmd-loupe',
      command: '/loupe',
      title: 'Screen Zoom Loupe',
      subtitle: 'Pinch-to-zoom (1.5x–8x) lens with live RGB & HEX sampler',
      icon: ZoomIn,
      action: () => {
        closeShelf();
        setTimeout(() => {
          invoke('open_loupe').catch(() => {});
        }, 120);
      },
    },
    {
      id: 'cmd-calc',
      command: '/calc',
      title: 'Quick Unit & Currency Converter',
      subtitle: 'Inline conversions: 16px to rem, 120 usd to eur, 45*12, 72f to c',
      icon: Calculator,
      action: () => {
        setClipboardSearchQuery('/calc ');
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      },
    },
    {
      id: 'cmd-prompt',
      command: '/prompt',
      title: 'Instant Fix & Paste to Chat',
      subtitle: 'Auto-corrects typos & grammar, then pastes directly into active chat',
      icon: Wand2,
      action: () => {
        handleInstantPromptPolish();
      },
    },
    {
      id: 'cmd-color',
      command: '/color',
      title: 'Screen Color Eyedropper',
      subtitle: 'Zoom loupe eyedropper • copies hex & adds to shelf',
      icon: Pipette,
      action: () => {
        closeShelf();
        setTimeout(() => {
          invoke('open_loupe').catch(() => {});
        }, 120);
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
      id: 'cmd-widgets',
      command: '/widgets',
      title: 'Widgets & Vitals',
      subtitle: 'Live hardware vitals, now playing & focus timer',
      icon: LayoutDashboard,
      action: () => {
        handleToggleView('widgets');
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
    // User-Authored Extensions (~/.dopenotch/extensions/)
    ...userExtensions.map((ext) => ({
      id: ext.id,
      command: `/${ext.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      title: ext.title,
      subtitle: `${ext.description} • ${ext.language}`,
      icon: Terminal,
      isUserExtension: true,
      userIcon: ext.icon,
      action: async () => {
        try {
          showStatus(`Running ${ext.title}...`);
          const output = await invoke<string>('execute_user_extension', {
            filePath: ext.file_path,
            mode: ext.mode,
          });
          if (ext.mode === 'clipboard' || ext.mode === 'silent') {
            showStatus(`Copied output to shelf!`);
          } else {
            showStatus(`Result: ${output.slice(0, 30)}`);
          }
        } catch (err: any) {
          showStatus(`Error: ${err?.toString() || 'Failed'}`);
        }
      },
    })),
  ], [clipboardItems, closeShelf, handleOpenDashboard, setActiveClipboardCategory, setClipboardItems, setIsRecording, userExtensions]);

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
        id: 'image',
        label: 'Images',
        count: clipboardItems.filter((i) => i.category === 'image').length,
      },
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

  // Listen for backend toggle events:
  // - murmur://toggle-shelf (Cmd+Shift+V): Directly toggles/opens SuPaste Clipboard Shelf
  // - murmur://toggle-search (Cmd+Shift+K): Directly toggles/opens Search & Mini-Tools
  useEffect(() => {
    const unlistenToggle = listen('murmur://toggle-shelf', () => {
      if (activeMode === 'shelf' && superNotchHudView === 'shelf') {
        closeShelf();
      } else {
        openShelf('shelf');
      }
    });

    const unlistenSearch = listen('murmur://toggle-search', () => {
      if (activeMode === 'shelf' && superNotchHudView === 'search') {
        closeShelf();
      } else {
        openShelf('search');
      }
    });

    const unlistenHud = listen('murmur://toggle-hud', () => {
      if (activeMode === 'shelf') {
        closeShelf();
      } else {
        openShelf('shelf');
      }
    });

    const unlistenOpen = listen('murmur://open-shelf', () => {
      openShelf('shelf');
    });

    return () => {
      unlistenToggle.then((f) => f());
      unlistenSearch.then((f) => f());
      unlistenHud.then((f) => f());
      unlistenOpen.then((f) => f());
    };
  }, [activeMode, closeShelf, openShelf, superNotchHudView]);

  // Click-outside listener: Auto-close expanded notch when losing focus to another window or desktop
  useEffect(() => {
    if (activeMode !== 'shelf') return;

    let unlistenBlur: (() => void) | null = null;
    const currentWin = getCurrentWindow();

    currentWin
      .listen('tauri://blur', () => {
        if (Date.now() - openedAtRef.current > 350) {
          closeShelf();
        }
      })
      .then((unlisten) => {
        unlistenBlur = unlisten;
      })
      .catch(() => {});

    const handleWindowBlur = () => {
      if (Date.now() - openedAtRef.current > 350) {
        closeShelf();
      }
    };

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      if (unlistenBlur) unlistenBlur();
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [activeMode, closeShelf]);

  // Keyboard navigation inside Notch
  useEffect(() => {
    if (activeMode !== 'shelf') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeShelf();
        return;
      }

      // Switch views on Tab: Shelf -> Widgets -> Extensions (Search)
      if (e.key === 'Tab') {
        e.preventDefault();
        const views: ('shelf' | 'widgets' | 'search')[] = ['shelf', 'widgets', 'search'];
        const currentIdx = views.indexOf(superNotchHudView);
        const nextView = views[(currentIdx + 1) % views.length];
        handleToggleView(nextView);
        return;
      }

      if (superNotchHudView === 'search') {
        const total = searchResults.commands.length + searchResults.clips.length;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (total > 0) {
            setSearchSelectedIndex((prev) => (prev + 1) % total);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (total > 0) {
            setSearchSelectedIndex((prev) => (prev - 1 + total) % total);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (promptLiveMatch) {
            handlePaste(promptLiveMatch.polished);
            return;
          }
          if (quickCalcMatch) {
            handleCopyCalcResult();
            return;
          }
          if (total === 0) return;
          if (searchSelectedIndex < searchResults.commands.length) {
            searchResults.commands[searchSelectedIndex].action();
          } else {
            const clipIdx = searchSelectedIndex - searchResults.commands.length;
            const clip = searchResults.clips[clipIdx];
            if (clip) handlePaste(clip);
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
          if (item) handlePaste(item);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeMode,
    closeShelf,
    filteredShelfItems,
    handleCopyCalcResult,
    handlePaste,
    handleToggleView,
    promptLiveMatch,
    quickCalcMatch,
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

  // Dimensions based on state:
  // - shelf: fixed 860px width, height 250px (shelf) or 410px (search)
  // - recording: strictly locked at 28px height (menu bar level), width smoothly expands to 220px
  // - idle: 160px width, 28px height
  const targetWidth =
    activeMode === 'shelf'
      ? 860
      : activeMode === 'recording'
      ? 220
      : 160;

  const targetHeight =
    activeMode === 'shelf'
      ? superNotchHudView === 'search'
        ? 410
        : 250
      : 28;

  const targetRadius =
    activeMode === 'shelf'
      ? '0 0 24px 24px'
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
        initial={false}
        animate={{
          width: targetWidth,
          height: targetHeight,
        }}
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 32,
          mass: 0.8,
        }}
        onWheel={handleWheel}
        onClick={(e) => {
          if (activeMode === 'idle') {
            e.stopPropagation();
            openShelf();
          } else if (activeMode === 'recording') {
            e.stopPropagation();
            invoke('toggle_recording').catch(() => {});
            setIsRecording(false);
          }
        }}
        className="pointer-events-auto relative z-10 flex flex-col items-center select-none"
      >
        {/* Top Left Ear (Concave Fillet connecting seamlessly to top screen bezel) */}
        <svg
          width={activeMode === 'shelf' ? 20 : 10}
          height={activeMode === 'shelf' ? 20 : 10}
          viewBox={activeMode === 'shelf' ? '0 0 20 20' : '0 0 10 10'}
          className={`absolute top-0 pointer-events-none z-20 ${
            activeMode === 'shelf' ? '-left-[20px]' : '-left-[10px]'
          }`}
        >
          {activeMode === 'shelf' ? (
            <>
              {/* Solid jet-black fillet fill overlapping into notch boundary */}
              <path
                d="M 0 0 C 11.046 0 20 8.954 20 20 H 20.5 V 0 Z"
                fill="#000000"
              />
              {/* Organic curved border matching the notch stroke */}
              <path
                d="M 0 0 C 11.046 0 20 8.954 20 20"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
            </>
          ) : (
            <path d="M 0 0 H 10 V 10 C 10 4.477 5.523 0 0 0 Z" fill="#000000" />
          )}
        </svg>

        {/* Top Right Ear (Concave Fillet connecting seamlessly to top screen bezel) */}
        <svg
          width={activeMode === 'shelf' ? 20 : 10}
          height={activeMode === 'shelf' ? 20 : 10}
          viewBox={activeMode === 'shelf' ? '0 0 20 20' : '0 0 10 10'}
          className={`absolute top-0 pointer-events-none z-20 ${
            activeMode === 'shelf' ? '-right-[20px]' : '-right-[10px]'
          }`}
        >
          {activeMode === 'shelf' ? (
            <>
              {/* Solid jet-black fillet fill overlapping into notch boundary */}
              <path
                d="M 20 0 C 8.954 0 0 8.954 0 20 H -0.5 V 0 Z"
                fill="#000000"
              />
              {/* Organic curved border matching the notch stroke */}
              <path
                d="M 20 0 C 8.954 0 0 8.954 0 20"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
            </>
          ) : (
            <path d="M 10 0 H 0 V 10 C 0 4.477 4.477 0 10 0 Z" fill="#000000" />
          )}
        </svg>

        {/* Main Notch Body Container (Pure SuPaste Crisp Hardware Profile - Zero Blurry Drop Shadow) */}
        <div
          style={{ borderRadius: targetRadius }}
          className={`w-full h-full flex flex-col items-center overflow-hidden bg-black relative ${
            activeMode === 'shelf'
              ? 'border-b border-white/[0.08]'
              : activeMode === 'recording'
              ? 'border-b border-white/[0.06] cursor-pointer'
              : 'cursor-pointer border-none'
          }`}
        >
          {/* Continuous Left & Right Borders: starting at top 20px so they connect seamlessly with ear curve */}
          {activeMode === 'shelf' && (
            <>
              <div className="absolute top-[20px] bottom-0 left-0 w-[1px] bg-white/[0.08] pointer-events-none z-20" />
              <div className="absolute top-[20px] bottom-0 right-0 w-[1px] bg-white/[0.08] pointer-events-none z-20" />
            </>
          )}
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

          {/* 2. RECORDING NOTCH VIEW (Siri-Style Liquid Orb - Locked 28px height, 220px width, zero text) */}
          {activeMode === 'recording' && (
            <motion.div
              key="recording-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex items-center justify-center bg-black cursor-pointer overflow-hidden relative"
              title="Listening... Click notch to stop"
            >
              {/* Outer soft ambient halo that breathes and pulses with microphone input */}
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center transition-all duration-75"
                style={{
                  opacity: 0.4 + Math.min(0.6, audioLevel * 1.5),
                  transform: `scale(${1 + Math.min(0.5, audioLevel * 1.0)})`,
                }}
              >
                <div
                  className="w-32 h-6 rounded-full blur-[10px]"
                  style={{
                    background:
                      orbTheme === 'brand'
                        ? 'radial-gradient(ellipse at center, rgba(245,158,11,0.75) 0%, rgba(249,115,22,0.6) 45%, rgba(16,185,129,0.4) 80%, transparent 100%)'
                        : 'radial-gradient(ellipse at center, rgba(56,189,248,0.7) 0%, rgba(168,85,247,0.6) 45%, rgba(52,211,153,0.4) 80%, transparent 100%)',
                  }}
                />
              </div>

              {/* Siri Liquid Orb: Organic pulsating pill with luminous core */}
              <div
                className="relative flex items-center justify-center transition-all duration-75"
                style={{
                  transform: `scale(${0.92 + Math.min(0.38, audioLevel * 1.1)})`,
                }}
              >
                {/* Fluid gradient pill aura */}
                <div
                  className="h-3 rounded-full blur-[3px] transition-all duration-75"
                  style={{
                    width: `${38 + Math.min(55, audioLevel * 85)}px`,
                    background:
                      orbTheme === 'brand'
                        ? 'linear-gradient(90deg, #fbbf24 0%, #f97316 35%, #ec4899 70%, #10b981 100%)'
                        : 'linear-gradient(90deg, #38bdf8 0%, #c084fc 35%, #f472b6 65%, #34d399 100%)',
                  }}
                />
                {/* Crisp inner luminous nucleus */}
                <div
                  className="absolute h-1.5 rounded-full bg-white transition-all duration-75"
                  style={{
                    width: `${16 + Math.min(28, audioLevel * 50)}px`,
                    opacity: 0.85 + Math.min(0.15, audioLevel * 0.3),
                    boxShadow:
                      orbTheme === 'brand'
                        ? '0 0 8px 1px rgba(255,255,255,0.95), 0 0 14px 2px rgba(245,158,11,0.85)'
                        : '0 0 8px 1px rgba(255,255,255,0.9), 0 0 14px 2px rgba(56,189,248,0.8)',
                  }}
                />
              </div>
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
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-transparent">
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
                      onKeyDown={(e) => {
                        if (
                          [
                            'ArrowLeft',
                            'ArrowRight',
                            'ArrowUp',
                            'ArrowDown',
                            'Enter',
                            'Escape',
                            'Tab',
                          ].includes(e.key)
                        ) {
                          return;
                        }
                        e.stopPropagation();
                      }}
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

                  {/* Distinct Tab Toggles: Clean Icon-Only Toggles: 1. Shelf, 2. Widgets, 3. Extensions (Always at the end) */}
                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] ml-1">
                    {/* Tab 1: SuPaste Shelf View */}
                    <button
                      onClick={() => handleToggleView('shelf')}
                      className={`p-2 rounded-lg transition-all cursor-pointer ${
                        superNotchHudView === 'shelf'
                          ? 'bg-white/15 text-white shadow-sm border border-white/10'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                      title="Clipboard Shelf View (Tab)"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>

                    {/* Tab 2: Widgets & Hardware Vitals */}
                    <button
                      onClick={() => handleToggleView('widgets')}
                      className={`p-2 rounded-lg transition-all cursor-pointer ${
                        superNotchHudView === 'widgets'
                          ? 'bg-white/15 text-white shadow-sm border border-white/10'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                      title="Widgets & Hardware Vitals (Tab)"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                    </button>

                    {/* Tab 3: Extensions & Quick Search (Always at the end) */}
                    <button
                      onClick={() => handleToggleView('search')}
                      className={`p-2 rounded-lg transition-all cursor-pointer ${
                        superNotchHudView === 'search'
                          ? 'bg-white/15 text-white shadow-sm border border-white/10'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                      title="Extensions & Quick Search (Tab)"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Side: Status Feedback, Star (Pinned), Settings (Dashboard), and Close Button */}
                <div className="flex items-center gap-1">
                  {statusFeedback && (
                    <span className="text-[11px] text-zinc-400 font-mono pr-2 truncate max-w-[140px]">
                      {statusFeedback}
                    </span>
                  )}

                  {/* Star / Pinned Toggle */}
                  <button
                    onClick={() =>
                      setActiveClipboardCategory(
                        activeClipboardCategory === 'pinned' ? 'all' : 'pinned'
                      )
                    }
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      activeClipboardCategory === 'pinned'
                        ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                    title="Starred & Pinned Clips"
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>

                  {/* Open Dashboard Settings */}
                  <button
                    onClick={handleOpenDashboard}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Open Dashboard"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {/* Close Notch */}
                  <button
                    onClick={closeShelf}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-0.5"
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

                  {/* Horizontal Shelf Stream (155px x 120px cards with comfortable padding) */}
                  <div
                    ref={shelfScrollRef}
                    className="flex flex-row gap-2.5 overflow-x-auto pt-1 pb-1.5 px-0.5 items-stretch flex-1 custom-slim-scrollbar"
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
                            draggable={true}
                            onDragStart={(e) => {
                              isDraggingRef.current = true;
                              e.dataTransfer.effectAllowed = 'copyMove';
                              e.dataTransfer.setData('text/plain', item.content);
                              e.dataTransfer.setData('text', item.content);
                              if (item.category === 'image') {
                                e.dataTransfer.setData('text/html', `<img src="${item.content}" alt="image" />`);
                                e.dataTransfer.setData('text/uri-list', item.content);
                                try {
                                  const b64Parts = item.content.split(',');
                                  const b64Data = b64Parts.length > 1 ? b64Parts[1] : b64Parts[0];
                                  const byteChars = atob(b64Data);
                                  const byteArr = new Uint8Array(byteChars.length);
                                  for (let i = 0; i < byteChars.length; i++) {
                                    byteArr[i] = byteChars.charCodeAt(i);
                                  }
                                  const blob = new Blob([byteArr], { type: 'image/png' });
                                  const file = new File([blob], `image-${item.timestampRaw || Date.now()}.png`, { type: 'image/png' });
                                  e.dataTransfer.items.add(file);
                                } catch {}
                              }
                            }}
                            onDragEnd={() => {
                              setTimeout(() => {
                                isDraggingRef.current = false;
                              }, 180);
                            }}
                            onClick={(e) => {
                              if (isDraggingRef.current) return;
                              handlePaste(item, e);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handlePaste(item, e);
                            }}
                            onMouseEnter={() => setShelfSelectedIndex(index)}
                            className={`w-[155px] min-w-[155px] h-[120px] rounded-xl p-2.5 flex flex-col justify-between transition-all duration-100 cursor-pointer select-none group relative overflow-hidden ${
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
                            {item.category === 'image' ? (
                              <div className="flex-1 overflow-hidden min-h-0 relative rounded-lg bg-black/40 flex items-center justify-center">
                                <img
                                  src={item.content}
                                  alt="Copied image"
                                  className="w-full h-full object-cover rounded-lg pointer-events-none"
                                />
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[9px] font-mono text-zinc-300">
                                  {item.sourceApp || 'Image'}
                                </div>
                              </div>
                            ) : isColor ? (
                              <div className="flex-1 flex flex-col justify-end">
                                <span className="text-[11px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-md self-start">
                                  {item.content}
                                </span>
                              </div>
                            ) : (
                              <div className="flex-1 overflow-hidden pr-0.5 min-h-0">
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
                                  className={`text-[11px] leading-snug line-clamp-3 ${
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
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 font-mono shrink-0">
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
              {/* ================================================================= */}
              {/* VIEW B: RAYCAST SEARCH VIEW (Clean & Minimal, 0 Clutter)          */}
              {/* ================================================================= */}
              {superNotchHudView === 'search' && (
                <div className="flex-1 flex flex-col justify-between pt-1 overflow-hidden">
                  {/* Results List */}
                  <div
                    ref={searchListScrollRef}
                    className="flex-1 overflow-y-auto custom-slim-scrollbar space-y-0.5 pr-1 max-h-[300px]"
                  >
                    {/* In-Place /prompt & /fix Live Card (Auto-Pastes directly to active chat) */}
                    {promptLiveMatch && (
                      <div
                        onClick={() => handlePaste(promptLiveMatch.polished)}
                        className="mb-2 p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                              <span>In-Place Polish</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                                Auto-Paste
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-white truncate mt-0.5">
                              {promptLiveMatch.polished}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-white transition-colors text-[10px] font-mono shrink-0">
                          <CornerDownLeft className="w-3 h-3" />
                          <span>Press ↵ to paste to chat</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Calculator / Unit Converter Live Card */}
                    {quickCalcMatch && (
                        <div
                          onClick={handleCopyCalcResult}
                          className="mb-2 p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0">
                              <Calculator className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold text-white tracking-tight">
                                  {quickCalcMatch.result}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                                  {quickCalcMatch.category}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-zinc-400 font-mono mt-0.5">
                                {quickCalcMatch.detail}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-white transition-colors text-[10px] font-mono">
                            <CornerDownLeft className="w-3 h-3" />
                            <span>Press ↵ to copy</span>
                          </div>
                        </div>
                      )}

                      {searchResults.totalCount === 0 && !quickCalcMatch ? (
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
                                const isUserExt = (cmd as any).isUserExtension;
                                const userIcon = (cmd as any).userIcon;

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
                                      <div className="w-6 h-6 rounded-md bg-white/[0.06] text-zinc-300 flex items-center justify-center flex-shrink-0 text-xs">
                                        {userIcon ? (
                                          <span>{userIcon}</span>
                                        ) : (
                                          <CmdIcon className="w-3.5 h-3.5" />
                                        )}
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
                                      {isUserExt ? 'Script' : 'Extension'}
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
                                    draggable={true}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', item.content);
                                      if (item.category === 'image') {
                                        e.dataTransfer.setData('text/uri-list', item.content);
                                      }
                                    }}
                                    onClick={() => handlePaste(item)}
                                    onMouseEnter={() => setSearchSelectedIndex(overallIndex)}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-white/[0.1] text-white shadow-sm'
                                        : 'hover:bg-white/[0.04] text-zinc-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      {item.category === 'image' ? (
                                        <div className="w-6 h-6 rounded-md overflow-hidden bg-white/[0.06] flex-shrink-0">
                                          <img
                                            src={item.content}
                                            alt="clip thumbnail"
                                            className="w-full h-full object-cover pointer-events-none"
                                          />
                                        </div>
                                      ) : (
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
                                      )}

                                      <span
                                        className={`text-xs truncate max-w-[420px] ${
                                          item.category === 'code'
                                            ? 'font-mono text-zinc-200'
                                            : 'text-zinc-200'
                                        }`}
                                      >
                                        {item.category === 'image'
                                          ? 'Image preview'
                                          : item.content.replace(/\n+/g, ' ')}
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
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-transparent font-mono">
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
                          <span>Next Tab</span>
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">Esc</kbd>
                        <span>Close</span>
                      </span>
                    </div>
                  </div>
              )}

              {/* ================================================================= */}
              {/* VIEW C: WIDGETS & MEDIA VIEW                                     */}
              {/* ================================================================= */}
              {superNotchHudView === 'widgets' && (
                <div className="flex-1 flex flex-col justify-between pt-1 overflow-hidden">
                  <WidgetsView />

                  {/* Widgets Footer */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-transparent font-mono">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <LayoutDashboard className="w-3 h-3 text-white" />
                        <span>Hardware Vitals & Media</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">Tab</kbd>
                        <span>Next Tab</span>
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
