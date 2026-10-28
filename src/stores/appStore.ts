import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export type SidebarTab =
  | 'welcome'
  | 'aiSettings'
  | 'voiceEngine'
  | 'aiEnhancements'
  | 'commandMode'
  | 'writeMode'
  | 'rewriteMode'
  | 'fileTranscription'
  | 'meetingTools'
  | 'cleanupStyles'
  | 'customDictionary'
  | 'stats'
  | 'history'
  | 'notes'
  | 'extensions'
  | 'preferences'
  | 'changelog'
  | 'feedback';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  char_count: number;
  word_count: number;
  is_pinned: boolean;
}

export type OverlayStyle = 'notch' | 'minimal' | 'hidden';
export type RecordingMode = 'dictate' | 'prompt' | 'rewrite' | 'command';
export type SuperNotchMode = 'idle' | 'recording' | 'shelf';
export type SuperNotchHudView = 'search' | 'shelf' | 'widgets' | 'chat' | 'stash';
export type OrbTheme = 'aurora' | 'brand';
export type ClipboardCategory = 'all' | 'stash' | 'image' | 'dictation' | 'clipboard' | 'pinned' | 'code' | 'link' | 'color';

export interface StashItem {
  id: string;
  name: string;
  path: string;
  size: number;
  formattedSize: string;
  kind: 'image' | 'code' | 'document' | 'archive' | 'file' | 'link' | 'text';
  previewData?: string;
  timestamp?: number;
}

export interface ClipboardItem {
  id: string;
  content: string;
  category: 'dictation' | 'clipboard' | 'code' | 'link' | 'color' | 'image';
  timestamp: string;
  timestampRaw: number;
  isPinned: boolean;
  sourceApp?: string;
  charCount: number;
  wordCount: number;
}

export interface SpeechModelInfo {
  id: string;
  name: string;
  provider: 'Local Whisper' | 'OpenAI' | 'NVIDIA' | 'Apple' | 'Cloud';
  description: string;
  languages: string;
  languageCount: number;
  speedRating: number; // 1-5
  speedPercent: number; // 0.0 - 1.0
  accuracyPercent: number; // 0.0 - 1.0
  ramFootprint: string;
  diskSize: string;
  isInstalled: boolean;
  isStreaming: boolean;
  isDefault?: boolean;
}

export interface PromptRoutingRule {
  id: string;
  appName: string;
  appIdentifier: string;
  icon: string;
  styleName: string;
  prompt: string;
  isEnabled: boolean;
}

export interface CustomDictionaryEntry {
  id: string;
  trigger: string;
  replacement: string;
  category: 'word' | 'punctuation' | 'acronym';
  isEnabled: boolean;
}

export interface TranscriptionRecord {
  id: string;
  timestamp: string;
  durationSeconds: number;
  rawText: string;
  enhancedText?: string;
  appName: string;
  speakingWPM: number;
  latencyMs: number;
  modelUsed: string;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  words: number;
  transcriptions: number;
  minutesSaved: number;
}

export type AIVoicePersona = 'female-cheerful' | 'male-jolly' | 'female-classic' | 'male-british' | 'cyber-husky';

export interface AIVoicePersonaInfo {
  id: AIVoicePersona;
  name: string;
  character: string;
  gender: 'female' | 'male' | 'ai';
  description: string;
  tag: string;
  macOSVoice: string;
  browserVoice: string;
  recommendedRate: number;
}

export const AI_VOICE_PERSONAS: AIVoicePersonaInfo[] = [
  {
    id: 'female-cheerful',
    name: 'Nova (Cheerful Female)',
    character: 'Bright, cheerful, and sunny AI companion',
    gender: 'female',
    description: 'High-energy, warm, and natural Siri US female voice. Upbeat and enthusiastic tone.',
    tag: 'Default Female',
    macOSVoice: 'Nicky',
    browserVoice: 'Nicky',
    recommendedRate: 1.0,
  },
  {
    id: 'male-jolly',
    name: 'Leo (Jolly Male)',
    character: 'Friendly, upbeat, and enthusiastic assistant',
    gender: 'male',
    description: 'Crisp, jolly, natural Siri US male voice. Energetic and encouraging for coding and daily tasks.',
    tag: 'Default Male',
    macOSVoice: 'Aaron',
    browserVoice: 'Aaron',
    recommendedRate: 1.0,
  },
  {
    id: 'female-classic',
    name: 'Samantha (Apple Classic)',
    character: 'Clear, smooth, and friendly American female',
    gender: 'female',
    description: 'The iconic Apple US natural voice. Balanced, clear, and articulate.',
    tag: 'Natural Classic',
    macOSVoice: 'Samantha',
    browserVoice: 'Samantha',
    recommendedRate: 1.0,
  },
  {
    id: 'male-british',
    name: 'Daniel (British Scholar)',
    character: 'Warm, refined, and articulate gentleman',
    gender: 'male',
    description: 'Distinguished British English male voice. Calm, articulate, and friendly.',
    tag: 'Refined Male',
    macOSVoice: 'Daniel',
    browserVoice: 'Daniel',
    recommendedRate: 1.0,
  },
  {
    id: 'cyber-husky',
    name: 'Titan (Cyber Husky)',
    character: 'Calm, holographic, low-frequency AI presence',
    gender: 'ai',
    description: 'Futuristic, algorithmic companion with deep resonant undertones.',
    tag: 'High-Tech',
    macOSVoice: 'Fred',
    browserVoice: 'Daniel',
    recommendedRate: 0.98,
  },
];

export interface LicenseInfo {
  key: string;
  tier: 'community' | 'core' | 'forever' | string;
  is_pro: boolean;
  activation_id?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  activated_at?: string | null;
  limit_activations?: number | null;
}

interface AppState {
  // Navigation
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  settingsSection: 'general' | 'dictation' | 'audio' | 'overlay' | 'data' | 'license' | 'experimental';
  setSettingsSection: (section: 'general' | 'dictation' | 'audio' | 'overlay' | 'data' | 'license' | 'experimental') => void;

  // License & Entitlements
  licenseInfo: LicenseInfo;
  setLicenseInfo: (info: LicenseInfo) => void;
  fetchLicenseInfo: () => Promise<LicenseInfo | null>;
  activateLicense: (key: string, label?: string) => Promise<{ success: boolean; error?: string }>;
  deactivateLicense: () => Promise<{ success: boolean; error?: string }>;

  // General Preferences
  hotkey: string;
  secondaryHotkey: string;
  rewriteHotkey: string;
  commandHotkey: string;
  pushToTalk: boolean;
  autoPaste: boolean;
  soundEffects: boolean;
  simulateNotchCutout: boolean;
  setSimulateNotchCutout: (sim: boolean) => void;
  launchAtStartup: boolean;
  overlayStyle: OverlayStyle;
  typingWPM: number;
  audioHistoryBudgetGB: number;

  setHotkey: (hotkey: string) => void;
  setSecondaryHotkey: (secondaryHotkey: string) => void;
  setPushToTalk: (ptt: boolean) => void;
  setAutoPaste: (auto: boolean) => void;
  setSoundEffects: (enabled: boolean) => void;
  setOverlayStyle: (style: OverlayStyle) => void;
  setTypingWPM: (wpm: number) => void;

  // Speech Models Catalog
  selectedSpeechModel: string;
  models: SpeechModelInfo[];
  downloadProgress: Record<string, number>;
  setSelectedSpeechModel: (modelId: string) => void;
  setDownloadProgress: (modelId: string, progress: number) => void;
  markModelInstalled: (modelId: string) => void;

  // AI Enhancement
  selectedAIProvider: 'groq' | 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'local';
  apiKeys: Record<string, string>;
  selectedModelByProvider: Record<string, string>;
  setSelectedAIProvider: (provider: 'groq' | 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'local') => void;
  setApiKey: (provider: string, key: string) => void;
  setModelForProvider: (provider: string, model: string) => void;

  // AI Voice & Speech Output
  aiVoicePersona: AIVoicePersona;
  aiVoiceRate: number;
  aiVoiceAutoSpeak: boolean;
  setAIVoicePersona: (persona: AIVoicePersona) => void;
  setAIVoiceRate: (rate: number) => void;
  setAIVoiceAutoSpeak: (autoSpeak: boolean) => void;

  // Per-App Prompt Routing
  promptRules: PromptRoutingRule[];
  addPromptRule: (rule: PromptRoutingRule) => void;
  updatePromptRule: (id: string, updates: Partial<PromptRoutingRule>) => void;
  deletePromptRule: (id: string) => void;

  // Custom Dictionary
  dictionaryEntries: CustomDictionaryEntry[];
  addDictionaryEntry: (entry: CustomDictionaryEntry) => void;
  updateDictionaryEntry: (id: string, updates: Partial<CustomDictionaryEntry>) => void;
  deleteDictionaryEntry: (id: string) => void;

  // Stats & History
  wordsToday: number;
  timeSavedMinutesToday: number;
  currentStreakDays: number;
  totalWordsDictated: number;
  totalTranscriptions: number;
  activityHistory: DailyActivity[];
  historyRecords: TranscriptionRecord[];
  addTranscriptionRecord: (record: TranscriptionRecord) => void;
  clearHistory: () => void;

  // Live Recording & Notch
  isRecording: boolean;
  audioLevel: number;
  streamingText: string;
  recordingMode: RecordingMode;
  superNotchMode: SuperNotchMode;
  superNotchHudView: SuperNotchHudView;
  orbTheme: OrbTheme;
  liveWPM: number;
  liveLatencyMs: number;
  setIsRecording: (recording: boolean) => void;
  setAudioLevel: (level: number) => void;
  setStreamingText: (text: string) => void;
  setRecordingMode: (mode: RecordingMode) => void;
  setSuperNotchMode: (mode: SuperNotchMode) => void;
  setSuperNotchHudView: (view: SuperNotchHudView) => void;
  setOrbTheme: (theme: OrbTheme) => void;
  setLiveMetrics: (wpm: number, latencyMs: number) => void;

  // SuperShelf Clipboard Manager
  clipboardItems: ClipboardItem[];
  activeClipboardCategory: ClipboardCategory;
  clipboardSearchQuery: string;
  setActiveClipboardCategory: (category: ClipboardCategory) => void;
  setClipboardSearchQuery: (query: string) => void;
  setClipboardItems: (items: ClipboardItem[]) => void;
  addClipboardItem: (item: {
    content: string;
    category?: 'dictation' | 'clipboard' | 'code' | 'link' | 'color';
    sourceApp?: string;
    isPinned?: boolean;
  }) => void;
  togglePinClipboardItem: (id: string) => void;
  deleteClipboardItem: (id: string) => void;
  clearClipboardItems: () => void;

  // Magnetic Stash Shelf (Drop-to-Notch)
  stashItems: StashItem[];
  addStashItems: (items: StashItem[]) => void;
  removeStashItem: (id: string) => void;
  clearStashItems: () => void;

  // Audio Devices
  inputDevices: Array<{ id: string; name: string }>;
  selectedInputDevice: string;
  setInputDevices: (devices: Array<{ id: string; name: string }>) => void;
  setSelectedInputDevice: (id: string) => void;

  // Focus Mode / Pomodoro Live Activity
  focusTimerRunning: boolean;
  focusTimerRemaining: number;
  focusTimerDuration: number;
  focusTaskName: string;
  setFocusTimerRunning: (running: boolean) => void;
  setFocusTimerRemaining: (secs: number) => void;
  setFocusTimerDuration: (secs: number) => void;
  setFocusTaskName: (task: string) => void;
  startFocusTimer: (durationMinutes?: number, task?: string) => void;
  pauseFocusTimer: () => void;
  resetFocusTimer: (newDurationMinutes?: number) => void;
  tickFocusTimer: () => void;

  // Notes State
  notes: NoteItem[];
  setNotes: (notes: NoteItem[]) => void;
  addNote: (note: NoteItem) => void;
  deleteNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<NoteItem>) => void;
}

const INITIAL_MODELS: SpeechModelInfo[] = [
  {
    id: 'whisper-base',
    name: 'Whisper Base (Local GGML)',
    provider: 'Local Whisper',
    description: 'Default on-device Whisper engine. Sub-90ms latency, 100% offline, zero API keys required.',
    languages: '99 Languages (Auto-Detect)',
    languageCount: 99,
    speedRating: 5,
    speedPercent: 0.95,
    accuracyPercent: 0.93,
    ramFootprint: '~180 MB',
    diskSize: '142 MB',
    isInstalled: true,
    isStreaming: false,
    isDefault: true,
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small (High Precision)',
    provider: 'Local Whisper',
    description: 'High accuracy local model with superior handling of technical jargon and accents.',
    languages: '99 Languages (Auto-Detect)',
    languageCount: 99,
    speedRating: 4,
    speedPercent: 0.85,
    accuracyPercent: 0.97,
    ramFootprint: '~450 MB',
    diskSize: '466 MB',
    isInstalled: true,
    isStreaming: false,
  },
  {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large v3 Turbo (Studio)',
    provider: 'Local Whisper',
    description: 'State-of-the-art local transcription precision with Metal and CPU vectorization.',
    languages: '99 Languages (Auto-Detect)',
    languageCount: 99,
    speedRating: 4,
    speedPercent: 0.82,
    accuracyPercent: 0.99,
    ramFootprint: '~1.1 GB',
    diskSize: '1.5 GB',
    isInstalled: false,
    isStreaming: false,
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny (Lightweight)',
    provider: 'Local Whisper',
    description: 'Extremely fast footprint for quick speech dictation on battery saver.',
    languages: '99 Languages (Auto-Detect)',
    languageCount: 99,
    speedRating: 5,
    speedPercent: 0.99,
    accuracyPercent: 0.88,
    ramFootprint: '~90 MB',
    diskSize: '75 MB',
    isInstalled: false,
    isStreaming: false,
  },
  {
    id: 'whisper-medium',
    name: 'Whisper Medium (Deep Multilingual)',
    provider: 'Local Whisper',
    description: 'Heavyweight local recognition engine optimized for complex multi-speaker audio.',
    languages: '99 Languages (Auto-Detect)',
    languageCount: 99,
    speedRating: 3,
    speedPercent: 0.70,
    accuracyPercent: 0.98,
    ramFootprint: '~1.2 GB',
    diskSize: '1.5 GB',
    isInstalled: false,
    isStreaming: false,
  },
  {
    id: 'cloud-turbo',
    name: 'Cloud Turbo (Groq Whisper)',
    provider: 'Cloud',
    description: 'Sub-180ms cloud fallback transcription via Groq LPU with zero local RAM footprint.',
    languages: '99 Languages supported',
    languageCount: 99,
    speedRating: 5,
    speedPercent: 0.98,
    accuracyPercent: 0.96,
    ramFootprint: '0 MB',
    diskSize: '0 MB',
    isInstalled: true,
    isStreaming: true,
  },
  {
    id: 'apple-speech',
    name: 'Apple Speech Recognition',
    provider: 'Apple',
    description: 'Zero-download macOS native speech engine leveraging Apple Neural Engine.',
    languages: 'System Languages',
    languageCount: 30,
    speedRating: 4,
    speedPercent: 0.88,
    accuracyPercent: 0.90,
    ramFootprint: 'Built-in',
    diskSize: '0 MB',
    isInstalled: true,
    isStreaming: true,
  },
];

const INITIAL_PROMPT_RULES: PromptRoutingRule[] = [
  {
    id: 'slack',
    appName: 'Slack',
    appIdentifier: 'com.tinyspeck.slackmacgap',
    icon: 'MessageSquare',
    styleName: 'Casual & Direct',
    prompt: 'Clean up transcription. Keep it natural, casual, concise, and friendly. No greetings or fluff.',
    isEnabled: true,
  },
  {
    id: 'mail',
    appName: 'Mail / Outlook',
    appIdentifier: 'com.apple.mail',
    icon: 'Mail',
    styleName: 'Professional Email',
    prompt: 'Format as polite, polished professional email text. Fix grammar, proper capitalization, and punctuation.',
    isEnabled: true,
  },
  {
    id: 'vscode',
    appName: 'VS Code / Cursor',
    appIdentifier: 'com.microsoft.VSCode',
    icon: 'Code',
    styleName: 'Code & Technical',
    prompt: 'Format for programming. Use exact variable casing (camelCase, snake_case) and clean markdown when relevant.',
    isEnabled: true,
  },
  {
    id: 'notion',
    appName: 'Notion / Notes',
    appIdentifier: 'notion.id',
    icon: 'FileText',
    styleName: 'Structured Markdown',
    prompt: 'Format transcription into structured bullet points with clear bold headers and clean Markdown formatting.',
    isEnabled: true,
  },
];

const INITIAL_DICTIONARY: CustomDictionaryEntry[] = [
  { id: '1', trigger: 'comma', replacement: ',', category: 'punctuation', isEnabled: true },
  { id: '2', trigger: 'period', replacement: '.', category: 'punctuation', isEnabled: true },
  { id: '3', trigger: 'new line', replacement: '\n', category: 'punctuation', isEnabled: true },
  { id: '4', trigger: 'new paragraph', replacement: '\n\n', category: 'punctuation', isEnabled: true },
  { id: '5', trigger: 'question mark', replacement: '?', category: 'punctuation', isEnabled: true },
  { id: '6', trigger: 'exclamation mark', replacement: '!', category: 'punctuation', isEnabled: true },
  { id: '7', trigger: 'colon', replacement: ':', category: 'punctuation', isEnabled: true },
  { id: '8', trigger: 'semicolon', replacement: ';', category: 'punctuation', isEnabled: true },
  { id: '9', trigger: 'k8s', replacement: 'Kubernetes', category: 'acronym', isEnabled: true },
  { id: '10', trigger: 'tauri', replacement: 'Tauri', category: 'word', isEnabled: true },
];

const INITIAL_HISTORY: TranscriptionRecord[] = [];

const INITIAL_CLIPBOARD_ITEMS: ClipboardItem[] = [];

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activeTab: 'welcome',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isSidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  isSettingsOpen: false,
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  settingsSection: 'general',
  setSettingsSection: (section) => set({ settingsSection: section }),

  // License & Entitlements
  licenseInfo: {
    key: '',
    tier: 'community',
    is_pro: false,
    activation_id: null,
    customer_email: null,
    customer_name: null,
    activated_at: null,
    limit_activations: 1,
  },
  setLicenseInfo: (licenseInfo) => set({ licenseInfo }),
  fetchLicenseInfo: async () => {
    try {
      const info = await invoke<LicenseInfo>('get_license_info');
      if (info) {
        set({ licenseInfo: info });
        return info;
      }
    } catch (e) {
      console.error('Failed to get license info:', e);
    }
    return null;
  },
  activateLicense: async (key: string, label?: string) => {
    try {
      const info = await invoke<LicenseInfo>('activate_license_key', { key, label: label || null });
      if (info) {
        set({ licenseInfo: info });
        return { success: true };
      }
      return { success: false, error: 'Activation failed' };
    } catch (e: any) {
      return { success: false, error: typeof e === 'string' ? e : e?.message || 'Activation failed' };
    }
  },
  deactivateLicense: async () => {
    try {
      const info = await invoke<LicenseInfo>('deactivate_license_key');
      if (info) {
        set({ licenseInfo: info });
        return { success: true };
      }
      return { success: false, error: 'Deactivation failed' };
    } catch (e: any) {
      return { success: false, error: typeof e === 'string' ? e : e?.message || 'Deactivation failed' };
    }
  },

  // General Preferences
  hotkey: 'Option+Space',
  secondaryHotkey: 'Control+Option+Space',
  rewriteHotkey: 'Option+R',
  commandHotkey: 'CommandOrControl+Shift+K',
  pushToTalk: false,
  autoPaste: true,
  soundEffects: true,
  simulateNotchCutout: false,
  setSimulateNotchCutout: (sim) => set({ simulateNotchCutout: sim }),
  launchAtStartup: false,
  overlayStyle: 'notch',
  typingWPM: 45,
  audioHistoryBudgetGB: 2.0,

  setHotkey: (hotkey) => set({ hotkey }),
  setSecondaryHotkey: (secondaryHotkey) => set({ secondaryHotkey }),
  setPushToTalk: (pushToTalk) => set({ pushToTalk }),
  setAutoPaste: (autoPaste) => set({ autoPaste }),
  setSoundEffects: (soundEffects) => set({ soundEffects }),
  setOverlayStyle: (overlayStyle) => set({ overlayStyle }),
  setTypingWPM: (typingWPM) => set({ typingWPM }),

  // Speech Models Catalog (Default to Local Whisper Base)
  selectedSpeechModel: 'whisper-base',
  models: INITIAL_MODELS,
  downloadProgress: {},
  setSelectedSpeechModel: (modelId) => set({ selectedSpeechModel: modelId }),
  setDownloadProgress: (modelId, progress) =>
    set((state) => ({ downloadProgress: { ...state.downloadProgress, [modelId]: progress } })),
  markModelInstalled: (modelId) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === modelId ? { ...m, isInstalled: true } : m)),
    })),

  // AI Enhancement
  selectedAIProvider: 'local',
  apiKeys: {
    groq: '',
    gemini: '',
    openai: '',
  },
  selectedModelByProvider: {
    local: 'qwen2.5-coder:7b',
    groq: 'llama-3.3-70b-versatile',
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o-mini',
  },
  setSelectedAIProvider: (provider) => set({ selectedAIProvider: provider }),
  setApiKey: (provider, key) =>
    set((state) => ({ apiKeys: { ...state.apiKeys, [provider]: key } })),
  setModelForProvider: (provider, model) =>
    set((state) => ({ selectedModelByProvider: { ...state.selectedModelByProvider, [provider]: model } })),

  // AI Voice & Speech Output
  aiVoicePersona: 'female-cheerful',
  aiVoiceRate: 1.0,
  aiVoiceAutoSpeak: true,
  setAIVoicePersona: (persona) => set({ aiVoicePersona: persona }),
  setAIVoiceRate: (rate) => set({ aiVoiceRate: rate }),
  setAIVoiceAutoSpeak: (autoSpeak) => set({ aiVoiceAutoSpeak: autoSpeak }),

  // Prompt Rules
  promptRules: INITIAL_PROMPT_RULES,
  addPromptRule: (rule) => set((state) => ({ promptRules: [...state.promptRules, rule] })),
  updatePromptRule: (id, updates) =>
    set((state) => ({
      promptRules: state.promptRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),
  deletePromptRule: (id) =>
    set((state) => ({ promptRules: state.promptRules.filter((r) => r.id !== id) })),

  // Custom Dictionary
  dictionaryEntries: INITIAL_DICTIONARY,
  addDictionaryEntry: (entry) =>
    set((state) => ({ dictionaryEntries: [...state.dictionaryEntries, entry] })),
  updateDictionaryEntry: (id, updates) =>
    set((state) => ({
      dictionaryEntries: state.dictionaryEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  deleteDictionaryEntry: (id) =>
    set((state) => ({ dictionaryEntries: state.dictionaryEntries.filter((e) => e.id !== id) })),

  // Stats & History
  wordsToday: 842,
  timeSavedMinutesToday: 14.5,
  currentStreakDays: 5,
  totalWordsDictated: 12450,
  totalTranscriptions: 184,
  activityHistory: [
    { date: 'Mon', words: 420, transcriptions: 22, minutesSaved: 7.2 },
    { date: 'Tue', words: 680, transcriptions: 34, minutesSaved: 11.5 },
    { date: 'Wed', words: 950, transcriptions: 48, minutesSaved: 16.2 },
    { date: 'Thu', words: 1120, transcriptions: 55, minutesSaved: 19.1 },
    { date: 'Fri', words: 890, transcriptions: 41, minutesSaved: 15.0 },
    { date: 'Sat', words: 510, transcriptions: 26, minutesSaved: 8.8 },
    { date: 'Sun', words: 842, transcriptions: 38, minutesSaved: 14.5 },
  ],
  historyRecords: INITIAL_HISTORY,
  addTranscriptionRecord: (record) =>
    set((state) => {
      const words = record.rawText.split(/\s+/).filter(Boolean).length;
      return {
        historyRecords: [record, ...state.historyRecords],
        wordsToday: state.wordsToday + words,
        totalWordsDictated: state.totalWordsDictated + words,
        totalTranscriptions: state.totalTranscriptions + 1,
      };
    }),
  clearHistory: () => set({ historyRecords: [] }),

  // Live Recording & Notch
  isRecording: false,
  audioLevel: 0,
  streamingText: '',
  recordingMode: 'dictate',
  superNotchMode: 'idle',
  superNotchHudView: 'search',
  orbTheme: (typeof window !== 'undefined' && (localStorage.getItem('dopenotch_orb_theme') as OrbTheme)) || 'aurora',
  liveWPM: 150,
  liveLatencyMs: 65,
  setIsRecording: (isRecording) => set({ isRecording }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setStreamingText: (streamingText) => set({ streamingText }),
  setRecordingMode: (recordingMode) => set({ recordingMode }),
  setSuperNotchMode: (superNotchMode) => set({ superNotchMode }),
  setSuperNotchHudView: (superNotchHudView) => set({ superNotchHudView }),
  setOrbTheme: (orbTheme) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dopenotch_orb_theme', orbTheme);
      } catch {}
    }
    set({ orbTheme });
  },
  setLiveMetrics: (liveWPM, liveLatencyMs) => set({ liveWPM, liveLatencyMs }),

  // SuperShelf Clipboard Manager
  clipboardItems: INITIAL_CLIPBOARD_ITEMS,
  activeClipboardCategory: 'all',
  clipboardSearchQuery: '',
  setActiveClipboardCategory: (category) => set({ activeClipboardCategory: category }),
  setClipboardSearchQuery: (query) => set({ clipboardSearchQuery: query }),
  setClipboardItems: (clipboardItems) => set({ clipboardItems }),
  addClipboardItem: (item) =>
    set((state) => {
      const content = item.content.trim();
      if (!content) return state;

      // Auto-detect category if not specified
      let category = item.category;
      if (!category) {
        if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(content) || /^rgba?\(/i.test(content)) {
          category = 'color';
        } else if (/^https?:\/\//i.test(content)) {
          category = 'link';
        } else if (/[{};=><()[\]]/.test(content) && (content.includes('\n') || content.length > 25)) {
          category = 'code';
        } else {
          category = 'clipboard';
        }
      }

      // Check if already exists at top
      if (state.clipboardItems.length > 0 && state.clipboardItems[0].content === content) {
        return state;
      }

      const newItem: ClipboardItem = {
        id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        content,
        category,
        timestamp: 'Just now',
        timestampRaw: Date.now(),
        isPinned: item.isPinned ?? false,
        sourceApp: item.sourceApp || 'Clipboard',
        charCount: content.length,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      };

      // Filter out duplicate identical content so it bubbles to top
      const filtered = state.clipboardItems.filter((c) => c.content !== content);
      const maxClips = state.licenseInfo?.is_pro ? 5000 : 25;
      return {
        clipboardItems: [newItem, ...filtered].slice(0, maxClips),
      };
    }),
  togglePinClipboardItem: (id) =>
    set((state) => ({
      clipboardItems: state.clipboardItems.map((c) =>
        c.id === id ? { ...c, isPinned: !c.isPinned } : c
      ),
    })),
  deleteClipboardItem: (id) =>
    set((state) => ({
      clipboardItems: state.clipboardItems.filter((c) => c.id !== id),
    })),
  clearClipboardItems: () => set({ clipboardItems: [] }),

  // Magnetic Stash Shelf (Drop-to-Notch)
  stashItems: (() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('dopenotch_stash_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),
  addStashItems: (newItems) =>
    set((state) => {
      const withTimestamp = newItems.map((item) => ({
        ...item,
        timestamp: item.timestamp || Date.now(),
      }));
      const existingPaths = new Set(state.stashItems.map((i) => i.path));
      const filtered = withTimestamp.filter((i) => !existingPaths.has(i.path));
      const updated = [...filtered, ...state.stashItems].slice(0, 60);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('dopenotch_stash_items', JSON.stringify(updated));
        } catch {}
      }
      return { stashItems: updated };
    }),
  removeStashItem: (id) =>
    set((state) => {
      const updated = state.stashItems.filter((i) => i.id !== id);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('dopenotch_stash_items', JSON.stringify(updated));
        } catch {}
      }
      return { stashItems: updated };
    }),
  clearStashItems: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dopenotch_stash_items');
      } catch {}
    }
    set({ stashItems: [] });
  },

  // Audio Devices
  inputDevices: [
    { id: 'default', name: 'System Default Microphone' },
    { id: 'macbook-mic', name: 'Built-in Microphone (CoreAudio)' },
  ],
  selectedInputDevice: 'default',
  setInputDevices: (inputDevices) => set({ inputDevices }),
  setSelectedInputDevice: (selectedInputDevice) => set({ selectedInputDevice }),

  // Focus Mode / Pomodoro Live Activity
  focusTimerRunning: false,
  focusTimerRemaining: 25 * 60,
  focusTimerDuration: 25 * 60,
  focusTaskName: 'Deep Focus',
  setFocusTimerRunning: (focusTimerRunning) => set({ focusTimerRunning }),
  setFocusTimerRemaining: (focusTimerRemaining) => set({ focusTimerRemaining }),
  setFocusTimerDuration: (focusTimerDuration) => set({ focusTimerDuration }),
  setFocusTaskName: (focusTaskName) => set({ focusTaskName }),
  startFocusTimer: (durationMinutes, task) =>
    set((state) => {
      const dur = durationMinutes ? durationMinutes * 60 : state.focusTimerDuration;
      return {
        focusTimerRunning: true,
        focusTimerDuration: dur,
        focusTimerRemaining: dur,
        focusTaskName: task || state.focusTaskName,
      };
    }),
  pauseFocusTimer: () => set({ focusTimerRunning: false }),
  resetFocusTimer: (newDurationMinutes) =>
    set((state) => {
      const dur = newDurationMinutes ? newDurationMinutes * 60 : state.focusTimerDuration;
      return {
        focusTimerRunning: false,
        focusTimerDuration: dur,
        focusTimerRemaining: dur,
      };
    }),
  tickFocusTimer: () =>
    set((state) => {
      if (!state.focusTimerRunning) return state;
      if (state.focusTimerRemaining <= 1) {
        return {
          focusTimerRunning: false,
          focusTimerRemaining: state.focusTimerDuration,
        };
      }
      return {
        focusTimerRemaining: state.focusTimerRemaining - 1,
      };
    }),

  // Notes State
  notes: [],
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  deleteNote: (id) => set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
  updateNote: (id, updates) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
}));
