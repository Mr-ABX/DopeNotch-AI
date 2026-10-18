import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Keyboard,
  Speaker,
  Layers,
  Database,
  Sliders,
} from 'lucide-react';
import { useAppStore, OverlayStyle } from '../../stores/appStore';
import { invoke } from '@tauri-apps/api/core';

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
  } = useAppStore();

  const [isRecordingPrimary, setIsRecordingPrimary] = useState(false);
  const [isRecordingSecondary, setIsRecordingSecondary] = useState(false);

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
              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-xs font-medium text-white">Audio Feedback</p>
                  <p className="text-[11px] text-zinc-500">Chime on recording start and stop</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-xs font-medium text-white">Typing Speed (WPM)</p>
                  <p className="text-[11px] text-zinc-500">Used for time-saved calculation</p>
                </div>
                <input
                  type="number"
                  value={typingWPM}
                  onChange={(e) => setTypingWPM(Number(e.target.value))}
                  className="w-16 bg-[#09090b] border border-[#1e1e24] rounded-md px-2 py-1 text-xs text-white text-right font-mono"
                />
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
                <input
                  type="checkbox"
                  checked={pushToTalk}
                  onChange={(e) => {
                    setPushToTalk(e.target.checked);
                    syncBackend({ activationMode: e.target.checked ? 'hold' : 'toggle' });
                  }}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-xs font-medium text-white">Auto-Paste</p>
                  <p className="text-[11px] text-zinc-500">Insert text directly at active cursor</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoPaste}
                  onChange={(e) => {
                    setAutoPaste(e.target.checked);
                    syncBackend({ autoPaste: e.target.checked });
                  }}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {settingsSection === 'audio' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Audio</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Input device configuration</p>
            </div>

            <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-2">
              <label className="block text-xs font-medium text-zinc-300">
                Microphone Input
              </label>
              <select
                value={selectedInputDevice}
                onChange={(e) => setSelectedInputDevice(e.target.value)}
                className="w-full bg-[#09090b] border border-[#1e1e24] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-700"
              >
                {inputDevices.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name}
                  </option>
                ))}
              </select>
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
          </div>
        )}

        {settingsSection === 'data' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Data & Storage</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Manage local files and history</p>
            </div>

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
      </div>
    </div>
  );
};
