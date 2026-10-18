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
  FolderOpen,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  FileText,
  Smile,
  Palette,
  Globe,
  ExternalLink,
  Radio,
  Layers,
  Type,
  AppWindow,
  Eye,
  EyeOff,
  Send,
  Bot,
  ChevronDown,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  useAppStore,
  ClipboardCategory,
  ClipboardItem,
  NoteItem,
} from '../../stores/appStore';
import {
  AIModelId,
  AVAILABLE_AI_MODELS,
  ChatMessage,
  ScreenVisionPayload,
  captureScreenVision,
  sendAIChatRequest,
} from '../../services/aiChatService';
import { WidgetsView } from './WidgetsView';
import { evaluateQuickCalc } from '../../services/quickCalc';
import { polishTextForChat, convertToMarkdownChecklist } from '../../services/quickPrompt';
import { searchUnicodeSymbols } from '../../services/emojiFinder';
import { analyzeColor, extractHexColors } from '../../services/colorPaletteService';

export interface InstalledApp {
  id: string;
  name: string;
  path: string;
  bundle_id: string;
}

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

export interface WebInspectionResult {
  url: string;
  title: string;
  description: string;
  og_image?: string;
  colors: string[];
  images: string[];
  svgs: string[];
  fonts: string[];
  total_assets_count: number;
}

const FocusReticleIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" strokeDasharray="6 2" />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
  </svg>
);

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
    focusTimerRunning,
    focusTimerRemaining,
    focusTaskName,
    startFocusTimer,
    pauseFocusTimer,
    resetFocusTimer,
    tickFocusTimer,
    setNotes,
    addNote,
    updateNote,
    setActiveTab,
    apiKeys,
  } = useAppStore();

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [shelfSelectedIndex, setShelfSelectedIndex] = useState<number>(0);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState<string | null>(null);
  const [userExtensions, setUserExtensions] = useState<UserExtension[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);

  // AI Chat & Screen Copilot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Ready. Ask a question, format checklists, or click the eye icon to analyze your screen.`,
      timestamp: Date.now(),
      modelUsed: 'qwen2.5-0.5b',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedAIModel, setSelectedAIModel] = useState<AIModelId>('qwen2.5-0.5b');
  const [isScreenVisionEnabled, setIsScreenVisionEnabled] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [currentScreenThumbnail, setCurrentScreenThumbnail] = useState<ScreenVisionPayload | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const shelfScrollRef = useRef<HTMLDivElement>(null);
  const searchListScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedAtRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const showStatus = useCallback((msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 2000);
  }, []);

  const triggerNoteSavedAnimation = useCallback((msg: string = 'Saved to Notes') => {
    setNoteSavedFeedback(msg);
    setTimeout(() => {
      setNoteSavedFeedback(null);
    }, 2200);
  }, []);

  const getExpandedDimensions = useCallback((view: 'shelf' | 'search' | 'widgets' | 'chat') => {
    if (view === 'chat') {
      return { width: 600, height: 460 };
    }
    if (view === 'search') {
      return { width: 860, height: 410 };
    }
    if (view === 'widgets') {
      return { width: 860, height: 285 };
    }
    return { width: 860, height: 260 };
  }, []);

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

  const openShelf = useCallback((targetView?: 'shelf' | 'search' | 'widgets' | 'chat') => {
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

  // /checklist & /todo Live Match (intelligent Markdown tasks converter)
  const checklistLiveMatch = useMemo(() => {
    const query = clipboardSearchQuery.trim();
    const match = query.match(/^\/(?:checklist|todo|tasks)\s+(.+)$/i);
    if (!match) return null;
    const raw = match[1];
    const checklist = convertToMarkdownChecklist(raw);
    return { raw, checklist };
  }, [clipboardSearchQuery]);

  // /emoji & /symbol Live Match (offline instant Unicode glyphs)
  const emojiLiveMatch = useMemo(() => {
    const query = clipboardSearchQuery.trim();
    const match = query.match(/^\/(?:emoji|symbol)(?:\s+(.*))?$/i);
    if (!match) return null;
    const searchParam = match[1]?.trim() || '';
    const results = searchUnicodeSymbols(searchParam, 12);
    return { query: searchParam, results };
  }, [clipboardSearchQuery]);

  // /color & /palette Live Match (WCAG contrast & format extraction)
  const colorLiveMatch = useMemo(() => {
    const query = clipboardSearchQuery.trim();
    const match = query.match(/^\/(?:color|palette)(?:\s+(.*))?$/i);
    if (!match) return null;
    const colorParam = match[1]?.trim();
    if (colorParam) {
      const details = analyzeColor(colorParam);
      return { type: 'single' as const, details };
    }
    const hexes = clipboardItems
      .filter((c) => c.category === 'color' || c.content.includes('#'))
      .flatMap((c) => extractHexColors(c.content));
    const unique = Array.from(new Set(hexes)).slice(0, 10);
    return { type: 'palette' as const, colors: unique };
  }, [clipboardSearchQuery, clipboardItems]);

  const [inspectedWebData, setInspectedWebData] = useState<WebInspectionResult | null>(null);
  const [isInspectingWeb, setIsInspectingWeb] = useState(false);
  const [webInspectorTab, setWebInspectorTab] = useState<'palette' | 'media' | 'fonts' | 'meta'>('palette');

  // /inspect & /web Live Match (DOM & design asset extractor)
  const inspectLiveMatch = useMemo(() => {
    const query = clipboardSearchQuery.trim();
    const match = query.match(/^\/(?:inspect|web|assets)\s+(.+)$/i);
    if (!match) return null;
    return { url: match[1].trim() };
  }, [clipboardSearchQuery]);

  const handleRunWebInspection = useCallback(async (url: string) => {
    setIsInspectingWeb(true);
    try {
      const res = await invoke<WebInspectionResult>('inspect_website', { url });
      setInspectedWebData(res);
      showStatus(`Extracted ${res.total_assets_count} web assets`);
    } catch (e) {
      showStatus(`Failed to inspect website: ${e}`);
    } finally {
      setIsInspectingWeb(false);
    }
  }, [showStatus]);

  // Ambient Meeting & Lecture Scribe (/meeting or /listen)
  const [isMeetingScribeActive, setIsMeetingScribeActive] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState<number>(0);
  const [meetingNoteId, setMeetingNoteId] = useState<string | null>(null);
  const [meetingElapsedSecs, setMeetingElapsedSecs] = useState<number>(0);

  const isMeetingScribeActiveRef = useRef(false);
  const meetingNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    isMeetingScribeActiveRef.current = isMeetingScribeActive;
  }, [isMeetingScribeActive]);

  useEffect(() => {
    meetingNoteIdRef.current = meetingNoteId;
  }, [meetingNoteId]);

  useEffect(() => {
    if (!isMeetingScribeActive) return;
    const interval = setInterval(() => {
      setMeetingElapsedSecs(Math.floor((Date.now() - meetingStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isMeetingScribeActive, meetingStartTime]);

  const meetingLiveMatch = useMemo(() => {
    const query = clipboardSearchQuery.trim();
    if (!query.toLowerCase().startsWith('/meeting') && !query.toLowerCase().startsWith('/listen')) return null;
    const match = query.match(/^\/(?:meeting|listen)(?:\s+(.*))?$/i);
    return {
      arg: match ? match[1]?.trim() : '',
    };
  }, [clipboardSearchQuery]);

  const handleToggleMeetingScribe = useCallback(async () => {
    if (isMeetingScribeActiveRef.current) {
      setIsMeetingScribeActive(false);
      isMeetingScribeActiveRef.current = false;
      try {
        await invoke('stop_recording');
      } catch {}
      setIsRecording(false);
      showStatus('Meeting scribe completed & saved to Notes!');
      triggerNoteSavedAnimation('Meeting Saved');
    } else {
      try {
        const now = new Date();
        const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const title = `Meeting • ${dateStr} at ${timeStr}`;
        const saved = await invoke<NoteItem>('save_note', {
          title,
          content: `### 🎙️ Ambient Meeting Transcript\n**Started:** ${timeStr} • ${dateStr}\n\n---\n`,
          tags: ['meeting', 'scribe'],
        });
        setMeetingNoteId(saved.id);
        meetingNoteIdRef.current = saved.id;
        addNote(saved);
        setIsMeetingScribeActive(true);
        isMeetingScribeActiveRef.current = true;
        setMeetingStartTime(Date.now());
        setMeetingElapsedSecs(0);
        showStatus('Ambient Meeting Scribe Started');
        closeShelf();
        await invoke('start_meeting_recording');
        setIsRecording(true);
      } catch (e) {
        console.error('Failed to start meeting scribe', e);
        showStatus('Failed to start meeting scribe');
      }
    }
  }, [addNote, closeShelf, showStatus, triggerNoteSavedAnimation, setIsRecording]);

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

  const loadInstalledApps = useCallback(async () => {
    try {
      const apps = await invoke<InstalledApp[]>('get_installed_applications');
      if (Array.isArray(apps)) {
        setInstalledApps(apps);
      }
    } catch (e) {
      console.error('Failed to load installed applications', e);
    }
  }, []);

  useEffect(() => {
    loadExtensions();
    loadInstalledApps();
  }, [loadExtensions, loadInstalledApps]);

  const quickCalcMatch = useMemo(() => {
    return evaluateQuickCalc(clipboardSearchQuery);
  }, [clipboardSearchQuery]);

  // /focus Live Match (handles `/focus`, `/focus 14`, `/focus 46`, etc.)
  const focusLiveMatch = useMemo(() => {
    const query = clipboardSearchQuery.trim();
    if (!query.toLowerCase().startsWith('/focus')) return null;
    const match = query.match(/^\/focus(?:\s+(\d+))?(?:\s+(.*))?$/i);
    if (!match) return null;
    const mins = match[1] ? parseInt(match[1], 10) : 25;
    const task = match[2]?.trim() || 'Deep Focus';
    return {
      minutes: mins,
      task,
      hasExplicitMins: Boolean(match[1]),
    };
  }, [clipboardSearchQuery]);

  const activeMode = isRecording ? 'recording' : superNotchMode;

  // Active Focus Timer Interval
  useEffect(() => {
    if (!focusTimerRunning) return;
    const interval = setInterval(() => {
      tickFocusTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [focusTimerRunning, tickFocusTimer]);

  const handleCopyCalcResult = useCallback(async () => {
    if (!quickCalcMatch) return;
    try {
      await navigator.clipboard.writeText(quickCalcMatch.result);
      invoke('paste_text_direct', { text: quickCalcMatch.result }).catch(() => {});
      showStatus(`Copied: ${quickCalcMatch.result}`);
      closeShelf();
    } catch {}
  }, [quickCalcMatch, closeShelf]);

  const handleStartFocusSession = useCallback((minutes: number, task?: string) => {
    startFocusTimer(minutes, task || 'Deep Focus');
    showStatus(`Started ${minutes}m Focus Session`);
    setClipboardSearchQuery('');
    closeShelf();
  }, [startFocusTimer, closeShelf, setClipboardSearchQuery]);

  const handleSaveNoteDirect = useCallback(
    async (content: string, asChecklist: boolean = false) => {
      try {
        const finalContent = asChecklist ? convertToMarkdownChecklist(content) : content;
        const tags = asChecklist ? ['checklist'] : ['quick-note'];
        const saved = await invoke<NoteItem>('save_note', {
          title: '',
          content: finalContent,
          tags,
        });
        addNote(saved);
        triggerNoteSavedAnimation(asChecklist ? 'Checklist Saved' : 'Saved to Notes');
        setClipboardSearchQuery('');
        closeShelf();
      } catch (e) {
        console.error('Failed to save note from notch', e);
      }
    },
    [addNote, triggerNoteSavedAnimation, closeShelf, setClipboardSearchQuery]
  );

  useEffect(() => {
    const unlistenSaved = listen<string>('dopenotch://note-saved', (event) => {
      const label = event.payload || 'Saved to Notes';
      triggerNoteSavedAnimation(label);
      invoke<NoteItem[]>('get_notes')
        .then((loaded) => {
          if (Array.isArray(loaded)) setNotes(loaded);
        })
        .catch(() => {});
    });

    const unlistenChunk = listen<string>('dopenotch://meeting-chunk', async (event) => {
      const chunkText = event.payload?.trim();
      if (!chunkText || !meetingNoteIdRef.current) return;

      try {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const allNotes = await invoke<NoteItem[]>('get_notes');
        const target = allNotes.find((n) => n.id === meetingNoteIdRef.current);
        const baseContent = target?.content || '### 🎙️ Ambient Meeting Transcript\n';
        const updated = await invoke<NoteItem>('update_note', {
          id: meetingNoteIdRef.current,
          content: `${baseContent}\n**[${timestamp}]** ${chunkText}\n`,
        });
        updateNote(meetingNoteIdRef.current, { content: updated.content, updated_at: updated.updated_at });
        triggerNoteSavedAnimation('Transcript Added');

        // Continuous chunking loop if meeting is still active
        if (isMeetingScribeActiveRef.current) {
          setTimeout(async () => {
            if (isMeetingScribeActiveRef.current) {
              try {
                await invoke('start_meeting_recording');
                setIsRecording(true);
              } catch {}
            }
          }, 400);
        }
      } catch (e) {
        console.error('Failed to append meeting chunk', e);
      }
    });

    const unlistenVoice = listen('dopenotch://trigger-voice-note', async () => {
      try {
        await invoke('toggle_voice_note');
      } catch {}
    });

    return () => {
      unlistenSaved.then((f) => f());
      unlistenChunk.then((f) => f());
      unlistenVoice.then((f) => f());
    };
  }, [triggerNoteSavedAnimation, setNotes, updateNote, setIsRecording]);

  // Switch between Shelf (SuperShelf), Search (Raycast), Widgets, and AI Chat views
  const handleToggleView = (newView: 'shelf' | 'search' | 'widgets' | 'chat') => {
    setSuperNotchHudView(newView);
    const dims = getExpandedDimensions(newView);
    invoke('set_notch_expanded', {
      expanded: true,
      width: dims.width,
      height: dims.height,
    }).catch(() => {});
  };

  const handleSendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || isAIGenerating) return;
    const userText = chatInput.trim();
    setChatInput('');

    let screenPayload = currentScreenThumbnail;
    if (isScreenVisionEnabled && !screenPayload) {
      try {
        screenPayload = await captureScreenVision();
        setCurrentScreenThumbnail(screenPayload);
      } catch (e) {
        console.warn('Failed to capture screen vision:', e);
      }
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      hasScreenVision: Boolean(screenPayload),
      screenThumbnail: screenPayload
        ? `data:${screenPayload.mime_type};base64,${screenPayload.base64_image}`
        : undefined,
      modelUsed: selectedAIModel,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAIGenerating(true);

    try {
      const reply = await sendAIChatRequest(
        userText,
        selectedAIModel,
        screenPayload,
        apiKeys['gemini'],
        apiKeys['openai'],
        apiKeys['grok'],
        apiKeys['openrouter']
      );
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        modelUsed: selectedAIModel,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `### ⚠️ Request Error\n${err?.message || 'Failed to generate response'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsAIGenerating(false);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 60);
    }
  }, [apiKeys, chatInput, currentScreenThumbnail, isAIGenerating, isScreenVisionEnabled, selectedAIModel]);

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
      id: 'cmd-focus',
      command: '/focus',
      title: 'Focus Mode & Pomodoro',
      subtitle: focusTimerRunning
        ? `Pause or reset session (${formatTime(focusTimerRemaining)} left)`
        : 'Start 25-min focus session with Dynamic Island countdown (or /focus 45)',
      icon: Clock,
      action: () => {
        const query = clipboardSearchQuery.trim();
        const customMatch = query.match(/^\/focus\s+(\d+)(?:\s+(.*))?$/i);
        if (customMatch) {
          const mins = parseInt(customMatch[1], 10);
          const task = customMatch[2]?.trim() || 'Focus';
          startFocusTimer(mins, task);
          showStatus(`Started ${mins}m Focus Session!`);
          closeShelf();
          return;
        }

        if (focusTimerRunning) {
          pauseFocusTimer();
          showStatus('Focus session paused');
        } else {
          startFocusTimer(25, 'Deep Focus');
          showStatus('Started 25m Focus Session!');
        }
      },
    },
    {
      id: 'cmd-meeting',
      command: '/meeting',
      title: 'Ambient Meeting & Lecture Scribe',
      subtitle: isMeetingScribeActive
        ? `Stop active meeting scribe session (${formatTime(meetingElapsedSecs)})`
        : 'Continuous background transcription logged directly to Notes (/listen)',
      icon: Radio,
      action: () => {
        handleToggleMeetingScribe();
      },
    },
    {
      id: 'cmd-inspect',
      command: '/inspect',
      title: 'Web Asset & Palette Inspector',
      subtitle: 'Extract colors, SVGs, images, typography & OpenGraph metadata (/web <url>)',
      icon: Globe,
      action: () => {
        setClipboardSearchQuery('/inspect ');
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      },
    },
    {
      id: 'cmd-checklist',
      command: '/checklist',
      title: 'Markdown Checklist Generator',
      subtitle: 'Convert unstructured thoughts or copied text into interactive - [ ] tasks (/todo)',
      icon: CheckSquare,
      action: () => {
        setClipboardSearchQuery('/checklist ');
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      },
    },
    {
      id: 'cmd-emoji',
      command: '/emoji',
      title: 'Developer Glyphs & Unicode Finder',
      subtitle: 'Instant offline finder for arrows, math symbols, macOS keys & emojis (/symbol)',
      icon: Smile,
      action: () => {
        setClipboardSearchQuery('/emoji ');
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      },
    },
    {
      id: 'cmd-notes',
      command: '/notes',
      title: 'Voice Notes & Task Lists',
      subtitle: 'Open Notes tab in DopeNotch dashboard • Global hotkey: ⌥N',
      icon: FileText,
      action: () => {
        setActiveTab('notes');
        handleOpenDashboard();
      },
    },
    {
      id: 'cmd-extensions',
      command: '/extensions',
      title: 'Open Extensions Folder',
      subtitle: 'Create & manage custom Bash, Python & Node scripts (~/.dopenotch/extensions)',
      icon: FolderOpen,
      action: async () => {
        try {
          await invoke('open_extensions_folder');
          showStatus('Opened ~/.dopenotch/extensions in Finder');
        } catch (e: any) {
          showStatus(e?.toString() || 'Failed to open extensions folder');
        }
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
      title: 'SuperShelf Clipboard Shelf',
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
    {
      id: 'cmd-chat',
      command: '/chat',
      title: 'AI Chat & Screen Copilot',
      subtitle: 'Multimodal dynamic island with screen vision & notes sync',
      icon: Bot,
      action: () => {
        handleToggleView('chat');
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
  ], [clipboardItems, closeShelf, handleOpenDashboard, setActiveClipboardCategory, setClipboardItems, setIsRecording, userExtensions, focusTimerRunning, focusTimerRemaining, pauseFocusTimer, startFocusTimer, isMeetingScribeActive, meetingElapsedSecs, handleToggleMeetingScribe, setActiveTab, handleToggleView]);

  // Combined fast search results
  const searchResults = useMemo(() => {
    const q = clipboardSearchQuery.trim().toLowerCase();
    const isSlash = q.startsWith('/');

    const matchingApps = (!isSlash && q.length >= 1)
      ? installedApps
          .filter((app) => app.name.toLowerCase().includes(q) || app.id.toLowerCase().includes(q))
          .slice(0, 5)
      : [];

    const matchingCommands = toolCommands.filter((cmd) => {
      if (isSlash) {
        if (q.startsWith('/focus') && cmd.command === '/focus') return true;
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
      apps: matchingApps,
      commands: matchingCommands,
      clips: matchingClips,
      totalCount: matchingApps.length + matchingCommands.length + matchingClips.length,
    };
  }, [clipboardSearchQuery, toolCommands, clipboardItems, installedApps]);

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

  // Adaptive horizontal scroll edge detection for shelf stream
  const [shelfCanScrollLeft, setShelfCanScrollLeft] = useState(false);
  const [shelfCanScrollRight, setShelfCanScrollRight] = useState(false);

  const updateShelfScrollState = useCallback(() => {
    if (!shelfScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = shelfScrollRef.current;
    setShelfCanScrollLeft(scrollLeft > 6);
    setShelfCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = shelfScrollRef.current;
    if (!el) return;
    updateShelfScrollState();
    el.addEventListener('scroll', updateShelfScrollState, { passive: true });
    return () => el.removeEventListener('scroll', updateShelfScrollState);
  }, [updateShelfScrollState, filteredShelfItems.length, superNotchHudView]);

  const shelfMask = useMemo(() => {
    const leftFade = shelfCanScrollLeft ? 'transparent 0%, black 14px' : 'black 0%, black 14px';
    const rightFade = shelfCanScrollRight ? 'black calc(100% - 14px), transparent 100%' : 'black calc(100% - 14px), black 100%';
    return `linear-gradient(to right, ${leftFade}, ${rightFade})`;
  }, [shelfCanScrollLeft, shelfCanScrollRight]);

  // Category items with counts (SuperShelf Visual Shelf)
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
  // - murmur://toggle-shelf (Cmd+Shift+V): Directly toggles/opens SuperShelf Clipboard Shelf
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

      // Switch views on Tab: Shelf -> Widgets -> Extensions (Search) -> AI Chat
      if (e.key === 'Tab') {
        e.preventDefault();
        const views: ('shelf' | 'widgets' | 'search' | 'chat')[] = ['shelf', 'widgets', 'search', 'chat'];
        const currentIdx = views.indexOf(superNotchHudView);
        const nextView = views[(currentIdx + 1) % views.length];
        handleToggleView(nextView);
        return;
      }

      if (superNotchHudView === 'search') {
        const total = searchResults.apps.length + searchResults.commands.length + searchResults.clips.length;

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
          if (inspectLiveMatch) {
            handleRunWebInspection(inspectLiveMatch.url);
            return;
          }
          if (meetingLiveMatch) {
            handleToggleMeetingScribe();
            return;
          }
          if (checklistLiveMatch) {
            handlePaste(checklistLiveMatch.checklist);
            return;
          }
          if (emojiLiveMatch && emojiLiveMatch.results.length > 0) {
            handlePaste(emojiLiveMatch.results[0].char);
            return;
          }
          if (colorLiveMatch && colorLiveMatch.type === 'single' && colorLiveMatch.details) {
            handlePaste(colorLiveMatch.details.hex);
            return;
          }
          if (promptLiveMatch) {
            handlePaste(promptLiveMatch.polished);
            return;
          }
          if (quickCalcMatch) {
            handleCopyCalcResult();
            return;
          }
          if (focusLiveMatch) {
            handleStartFocusSession(focusLiveMatch.minutes, focusLiveMatch.task);
            return;
          }
          if (total === 0) return;
          if (searchSelectedIndex < searchResults.apps.length) {
            const app = searchResults.apps[searchSelectedIndex];
            if (app) {
              invoke('launch_application', { appPath: app.path }).catch(() => {});
              showStatus(`Launching ${app.name}...`);
              closeShelf();
              return;
            }
          } else if (searchSelectedIndex < searchResults.apps.length + searchResults.commands.length) {
            const cmdIdx = searchSelectedIndex - searchResults.apps.length;
            searchResults.commands[cmdIdx].action();
          } else {
            const clipIdx = searchSelectedIndex - searchResults.apps.length - searchResults.commands.length;
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
    checklistLiveMatch,
    emojiLiveMatch,
    colorLiveMatch,
    quickCalcMatch,
    focusLiveMatch,
    handleStartFocusSession,
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
  const isChatView = activeMode === 'shelf' && superNotchHudView === 'chat';

  const targetWidth =
    activeMode === 'shelf'
      ? isChatView
        ? 600
        : 860
      : activeMode === 'recording'
      ? 220
      : noteSavedFeedback
      ? 200
      : isMeetingScribeActive
      ? 190
      : inspectedWebData
      ? 180
      : 160;

  const targetHeight =
    activeMode === 'shelf'
      ? isChatView
        ? 460
        : superNotchHudView === 'search'
        ? 410
        : superNotchHudView === 'widgets'
        ? 285
        : 260
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
        {isChatView ? (
          /* ========================================================================= */
          /* DETACHED DYNAMIC ISLAND: TOP IDLE NOTCH WITH ORB + GAP + FLOATING CHAT   */
          /* ========================================================================= */
          <div className="w-full h-full flex flex-col items-center pointer-events-auto select-none relative">
            {/* 1. TOP HARDWARE NOTCH BEZEL WITH LIVING AI PERSONA ORB */}
            <div className="relative flex flex-col items-center shrink-0">
              {/* Notch Left Ear */}
              <svg
                width={10}
                height={10}
                viewBox="0 0 10 10"
                className="absolute top-0 -left-[10px] pointer-events-none z-20"
              >
                <path d="M 0 0 H 10 V 10 C 10 4.477 5.523 0 0 0 Z" fill="#000000" />
              </svg>
              {/* Notch Right Ear */}
              <svg
                width={10}
                height={10}
                viewBox="0 0 10 10"
                className="absolute top-0 -right-[10px] pointer-events-none z-20"
              >
                <path d="M 10 0 H 0 V 10 C 0 4.477 4.477 0 10 0 Z" fill="#000000" />
              </svg>

              {/* Notch Body with Orb */}
              <div className="w-[190px] h-[32px] rounded-b-2xl bg-black border-x border-b border-white/[0.12] flex items-center justify-center gap-2.5 px-3 shadow-lg relative overflow-hidden">
                {/* Dynamic Living Sound/Thinking AI Orb */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: isAIGenerating ? [1, 1.25, 0.95, 1.15, 1] : isRecording ? [1, 1.3, 1] : [1, 1.05, 1],
                      opacity: isAIGenerating ? [0.8, 1, 0.7, 0.9] : [0.6, 0.85, 0.6],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: isAIGenerating ? 1.6 : isRecording ? 0.8 : 3.2,
                      ease: 'easeInOut',
                    }}
                    className="h-3 rounded-full blur-[3px] transition-all duration-150"
                    style={{
                      width: isRecording ? `${38 + Math.min(50, audioLevel * 80)}px` : isAIGenerating ? '44px' : '32px',
                      background: isAIGenerating
                        ? 'linear-gradient(90deg, #a855f7 0%, #3b82f6 50%, #10b981 100%)' // Thinking
                        : isRecording
                        ? 'linear-gradient(90deg, #10b981 0%, #38bdf8 50%, #ec4899 100%)' // Listening
                        : 'linear-gradient(90deg, #e4e4e7 0%, #a1a1aa 50%, #d4d4d8 100%)', // Idle
                    }}
                  />
                  <motion.div
                    animate={{
                      scale: isAIGenerating ? [1, 1.1, 0.95, 1] : [1, 1.04, 1],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: isAIGenerating ? 1.2 : 2.5,
                      ease: 'easeInOut',
                    }}
                    className="absolute h-1.5 rounded-full bg-white transition-all duration-75"
                    style={{
                      width: isRecording ? `${16 + Math.min(24, audioLevel * 45)}px` : isAIGenerating ? '20px' : '14px',
                      boxShadow: isAIGenerating
                        ? '0 0 10px 2px rgba(168,85,247,0.8), 0 0 16px 3px rgba(59,130,246,0.6)'
                        : isRecording
                        ? '0 0 10px 2px rgba(16,185,129,0.8), 0 0 14px 2px rgba(56,189,248,0.7)'
                        : '0 0 8px 1px rgba(255,255,255,0.7), 0 0 12px 1px rgba(161,161,170,0.4)',
                    }}
                  />
                </div>

                <span className="text-[10px] font-mono font-medium tracking-tight text-zinc-300">
                  {isAIGenerating ? 'Thinking...' : isRecording ? 'Listening...' : 'SuperNotch AI'}
                </span>
              </div>
            </div>

            {/* 2. TRANSPARENT AIR GAP (10px) */}
            <div className="h-2.5 w-full shrink-0" />

            {/* 3. DETACHED FLOATING CHAT ISLAND WIDGET */}
            <div className="w-[580px] flex-1 rounded-[24px] bg-[#0c0c0e] border border-white/[0.12] p-3 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-xl">
              {/* Header: Back Button (←) + Model Dropdown + Screen Vision + Reset + Close */}
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/[0.05] shrink-0 relative z-20">
                <div className="flex items-center gap-2">
                  {/* Back Button to return to Shelf HUD */}
                  <button
                    type="button"
                    onClick={() => handleToggleView('shelf')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer text-xs font-medium"
                    title="Back to SuperShelf"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Shelf</span>
                  </button>

                  {/* Model Selector Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] px-2.5 py-1.5 rounded-xl border border-white/[0.08] text-xs text-white transition-all cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                      <span className="font-medium text-xs text-white">
                        {AVAILABLE_AI_MODELS.find((m) => m.id === selectedAIModel)?.name || 'Select Model'}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-150 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isModelDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={{ duration: 0.12 }}
                          className="absolute top-10 left-0 z-50 w-64 bg-[#16161b] border border-white/10 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl"
                        >
                          <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                            Select AI Model
                          </div>
                          <div className="space-y-0.5 max-h-56 overflow-y-auto custom-slim-scrollbar">
                            {AVAILABLE_AI_MODELS.map((model) => {
                              const isSelected = selectedAIModel === model.id;
                              return (
                                <button
                                  key={model.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAIModel(model.id);
                                    setIsModelDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-white/10 text-white font-medium'
                                      : 'text-zinc-300 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  <div className="min-w-0 pr-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate">{model.name}</span>
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-zinc-400 shrink-0">
                                        {model.badge}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 font-normal truncate">
                                      {model.description}
                                    </p>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Screen Vision Snapshot Toggle */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (isScreenVisionEnabled) {
                        setIsScreenVisionEnabled(false);
                        setCurrentScreenThumbnail(null);
                      } else {
                        try {
                          showStatus('Capturing screen...');
                          const snapshot = await captureScreenVision();
                          setCurrentScreenThumbnail(snapshot);
                          setIsScreenVisionEnabled(true);
                          showStatus(`${snapshot.width}×${snapshot.height} captured`);
                        } catch (e: any) {
                          showStatus('Screen capture failed');
                        }
                      }
                    }}
                    className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isScreenVisionEnabled
                        ? 'bg-white/15 text-white border-white/30 shadow-sm'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.06] hover:bg-white/[0.08]'
                    }`}
                    title={
                      isScreenVisionEnabled
                        ? 'Screen Context Attached (Click to detach)'
                        : 'See Screen (Click to capture active display)'
                    }
                  >
                    {isScreenVisionEnabled ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-white" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      </>
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>

                {/* Actions Right: Clear + Close */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setChatMessages([
                        {
                          id: `reset-${Date.now()}`,
                          role: 'assistant',
                          content: `Ready. Ask questions, format checklists, or click the eye icon to analyze your screen.`,
                          timestamp: Date.now(),
                          modelUsed: selectedAIModel,
                        },
                      ]);
                      setCurrentScreenThumbnail(null);
                      setIsScreenVisionEnabled(false);
                      showStatus('New session');
                    }}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="New Chat Session"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={closeShelf}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Close (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area with Smooth Gradient Fade Mask */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto px-1 py-2 space-y-2.5 pr-2 select-text custom-slim-scrollbar"
                style={{
                  maxHeight: '275px',
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 14px), transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 14px), transparent 100%)',
                }}
              >
                {chatMessages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-5 h-5 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                        </div>
                      )}

                      <div
                        className={`flex flex-col max-w-[85%] ${
                          isUser
                            ? 'bg-white/[0.08] text-white rounded-2xl rounded-tr-sm px-3 py-2 border border-white/10'
                            : 'bg-white/[0.03] text-zinc-200 rounded-2xl rounded-tl-sm px-3.5 py-2 border border-white/[0.05]'
                        }`}
                      >
                        {msg.hasScreenVision && msg.screenThumbnail && (
                          <div className="mb-1.5">
                            <img
                              src={msg.screenThumbnail}
                              alt="Screen Context"
                              className="w-40 h-24 object-cover rounded-lg border border-white/15"
                            />
                          </div>
                        )}

                        {/* Message Content: Clean, concise one-liners & checklists */}
                        <div className="text-xs leading-relaxed space-y-1 whitespace-pre-wrap font-sans">
                          {msg.content.split('\n\n').map((paragraph, pIdx) => {
                            if (paragraph.startsWith('### ')) {
                              return (
                                <h4 key={pIdx} className="font-semibold text-white text-xs pt-0.5">
                                  {paragraph.replace('### ', '')}
                                </h4>
                              );
                            }
                            if (paragraph.startsWith('- [ ] ') || paragraph.startsWith('- [x] ')) {
                              return (
                                <div key={pIdx} className="font-mono text-[11px] text-zinc-300">
                                  {paragraph}
                                </div>
                              );
                            }
                            if (paragraph.startsWith('- ')) {
                              return (
                                <div key={pIdx} className="text-zinc-300 pl-1 text-[11px]">
                                  {paragraph}
                                </div>
                              );
                            }
                            return <p key={pIdx}>{paragraph}</p>;
                          })}
                        </div>

                        {/* Minimal Icon Actions: Copy + Save to Notes */}
                        {!isUser && (
                          <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-white/[0.04]">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                showStatus('Copied');
                              }}
                              className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Copy to clipboard"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveNoteDirect(msg.content)}
                              className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Save to Notes"
                            >
                              <FileText className="w-3 h-3 text-zinc-400 hover:text-white" />
                            </button>
                            {msg.modelUsed && (
                              <span className="ml-auto font-mono text-[8.5px] text-zinc-500">
                                {msg.modelUsed}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-5 h-5 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 mt-0.5 text-[10px] font-semibold">
                          U
                        </div>
                      )}
                    </div>
                  );
                })}

                {isAIGenerating && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-5 h-5 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5 animate-pulse">
                      <Sparkles className="w-2.5 h-2.5" />
                    </div>
                    <div className="bg-white/[0.03] rounded-2xl rounded-tl-sm px-3 py-1.5 border border-white/[0.05] text-xs text-zinc-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>{isScreenVisionEnabled ? 'Analyzing screen...' : 'Thinking...'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Minimal Input Area */}
              <div className="pt-1.5 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.07] focus-within:bg-white/[0.08] focus-within:ring-1 focus-within:ring-white/20 rounded-xl px-3 py-2 transition-all border border-white/[0.06]"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      isScreenVisionEnabled
                        ? "Ask about visible screen context..."
                        : "Ask AI, format checklist, or diagnose code..."
                    }
                    disabled={isAIGenerating}
                    className="w-full bg-transparent border-none text-[12px] text-white placeholder:text-zinc-500 focus:outline-none select-text font-normal cursor-text"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isAIGenerating}
                    className="p-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-30 transition-all cursor-pointer shrink-0"
                    title="Send (↵)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <>
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

        {/* Main Notch Body Container (Pure SuperShelf Crisp Hardware Profile - Zero Blurry Drop Shadow) */}
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
          {/* 1. IDLE NOTCH VIEW (Pure Hardware Bezel - ZERO TEXT by default, or Live Focus Activity) */}
          {activeMode === 'idle' && (
            <motion.div
              key="idle-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full cursor-pointer bg-black flex items-center justify-center px-3"
              title={
                focusTimerRunning
                  ? `Focus session: ${formatTime(focusTimerRemaining)} remaining (Click to open)`
                  : 'Click or press ⌥V to open SuperShelf'
              }
            >
              {noteSavedFeedback ? (
                <div className="flex items-center justify-center gap-1.5 text-amber-300">
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400">
                    <FileText className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[10px] font-sans font-semibold tracking-tight text-white flex items-center gap-1">
                    {noteSavedFeedback}
                    <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-amber-400/50" />
                  </span>
                </div>
              ) : isMeetingScribeActive ? (
                <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                  <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
                    <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping opacity-60" />
                    <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <span className="font-mono text-[10.5px] font-bold text-emerald-300 tracking-wider">
                    REC {formatTime(meetingElapsedSecs)}
                  </span>
                </div>
              ) : inspectedWebData ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    openShelf('search');
                    setClipboardSearchQuery('/inspect ');
                  }}
                  className="flex items-center justify-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title={`${inspectedWebData.total_assets_count} extracted assets (Click to view)`}
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-mono text-[10.5px] font-bold tracking-tight text-white">
                    {inspectedWebData.total_assets_count} Assets
                  </span>
                </div>
              ) : focusTimerRunning ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
                    <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping opacity-60" />
                    <FocusReticleIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-amber-300 tracking-wider">
                    {formatTime(focusTimerRemaining)}
                  </span>
                </div>
              ) : null}
            </motion.div>
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
              {/* TOP HEADER: Clean Minimal Search + Unboxed Icon Toggles (SuperShelf) */}
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

                  {/* Distinct Tab Toggles: Clean Icon-Only Toggles: 1. Shelf, 2. Widgets, 3. Extensions, 4. AI Chat */}
                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] ml-1">
                    {/* Tab 1: SuperShelf Shelf View */}
                    <button
                      onClick={() => handleToggleView('shelf')}
                      className={`p-2 rounded-lg transition-all cursor-pointer ${
                        superNotchHudView === 'shelf'
                          ? 'bg-white/15 text-white shadow-sm border border-white/10'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                      title="SuperShelf Clipboard Shelf (Tab)"
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

                    {/* Tab 3: Extensions & Quick Search */}
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

                    {/* Tab 4: AI Chat & Screen Copilot */}
                    <button
                      onClick={() => handleToggleView('chat')}
                      className={`p-2 rounded-lg transition-all cursor-pointer ${
                        superNotchHudView === 'chat'
                          ? 'bg-amber-400/20 text-amber-300 shadow-sm border border-amber-400/30'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                      title="AI Chat & Screen Copilot (Tab)"
                    >
                      <Bot className="w-4 h-4" />
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
              {/* VIEW A: SUPERSHELF HORIZONTAL VISUAL SHELF                       */}
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

                  {/* Horizontal Shelf Stream (155px x 120px cards with adaptive soft edge scroll dissolve) */}
                  <div
                    ref={shelfScrollRef}
                    className="flex flex-row gap-2.5 overflow-x-auto pt-1 pb-1.5 px-3 items-stretch flex-1 custom-slim-scrollbar"
                    style={{
                      maskImage: shelfMask,
                      WebkitMaskImage: shelfMask,
                    }}
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
                  {/* Results List with Soft Edge Dissolve */}
                  <div
                    ref={searchListScrollRef}
                    className="flex-1 overflow-y-auto custom-slim-scrollbar space-y-0.5 pr-1 max-h-[300px]"
                    style={{
                      maskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)',
                    }}
                  >
                    {/* Deep Focus Session Live Card (/focus, /focus 14, /focus 46) */}
                    {focusLiveMatch && (
                      <div className="mb-2 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/[0.14] border border-amber-500/25 transition-all flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/20">
                              <FocusReticleIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white tracking-tight">
                                  {focusTimerRunning
                                    ? `Focus Active: ${formatTime(focusTimerRemaining)} left`
                                    : `Deep Focus Session (${focusLiveMatch.minutes}m)`}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 uppercase font-semibold">
                                  {focusTimerRunning ? 'In Progress' : 'Ready'}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-zinc-400 font-mono mt-0.5">
                                Task: {focusTimerRunning ? focusTaskName : focusLiveMatch.task} • Countdown shows in hardware notch
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {focusTimerRunning ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    pauseFocusTimer();
                                    showStatus('Focus session paused ⏸');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white flex items-center gap-1 transition-all"
                                  title="Pause Session"
                                >
                                  <Pause className="w-3 h-3" />
                                  <span>Pause</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resetFocusTimer();
                                    showStatus('Focus session reset');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-[11px] font-medium text-red-300 flex items-center gap-1 transition-all"
                                  title="Cancel/Reset Session"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reset</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartFocusSession(focusLiveMatch.minutes, focusLiveMatch.task);
                                }}
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Start ↵</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick Preset Chips [15m] [25m] [45m] [60m] */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-amber-500/15">
                          <span className="text-[10px] text-zinc-400 font-mono mr-1">Presets:</span>
                          {[15, 25, 45, 60].map((mins) => {
                            const isCurrent = focusLiveMatch.minutes === mins;
                            return (
                              <button
                                key={mins}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartFocusSession(mins, focusLiveMatch.task);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10.5px] font-mono transition-all ${
                                  isCurrent
                                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300'
                                }`}
                              >
                                {mins}m
                              </button>
                            );
                          })}
                          <span className="ml-auto text-[10px] text-zinc-500 font-mono">
                            Type /focus &lt;minutes&gt;
                          </span>
                        </div>
                      </div>
                    )}

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

                    {/* Checklist & Markdown Tasks Live Card */}
                    {checklistLiveMatch && (
                      <div className="mb-2 p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/[0.14] border border-emerald-500/25 transition-all flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                              <CheckSquare className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white tracking-tight">
                                  Markdown Checklist
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase font-semibold">
                                  Formatted
                                </span>
                              </div>
                              <p className="text-[10.5px] text-zinc-400 font-mono mt-0.5">
                                Converted into interactive checkboxes
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveNoteDirect(checklistLiveMatch.raw, true)}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-all"
                            >
                              Save to Notes
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePaste(checklistLiveMatch.checklist)}
                              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-semibold flex items-center gap-1 transition-all"
                            >
                              <CornerDownLeft className="w-3 h-3" />
                              <span>Paste ↵</span>
                            </button>
                          </div>
                        </div>

                        {/* Checklist Preview */}
                        <div className="p-2 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono text-zinc-300 space-y-1 max-h-32 overflow-y-auto custom-slim-scrollbar">
                          {checklistLiveMatch.checklist.split('\n').map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">[ ]</span>
                              <span>{item.replace(/^\-\s*\[\s*\]\s*/, '')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Emoji & Unicode Instant Finder Live Card */}
                    {emojiLiveMatch && (
                      <div className="mb-2 p-3 rounded-xl bg-white/[0.06] border border-white/10 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                          <span className="flex items-center gap-1.5 text-white font-semibold">
                            <Smile className="w-3.5 h-3.5 text-amber-400" />
                            Unicode & Emoji Finder
                          </span>
                          <span>Click to copy & paste</span>
                        </div>
                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 pt-1">
                          {emojiLiveMatch.results.map((sym, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handlePaste(sym.char)}
                              title={`${sym.name} (${sym.category})`}
                              className="h-10 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] hover:scale-110 active:scale-95 border border-white/[0.06] hover:border-white/20 flex flex-col items-center justify-center transition-all cursor-pointer group"
                            >
                              <span className="text-base select-none">{sym.char}</span>
                              <span className="text-[8.5px] text-zinc-500 truncate max-w-[42px] font-mono group-hover:text-zinc-300">
                                {sym.name.split(' ')[0]}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Color Palette & Contrast Live Card */}
                    {colorLiveMatch && (
                      <div className="mb-2 p-3 rounded-xl bg-white/[0.06] border border-white/10 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-pink-400" />
                            <span className="text-xs font-semibold text-white font-mono">
                              {colorLiveMatch.type === 'single' ? 'Color Analysis & Tokens' : 'Recent Color Swatches'}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">Click swatch to copy</span>
                        </div>

                        {colorLiveMatch.type === 'single' && colorLiveMatch.details ? (
                          <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-black/40 border border-white/[0.06]">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg border border-white/20 shadow-inner shrink-0"
                                style={{ backgroundColor: colorLiveMatch.details.hex }}
                              />
                              <div>
                                <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                                  <span>{colorLiveMatch.details.hex}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-normal">
                                    {colorLiveMatch.details.tailwind}
                                  </span>
                                </div>
                                <div className="text-[10.5px] font-mono text-zinc-400 mt-0.5">
                                  {colorLiveMatch.details.rgb} • {colorLiveMatch.details.hsl}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <div className="text-right">
                                <div className="text-zinc-500">WCAG AA</div>
                                <div className={colorLiveMatch.details.wcagWhiteRating === 'Fail' ? 'text-red-400' : 'text-emerald-400'}>
                                  on White: {colorLiveMatch.details.wcagWhiteRating}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePaste(colorLiveMatch.details!.hex)}
                                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1 transition-all"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 overflow-x-auto py-1 custom-slim-scrollbar">
                            {colorLiveMatch.colors?.map((c, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handlePaste(c)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 transition-all shrink-0 cursor-pointer group"
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                                  style={{ backgroundColor: c }}
                                />
                                <span className="text-[11px] font-mono text-zinc-300 group-hover:text-white">
                                  {c}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ambient Meeting Scribe Live Card */}
                    {(meetingLiveMatch || isMeetingScribeActive) && (
                      <div className="mb-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Radio className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white tracking-tight">
                                Ambient Meeting & Lecture Scribe
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase font-semibold">
                                {isMeetingScribeActive ? `Active (${formatTime(meetingElapsedSecs)})` : 'Standby'}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-zinc-400 font-mono mt-0.5">
                              {isMeetingScribeActive
                                ? 'Continuous background chunking • Transcripts auto-logged into Notes'
                                : 'Transcribes Zoom, lectures, or ambient discussions directly to Notes'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleToggleMeetingScribe}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isMeetingScribeActive
                              ? 'bg-red-500 hover:bg-red-400 text-white'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                          }`}
                        >
                          {isMeetingScribeActive ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>Stop Scribe</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Start Scribe ↵</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Web Asset & Palette Inspector Live Card */}
                    {(inspectLiveMatch || inspectedWebData) && (
                      <div className="mb-2 p-3 rounded-xl bg-white/[0.06] border border-cyan-500/25 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-semibold text-white font-mono">
                              Web Asset & Palette Inspector
                            </span>
                            {inspectedWebData && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                                {inspectedWebData.total_assets_count} Items
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {inspectLiveMatch && !isInspectingWeb && (
                              <button
                                type="button"
                                onClick={() => handleRunWebInspection(inspectLiveMatch.url)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-semibold flex items-center gap-1 transition-all"
                              >
                                <Search className="w-3 h-3" />
                                <span>Inspect ↵</span>
                              </button>
                            )}
                            {inspectedWebData && (
                              <button
                                type="button"
                                onClick={() => setInspectedWebData(null)}
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {isInspectingWeb ? (
                          <div className="p-4 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-center gap-2 text-xs font-mono text-cyan-300">
                            <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <span>Scraping DOM colors, SVGs, images & OpenGraph tags...</span>
                          </div>
                        ) : inspectedWebData ? (
                          <div className="space-y-2">
                            {/* Tab switcher */}
                            <div className="flex items-center gap-1 border-b border-white/[0.08] pb-1.5">
                              {[
                                { id: 'palette', label: `Palette (${inspectedWebData.colors.length})`, icon: Palette },
                                { id: 'media', label: `SVGs & Images (${inspectedWebData.svgs.length + inspectedWebData.images.length})`, icon: Layers },
                                { id: 'fonts', label: `Typography (${inspectedWebData.fonts.length})`, icon: Type },
                                { id: 'meta', label: 'Meta & OG', icon: ExternalLink },
                              ].map((tab) => {
                                const Icon = tab.icon;
                                const isTabActive = webInspectorTab === tab.id;
                                return (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setWebInspectorTab(tab.id as any)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                                      isTabActive
                                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                                    }`}
                                  >
                                    <Icon className="w-3 h-3" />
                                    <span>{tab.label}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Tab 1: Palette */}
                            {webInspectorTab === 'palette' && (
                              <div className="flex items-center gap-2 overflow-x-auto py-1 custom-slim-scrollbar">
                                {inspectedWebData.colors.length === 0 ? (
                                  <span className="text-[11px] font-mono text-zinc-500">No color swatches extracted</span>
                                ) : (
                                  inspectedWebData.colors.map((c, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => handlePaste(c)}
                                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 transition-all shrink-0 cursor-pointer group"
                                    >
                                      <span
                                        className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                                        style={{ backgroundColor: c }}
                                      />
                                      <span className="text-[11px] font-mono text-zinc-300 group-hover:text-white">
                                        {c}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}

                            {/* Tab 2: Media & SVGs */}
                            {webInspectorTab === 'media' && (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-slim-scrollbar p-1">
                                {inspectedWebData.images.concat(inspectedWebData.svgs).slice(0, 10).map((img, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between p-1.5 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono"
                                  >
                                    <span className="text-zinc-300 truncate max-w-[420px]">{img}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handlePaste(img)}
                                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white"
                                      >
                                        Copy URL
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tab 3: Typography */}
                            {webInspectorTab === 'fonts' && (
                              <div className="flex flex-wrap gap-1.5 p-1">
                                {inspectedWebData.fonts.length === 0 ? (
                                  <span className="text-[11px] font-mono text-zinc-500">No custom fonts detected</span>
                                ) : (
                                  inspectedWebData.fonts.map((f, i) => (
                                    <span
                                      key={i}
                                      onClick={() => handlePaste(f)}
                                      className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono text-zinc-300 hover:text-white cursor-pointer hover:border-cyan-500/40"
                                    >
                                      {f}
                                    </span>
                                  ))
                                )}
                              </div>
                            )}

                            {/* Tab 4: Meta */}
                            {webInspectorTab === 'meta' && (
                              <div className="p-2 rounded-lg bg-black/40 border border-white/[0.06] space-y-1 text-xs">
                                <div className="font-semibold text-white truncate">{inspectedWebData.title || 'No Title'}</div>
                                <div className="text-zinc-400 text-[11px] line-clamp-2">{inspectedWebData.description || 'No description meta tag'}</div>
                                <div className="text-cyan-400 font-mono text-[10px] truncate">{inspectedWebData.url}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono text-zinc-400">
                            Type <span className="text-cyan-300 font-bold">/inspect &lt;url&gt;</span> (e.g. /inspect https://linear.app) and press ↵ to extract design assets.
                          </div>
                        )}
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
                          {/* Section: Installed macOS Applications (Instant Launch) */}
                          {searchResults.apps.length > 0 && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-cyan-400 font-sans tracking-normal">
                                <span className="flex items-center gap-1.5">
                                  <AppWindow className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Applications</span>
                                </span>
                                <span className="text-[10px] font-mono text-cyan-400/70 font-normal">
                                  {searchResults.apps.length}
                                </span>
                              </div>
                              {searchResults.apps.map((app, appIdx) => {
                                const isSelected = searchSelectedIndex === appIdx;
                                return (
                                  <div
                                    key={app.id}
                                    onClick={() => {
                                      invoke('launch_application', { appPath: app.path }).catch(() => {});
                                      showStatus(`Launching ${app.name}...`);
                                      closeShelf();
                                    }}
                                    onMouseEnter={() => setSearchSelectedIndex(appIdx)}
                                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-white shadow-sm'
                                        : 'hover:bg-white/[0.04] text-zinc-300 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-6 h-6 rounded-md bg-cyan-500/15 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs">
                                        <AppWindow className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="text-xs font-semibold text-white truncate font-sans">
                                          {app.name}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 truncate hidden md:inline font-mono">
                                          {app.path}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-cyan-300 px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20">
                                      Launch ↵
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Section: Extensions & Tools */}
                          {searchResults.commands.length > 0 && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-zinc-400 font-sans tracking-normal">
                                <span>Extensions & Commands</span>
                                <span className="text-[10px] font-mono text-zinc-500 font-normal">
                                  {searchResults.commands.length}
                                </span>
                              </div>
                              {searchResults.commands.map((cmd, i) => {
                                const overallCmdIndex = searchResults.apps.length + i;
                                const isSelected = searchSelectedIndex === overallCmdIndex;
                                const CmdIcon = cmd.icon;
                                const isUserExt = (cmd as any).isUserExtension;
                                const userIcon = (cmd as any).userIcon;

                                return (
                                  <div
                                    key={cmd.id}
                                    onClick={() => cmd.action()}
                                    onMouseEnter={() => setSearchSelectedIndex(overallCmdIndex)}
                                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
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
                                        {/* Refined Command Badge: Dark Gray Pill with Warm Amber Slash */}
                                        <div
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border font-mono text-[11px] font-medium tracking-tight shadow-sm flex-shrink-0 transition-colors ${
                                            isSelected
                                              ? 'bg-black/60 border-amber-500/30 text-white'
                                              : 'bg-[#16161a] border-white/[0.08] text-zinc-300'
                                          }`}
                                        >
                                          <span className="text-amber-400 font-bold mr-0.5">/</span>
                                          <span>
                                            {cmd.command.startsWith('/')
                                              ? cmd.command.slice(1)
                                              : cmd.command}
                                          </span>
                                        </div>
                                        <span className="text-xs font-medium text-white truncate font-sans">
                                          {cmd.title}
                                        </span>
                                        <span className="text-[11px] text-zinc-400 truncate hidden md:inline font-sans">
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
                              <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-zinc-400 font-sans tracking-normal">
                                <span>Clipboard & Dictations</span>
                                <span className="text-[10px] font-mono text-zinc-500 font-normal">
                                  {searchResults.clips.length}
                                </span>
                              </div>
                              {searchResults.clips.map((item, idx) => {
                                const overallIndex = searchResults.apps.length + searchResults.commands.length + idx;
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

                    {/* Raycast Keyboard Footer with 1-Click Extensions Access */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-white/[0.04] font-sans">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono">
                          <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">↵</kbd>
                          <span className="font-sans">Open</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">↑↓</kbd>
                          <span className="font-sans">Navigate</span>
                        </span>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await invoke('open_extensions_folder');
                              showStatus('Opened ~/.dopenotch/extensions');
                            } catch {}
                          }}
                          className="flex items-center gap-1 text-zinc-400 hover:text-amber-400 transition-colors ml-1 cursor-pointer group"
                          title="Open extensions folder in Finder to add your own scripts"
                        >
                          <FolderOpen className="w-3 h-3 text-amber-400/80 group-hover:text-amber-400" />
                          <span>Custom Scripts (~/.dopenotch)</span>
                        </button>
                      </div>
                      <span className="flex items-center gap-1 font-mono">
                        <kbd className="px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300">Esc</kbd>
                        <span className="font-sans">Close</span>
                      </span>
                    </div>
                  </div>
              )}

              {/* ================================================================= */}
              {/* VIEW C: WIDGETS & MEDIA VIEW                                     */}
              {/* ================================================================= */}
              {/* ================================================================= */}
              {/* VIEW C: WIDGETS & MEDIA VIEW (Clean, No Clutter, Direct Fit)      */}
              {/* ================================================================= */}
              {superNotchHudView === 'widgets' && (
                <div className="flex-1 flex flex-col justify-start pt-0.5 overflow-hidden">
                  <WidgetsView />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </>
    )}
    </motion.div>
  </div>
  );
};
