import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Keyboard,
  Speaker,
  Layers,
  Database,
  Sliders,
  FolderOpen,
  Folder,
  HardDrive,
  FileText,
  ClipboardList,
  Puzzle,
  Mic2,
  Sparkles,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Play,
  Square,
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  Zap,
  Check,
  Copy,
  Laptop,
} from 'lucide-react';
import { useAppStore, OverlayStyle, AI_VOICE_PERSONAS, AIVoicePersona } from '../../stores/appStore';
import { aiVoiceService } from '../../services/aiVoiceService';
import { invoke } from '@tauri-apps/api/core';

interface StorageInfo {
  rootPath: string;
  isCustom: boolean;
  notesPath: string;
  historyPath: string;
  extensionsPath: string;
  voiceModelsPath: string;
  aiModelsPath: string;
  notesCount: number;
  clipboardCount: number;
  voiceHistoryCount: number;
  extensionsCount: number;
  voiceModelsCount: number;
  totalSizeBytes: number;
}

export const PreferencesView: React.FC = () => {
  const {
    settingsSection,
    setSettingsSection,
    hotkey,
    setHotkey,
    secondaryHotkey,
    setSecondaryHotkey,
    pushToTalk,
    setPushToTalk,
    autoPaste,
    setAutoPaste,
    soundEffects,
    setSoundEffects,
    overlayStyle,
    setOverlayStyle,
    typingWPM,
    setTypingWPM,
    inputDevices,
    selectedInputDevice,
    setSelectedInputDevice,
    orbTheme,
    setOrbTheme,
    clearHistory,
    simulateNotchCutout,
    setSimulateNotchCutout,
    aiVoicePersona,
    setAIVoicePersona,
    aiVoiceRate,
    setAIVoiceRate,
    aiVoiceAutoSpeak,
    setAIVoiceAutoSpeak,
    licenseInfo,
    activateLicense,
    deactivateLicense,
    fetchLicenseInfo,
  } = useAppStore();

  const [previewingPersona, setPreviewingPersona] = useState<AIVoicePersona | null>(null);

  // License activation / management state
  const [keyInput, setKeyInput] = useState('');
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isKeyCopied, setIsKeyCopied] = useState(false);

  const handleActivate = async () => {
    if (!keyInput.trim()) {
      setActionError('Please enter a valid license key');
      return;
    }
    setIsActivating(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await activateLicense(keyInput.trim(), deviceLabelInput.trim() || undefined);
      if (res.success) {
        setActionSuccess('DopeNotch Pro successfully activated!');
        setKeyInput('');
      } else {
        setActionError(res.error || 'Activation failed. Please verify your key.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Network error contacting Polar license server');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate your DopeNotch Pro license on this Mac?')) {
      return;
    }
    setIsDeactivating(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await deactivateLicense();
      if (res.success) {
        setActionSuccess('License deactivated. App reverted to Community Free edition.');
      } else {
        setActionError(res.error || 'Deactivation failed.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error contacting license server');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleOpenPolarPortal = () => {
    invoke('open_path_in_os', { path: 'https://polar.sh/purchases' });
  };

  const handlePurchase = () => {
    invoke('open_path_in_os', { path: 'https://buy.polar.sh/polar_cl_fby6JW0hZacNedJuyHKQoi5m834UHFEwb9jUk1yBbMp' });
  };

  const handleCopyKey = () => {
    if (licenseInfo?.key) {
      navigator.clipboard.writeText(licenseInfo.key);
      setIsKeyCopied(true);
      setTimeout(() => setIsKeyCopied(false), 2000);
    }
  };

  const handleToggleVoicePreview = async (personaId: AIVoicePersona) => {
    if (previewingPersona === personaId) {
      aiVoiceService.stop();
      setPreviewingPersona(null);
      return;
    }
    setPreviewingPersona(personaId);
    try {
      await aiVoiceService.playPreview(personaId);
    } finally {
      setPreviewingPersona(null);
    }
  };

  const [isRecordingPrimary, setIsRecordingPrimary] = useState(false);
  const [isRecordingSecondary, setIsRecordingSecondary] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  const fetchStorageInfo = async () => {
    try {
      const info = await invoke<StorageInfo>('get_storage_info');
      setStorageInfo(info);
    } catch (e) {
      console.error('Failed to get storage info:', e);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleOpenStorageDirectory = async (subfolder?: string) => {
    try {
      await invoke('open_storage_directory', { subfolder: subfolder || null });
    } catch (e) {
      console.error('Failed to open directory:', e);
    }
  };

  const handleChangeStorageFolder = async () => {
    try {
      setIsLoadingStorage(true);
      const selected = await invoke<string | null>('pick_storage_folder');
      if (selected) {
        const updated = await invoke<StorageInfo>('change_storage_directory', { newPath: selected });
        setStorageInfo(updated);
      }
    } catch (e) {
      console.error('Failed to change storage directory:', e);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const handleResetStorageFolder = async () => {
    try {
      setIsLoadingStorage(true);
      const updated = await invoke<StorageInfo>('reset_storage_directory');
      setStorageInfo(updated);
    } catch (e) {
      console.error('Failed to reset storage directory:', e);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  useEffect(() => {
    if (settingsSection === 'data') {
      fetchStorageInfo();
    } else if (settingsSection === 'license') {
      fetchLicenseInfo().catch(() => {});
    }
  }, [settingsSection]);

  const syncBackend = async (updates: Partial<any>) => {
    try {
      const current = await invoke<any>('get_settings');
      if (current) {
        const merged = { ...current, ...updates };
        await invoke('save_settings', { settings: merged });
      }
    } catch (e) {
      console.error('Failed to sync backend settings:', e);
    }
  };

  const handleSelectPreset = (newHotkey: string) => {
    setHotkey(newHotkey);
    syncBackend({ hotkey: newHotkey });
  };

  const handleSelectSecondaryPreset = (newHotkey: string) => {
    setSecondaryHotkey(newHotkey);
    syncBackend({ assistantHotkey: newHotkey });
  };

  const handleKeyDownPrimary = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Control');
    if (e.altKey) parts.push('Option');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Command');

    let keyName = e.key;
    if (keyName === ' ') keyName = 'Space';
    else if (keyName.length === 1) keyName = keyName.toUpperCase();

    if (parts.length === 0) parts.push('Option');
    parts.push(keyName);

    const combo = parts.join('+');
    setHotkey(combo);
    syncBackend({ hotkey: combo });
    setIsRecordingPrimary(false);
  };

  const handleKeyDownSecondary = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Control');
    if (e.altKey) parts.push('Option');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Command');

    let keyName = e.key;
    if (keyName === ' ') keyName = 'Space';
    else if (keyName.length === 1) keyName = keyName.toUpperCase();

    if (parts.length === 0) {
      parts.push('Control');
      parts.push('Option');
    }
    parts.push(keyName);

    const combo = parts.join('+');
    setSecondaryHotkey(combo);
    syncBackend({ assistantHotkey: combo });
    setIsRecordingSecondary(false);
  };

  const SECTIONS = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'dictation', label: 'Hotkeys', icon: Keyboard },
    { id: 'audio', label: 'Audio', icon: Speaker },
    { id: 'overlay', label: 'Overlay', icon: Layers },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'license', label: 'License & Edition', icon: ShieldCheck },
  ] as const;

  const PRIMARY_PRESETS = [
    { label: '⌥ Space', value: 'Option+Space' },
    { label: '⌃⌥ Space', value: 'Control+Option+Space' },
    { label: '⇧⌘ Space', value: 'CommandOrControl+Shift+Space' },
    { label: '⌥ D', value: 'Option+D' },
  ];

  const SECONDARY_PRESETS = [
    { label: '⌃⌥ Space', value: 'Control+Option+Space' },
    { label: '⌥ Tab', value: 'Option+Tab' },
    { label: '⇧⌘ A', value: 'CommandOrControl+Shift+A' },
  ];

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden select-none bg-[#000000] text-[#ededed]">
      {/* Sidebar */}
      <div className="w-full md:w-48 h-full border-r border-[#1e1e24] p-3 space-y-1 bg-[#0a0a0c]">
        <div className="px-3 py-2 mb-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" /> Settings
          </h2>
        </div>

        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = settingsSection === sec.id;

          return (
            <button
              key={sec.id}
              onClick={() => setSettingsSection(sec.id as any)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#000000]">
        {settingsSection === 'general' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">General</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Application preferences</p>
            </div>

            <div className="rounded-xl bg-[#111114] border border-[#1e1e24] divide-y divide-[#1e1e24]">
              {/* Audio Feedback Switch */}
              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-xs font-medium text-white">Audio Feedback</p>
                  <p className="text-[11px] text-zinc-500">Chime on recording start and stop</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEffects}
                  onClick={() => setSoundEffects(!soundEffects)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    soundEffects ? 'bg-amber-400' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      soundEffects ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-300'
                    }`}
                  />
                </button>
              </div>

              {/* Typing Speed (WPM) Stepper Counter */}
              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-xs font-medium text-white">Typing Speed (WPM)</p>
                  <p className="text-[11px] text-zinc-500">Used for time-saved calculation</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#09090b] border border-[#1e1e24] rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setTypingWPM(Math.max(10, typingWPM - 5))}
                    className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-xs font-mono font-medium text-white">
                    {typingWPM}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTypingWPM(typingWPM + 5)}
                    className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {settingsSection === 'dictation' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Hotkeys</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Global keyboard shortcuts</p>
            </div>

            {/* Dictation Shortcut */}
            <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white">Voice Dictation</p>
                  <p className="text-[11px] text-zinc-500">Hold or press to dictate text</p>
                </div>

                <button
                  onClick={() => setIsRecordingPrimary(!isRecordingPrimary)}
                  onKeyDown={isRecordingPrimary ? handleKeyDownPrimary : undefined}
                  tabIndex={0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer border ${
                    isRecordingPrimary
                      ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                      : 'bg-[#09090b] text-zinc-200 border-[#2a2a32] hover:border-zinc-500'
                  }`}
                >
                  {isRecordingPrimary ? 'Press keys...' : hotkey || '⌥Space'}
                </button>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] text-zinc-500 font-mono">Presets:</span>
                {PRIMARY_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleSelectPreset(preset.value)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                      hotkey === preset.value
                        ? 'bg-white text-black font-semibold border-white'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Shortcut */}
            <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white">AI Command</p>
                  <p className="text-[11px] text-zinc-500">Voice prompts and actions</p>
                </div>

                <button
                  onClick={() => setIsRecordingSecondary(!isRecordingSecondary)}
                  onKeyDown={isRecordingSecondary ? handleKeyDownSecondary : undefined}
                  tabIndex={0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer border ${
                    isRecordingSecondary
                      ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                      : 'bg-[#09090b] text-zinc-200 border-[#2a2a32] hover:border-zinc-500'
                  }`}
                >
                  {isRecordingSecondary ? 'Press keys...' : secondaryHotkey || '⌃⌥Space'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] text-zinc-500 font-mono">Presets:</span>
                {SECONDARY_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleSelectSecondaryPreset(preset.value)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                      secondaryHotkey === preset.value
                        ? 'bg-white text-black font-semibold border-white'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clipboard Shelf Shortcut */}
            <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">Clipboard Shelf</p>
                <p className="text-[11px] text-zinc-500">Open SuperShelf horizontal clipboard history directly</p>
              </div>

              <div className="flex items-center gap-1.5">
                <kbd className="px-2.5 py-1 rounded bg-[#09090b] text-amber-400 border border-[#2a2a32] font-mono text-xs font-semibold">
                  ⇧⌘V
                </kbd>
              </div>
            </div>

            {/* Search & Mini-Tools Shortcut */}
            <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">Search & Mini-Tools</p>
                <p className="text-[11px] text-zinc-500">Command palette, currency conversion & extensions</p>
              </div>

              <div className="flex items-center gap-1.5">
                <kbd className="px-2.5 py-1 rounded bg-[#09090b] text-emerald-400 border border-[#2a2a32] font-mono text-xs font-semibold">
                  ⇧⌘K
                </kbd>
              </div>
            </div>

            {/* Dictation Behavior Toggles */}
            <div className="rounded-xl bg-[#111114] border border-[#1e1e24] divide-y divide-[#1e1e24]">
              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-xs font-medium text-white">Push-to-Talk</p>
                  <p className="text-[11px] text-zinc-500">
                    {pushToTalk ? 'Hold to talk, release to paste' : 'Press to start, press again to stop'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pushToTalk}
                  onClick={() => {
                    const next = !pushToTalk;
                    setPushToTalk(next);
                    syncBackend({ activationMode: next ? 'hold' : 'toggle' });
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    pushToTalk ? 'bg-amber-400' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      pushToTalk ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-300'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-xs font-medium text-white">Auto-Paste</p>
                  <p className="text-[11px] text-zinc-500">Insert text directly at active cursor</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoPaste}
                  onClick={() => {
                    const next = !autoPaste;
                    setAutoPaste(next);
                    syncBackend({ autoPaste: next });
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoPaste ? 'bg-amber-400' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoPaste ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-300'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {settingsSection === 'audio' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Audio & Speech</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Input device and natural AI speech synthesis</p>
            </div>

            {/* Microphone Input */}
            <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-2">
              <label className="block text-xs font-medium text-zinc-300">
                Microphone Input
              </label>
              <div className="relative">
                <select
                  value={selectedInputDevice}
                  onChange={(e) => setSelectedInputDevice(e.target.value)}
                  className="w-full appearance-none bg-[#09090b] border border-[#1e1e24] hover:border-white/20 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer pr-9 font-sans transition-colors"
                >
                  {inputDevices.map((dev) => (
                    <option key={dev.id} value={dev.id} className="bg-[#141418] text-white">
                      {dev.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* AI Speech Persona Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">AI Spoken Persona</h4>
                  <p className="text-[11px] text-zinc-400">Natural human voices for assistant conversations</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">Auto-Speak</span>
                  <button
                    type="button"
                    onClick={() => setAIVoiceAutoSpeak(!aiVoiceAutoSpeak)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      aiVoiceAutoSpeak ? 'bg-emerald-500' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        aiVoiceAutoSpeak ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-300'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Persona Cards */}
              <div className="grid grid-cols-1 gap-2.5">
                {AI_VOICE_PERSONAS.map((persona) => {
                  const isSelected = aiVoicePersona === persona.id;
                  const isPreviewing = previewingPersona === persona.id;

                  return (
                    <div
                      key={persona.id}
                      onClick={() => setAIVoicePersona(persona.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#18181c] border-white/20 ring-1 ring-white/10'
                          : 'bg-[#111114] border-[#1e1e24] hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Radio indicator */}
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'border-emerald-500 bg-emerald-500/20' : 'border-zinc-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{persona.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                persona.gender === 'female'
                                  ? 'bg-pink-500/10 text-pink-300 border border-pink-500/20'
                                  : persona.gender === 'male'
                                  ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              }`}
                            >
                              {persona.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{persona.description}</p>
                        </div>
                      </div>

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVoicePreview(persona.id);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                          isPreviewing
                            ? 'bg-emerald-500 text-black shadow-md font-semibold'
                            : 'bg-white/[0.06] hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10'
                        }`}
                        title="Listen to sample audio"
                      >
                        {isPreviewing ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Preview</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Speech Speed Multiplier */}
              <div className="p-3.5 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-300">Speech Pace</span>
                  <p className="text-[11px] text-zinc-500">Natural conversation speed rate</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#09090b] p-1 rounded-lg border border-white/5">
                  {[
                    { label: '0.85x Relaxed', value: 0.85 },
                    { label: '1.0x Natural', value: 1.0 },
                    { label: '1.15x Brisk', value: 1.15 },
                  ].map((speed) => (
                    <button
                      key={speed.value}
                      type="button"
                      onClick={() => setAIVoiceRate(speed.value)}
                      className={`px-2 py-1 text-[11px] rounded-md transition-all font-mono cursor-pointer ${
                        aiVoiceRate === speed.value
                          ? 'bg-white/15 text-white font-medium shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {speed.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {settingsSection === 'overlay' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Overlay Style</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Visualizer presentation</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'notch', title: 'Dynamic Notch', desc: 'Top screen notch with shelf' },
                { id: 'minimal', title: 'Minimal Pill', desc: 'Floating indicator' },
                { id: 'hidden', title: 'Hidden', desc: 'Audio cues only' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setOverlayStyle(style.id as OverlayStyle)}
                  className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer ${
                    overlayStyle === style.id
                      ? 'bg-[#18181c] border-white/20'
                      : 'bg-[#111114] border-[#1e1e24] hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-semibold text-white">{style.title}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{style.desc}</p>
                </button>
              ))}
            </div>

            {/* Dictation Liquid Orb Appearance */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-white">Dictation Siri Orb Theme</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Liquid visualizer aura when listening to voice</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: City Lights Aurora */}
              <button
                type="button"
                onClick={() => setOrbTheme('aurora')}
                className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  orbTheme === 'aurora'
                    ? 'bg-[#18181c] border-cyan-500/40 shadow-sm ring-1 ring-cyan-500/20'
                    : 'bg-[#111114] border-[#1e1e24] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center relative bg-black/60 border border-white/10">
                      <div className="w-3 h-3 rounded-full blur-[1px] bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400" />
                      <div className="absolute w-1 h-1 rounded-full bg-white" />
                    </div>
                    <span className="text-xs font-semibold text-white">City Lights Aurora</span>
                  </div>
                  {orbTheme === 'aurora' && (
                    <span className="text-[10px] font-mono font-medium text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Cool cyan, violet, and emerald fluid aura. Inspired by Apple Intelligence on macOS Sequoia.
                </p>
              </button>

              {/* Option 2: DopeNotch Brand Amber */}
              <button
                type="button"
                onClick={() => setOrbTheme('brand')}
                className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  orbTheme === 'brand'
                    ? 'bg-[#18181c] border-amber-500/40 shadow-sm ring-1 ring-amber-500/20'
                    : 'bg-[#111114] border-[#1e1e24] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center relative bg-black/60 border border-white/10">
                      <div className="w-3 h-3 rounded-full blur-[1px] bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-400" />
                      <div className="absolute w-1 h-1 rounded-full bg-white" />
                    </div>
                    <span className="text-xs font-semibold text-white">DopeNotch Brand Amber</span>
                  </div>
                  {orbTheme === 'brand' && (
                    <span className="text-[10px] font-mono font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Warm amber, fiery orange, and energetic emerald glowing aura. Matches the signature DopeNotch brand palette.
                </p>
              </button>
            </div>

            {/* Developer Testing: Hardware Camera Cutout Simulator */}
            <div className="pt-2">
              <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-white">Simulate Hardware Camera Cutout</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                      Developer Testing
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Overlays a 180×34px physical MacBook camera silhouette so you can verify notch clearance on Intel Macs.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={simulateNotchCutout}
                  onClick={() => setSimulateNotchCutout(!simulateNotchCutout)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    simulateNotchCutout ? 'bg-amber-400' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      simulateNotchCutout ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-300'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {settingsSection === 'data' && (
          <div className="space-y-5 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Data & Unified Storage</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Manage local workspace files, notes, custom scripts, and offline AI models</p>
            </div>

            {/* Unified Storage Root Folder Card */}
            <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">DopeNotch Unified Folder</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        storageInfo?.isCustom
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {storageInfo?.isCustom ? 'Custom Location' : 'Default Documents'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate max-w-sm">
                      {storageInfo?.rootPath || '~/Documents/DopeNotch'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-zinc-400 block">Total Disk</span>
                  <span className="text-xs font-mono font-semibold text-zinc-200">
                    {formatBytes(storageInfo?.totalSizeBytes || 0)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#1e1e24]">
                <button
                  type="button"
                  onClick={() => handleOpenStorageDirectory()}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Open in Finder</span>
                </button>

                <button
                  type="button"
                  onClick={handleChangeStorageFolder}
                  disabled={isLoadingStorage}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>{isLoadingStorage ? 'Updating...' : 'Change Location...'}</span>
                </button>

                {storageInfo?.isCustom && (
                  <button
                    type="button"
                    onClick={handleResetStorageFolder}
                    disabled={isLoadingStorage}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
                    title="Reset to default ~/Documents/DopeNotch"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Subfolders Explorer Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Workspace Subfolders</span>
                <span className="text-[11px] text-zinc-500 font-mono">100% on-device & visible</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* 1. Notes */}
                <div className="p-3 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">Notes & Checklists</p>
                      <p className="text-[11px] text-zinc-500 font-mono">notes/ • {storageInfo?.notesCount || 0} voice notes & .md files</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenStorageDirectory('notes')}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Open notes folder in Finder"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. History */}
                <div className="p-3 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <ClipboardList className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">Clipboard & Voice History</p>
                      <p className="text-[11px] text-zinc-500 font-mono">history/ • {storageInfo?.clipboardCount || 0} clips, {storageInfo?.voiceHistoryCount || 0} transcripts</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenStorageDirectory('history')}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Open history folder in Finder"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3. Extensions */}
                <div className="p-3 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <Puzzle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">Custom Extensions & Scripts</p>
                      <p className="text-[11px] text-zinc-500 font-mono">extensions/ • {storageInfo?.extensionsCount || 0} scripts (.sh, .py, .js)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenStorageDirectory('extensions')}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Open extensions folder in Finder"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4. Voice Models */}
                <div className="p-3 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                      <Mic2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">Voice Speech Models</p>
                      <p className="text-[11px] text-zinc-500 font-mono">models/voice/ • {storageInfo?.voiceModelsCount || 0} Whisper GGML engines</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenStorageDirectory('voice')}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Open voice models folder in Finder"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 5. AI Models */}
                <div className="p-3 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">Offline Neural AI Models</p>
                      <p className="text-[11px] text-zinc-500 font-mono">models/ai/ • Local LLMs (Qwen 2.5, SmolLM2)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenStorageDirectory('ai')}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Open AI models folder in Finder"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cache Reset */}
            <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">Local Dictation Cache</p>
                <p className="text-[11px] text-zinc-500">Stored 100% on device</p>
              </div>

              <button
                onClick={clearHistory}
                className="px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-medium border border-rose-500/20 transition-colors cursor-pointer"
              >
                Clear Cache
              </button>
            </div>
          </div>
        )}

        {settingsSection === 'license' && (
          <div className="space-y-5 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                License & Edition
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage your DopeNotch license, device seat entitlements, and lifetime updates
              </p>
            </div>

            {/* Pro Active Card */}
            {licenseInfo?.is_pro ? (
              <div className="p-5 rounded-2xl bg-[#111114] border border-[#1e1e24] space-y-4">
                {/* Tier Header Badge */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5 ${
                        licenseInfo.tier === 'forever'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                        {licenseInfo.tier === 'forever' ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            DopeNotch Pro — Forever Updates Pass
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            DopeNotch Pro Core
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Active & Verified
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {licenseInfo.tier === 'forever'
                        ? 'Lifetime access to all current and future major upgrades (v1.0, v2.0+) forever.'
                        : 'Permanent access to current release series with all security and maintenance updates.'}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1e1e24] text-xs">
                  <div className="p-3 rounded-xl bg-[#0a0a0c] border border-[#1e1e24]/80 space-y-1">
                    <span className="text-[11px] text-zinc-500 block">License Key</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-zinc-200">
                        {licenseInfo.key ? `${licenseInfo.key.slice(0, 9)}••••-••••-${licenseInfo.key.slice(-4)}` : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy full key to clipboard"
                      >
                        {isKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0a0a0c] border border-[#1e1e24]/80 space-y-1">
                    <span className="text-[11px] text-zinc-500 block">Registered Customer</span>
                    <span className="font-mono text-zinc-200 truncate block" title={licenseInfo.customer_email || 'INFNI-T Customer'}>
                      {licenseInfo.customer_email || 'INFNI-T Customer'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0a0a0c] border border-[#1e1e24]/80 space-y-1">
                    <span className="text-[11px] text-zinc-500 block">Seat Limit</span>
                    <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                      {licenseInfo.limit_activations ? `${licenseInfo.limit_activations} Mac${licenseInfo.limit_activations > 1 ? 's' : ''}` : '1 Mac'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0a0a0c] border border-[#1e1e24]/80 space-y-1">
                    <span className="text-[11px] text-zinc-500 block">Activation Server</span>
                    <span className="font-mono text-zinc-400 text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Polar.sh Verified
                    </span>
                  </div>
                </div>

                {/* Unlocked Entitlements */}
                <div className="space-y-2 pt-2 border-t border-[#1e1e24]">
                  <span className="text-xs font-medium text-zinc-400 block">Unlocked Pro Capabilities</span>
                  <div className="grid grid-cols-2 gap-2 text-[11.5px] text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>1,000 Clipboard Items (vs 25)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Unlimited Voice Dictation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Full SuperShelf Stash & Local LLMs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Sensitive Token Pasteboard Filter</span>
                    </div>
                  </div>
                </div>

                {/* Management Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#1e1e24]">
                  <button
                    type="button"
                    onClick={handleOpenPolarPortal}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Manage in Polar Customer Portal</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={isDeactivating}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 transition-all cursor-pointer"
                  >
                    {isDeactivating ? 'Deactivating...' : 'Deactivate on this Mac'}
                  </button>
                </div>
              </div>
            ) : (
              /* Community Edition & Activation Form */
              <div className="space-y-4">
                {/* Status Card */}
                <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">Community Free Edition</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Active
                        </span>
                      </div>
                      <p className="text-[11.5px] text-zinc-400 mt-0.5">
                        Core on-device speech transcription, 25-item clipboard history, and standard notch HUD.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activation Form Card */}
                <div className="p-5 rounded-2xl bg-[#111114] border border-[#1e1e24] space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      Activate DopeNotch Pro
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Enter your Polar license key to unlock unlimited clipboard history, unlimited dictation, and advanced AI.
                    </p>
                  </div>

                  {actionError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {actionSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{actionSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Polar License Key
                      </label>
                      <input
                        type="text"
                        placeholder="DOPE-CORE-... or DOPE-FVR-..."
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        className="w-full bg-[#09090b] border border-[#1e1e24] focus:border-amber-400/50 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Device Label <span className="text-zinc-600 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Work MacBook Pro"
                        value={deviceLabelInput}
                        onChange={(e) => setDeviceLabelInput(e.target.value)}
                        className="w-full bg-[#09090b] border border-[#1e1e24] focus:border-amber-400/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleActivate}
                        disabled={isActivating || !keyInput.trim()}
                        className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isActivating ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying with Polar...</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-3.5 h-3.5" />
                            <span>Activate License</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handlePurchase}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      >
                        <span>Don't have a license? Get Pro ($15+)</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editions Comparison Card */}
                <div className="p-4 rounded-xl bg-[#0e0e11] border border-[#1e1e24] space-y-3">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Compare Editions
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#141418] border border-[#1e1e24] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">Pro Core</span>
                        <span className="font-mono text-amber-400 font-semibold">$15</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Keeps current stable release (v0.4.x) forever. Unlimited dictation, 1,000 clips history, all maintenance & security patches.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#141418] border border-purple-500/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-purple-300">Forever Updates</span>
                        <span className="font-mono text-purple-400 font-semibold">$24</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Everything in Core + all future feature releases and major version upgrades (v1.0, v2.0+) forever with zero renewal fees.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
