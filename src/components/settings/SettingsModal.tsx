import React from 'react';
import {
  X,
  Settings as SettingsIcon,
  Keyboard,
  Speaker,
  Layers,
  Database,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useAppStore, OverlayStyle } from '../../stores/appStore';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settingsSection,
    setSettingsSection,
    hotkey,
    setHotkey,
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
    clearHistory,
    licenseInfo,
    setActiveTab,
  } = useAppStore();

  if (!isSettingsOpen) return null;

  const SECTIONS = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'dictation', label: 'Hotkeys', icon: Keyboard },
    { id: 'audio', label: 'Audio', icon: Speaker },
    { id: 'overlay', label: 'Overlay', icon: Layers },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'license', label: 'License', icon: ShieldCheck },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none animate-fade-in">
      <div className="w-full max-w-xl h-[460px] bg-[#0c0c0e] rounded-2xl flex flex-col overflow-hidden border border-[#1e1e24] shadow-2xl text-[#ededed]">
        {/* Header */}
        <div className="h-12 border-b border-[#1e1e24] flex items-center justify-between px-4 bg-[#0a0a0c]">
          <span className="text-xs font-semibold text-white">DopeNotch Settings</span>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-40 border-r border-[#1e1e24] p-2 space-y-0.5 bg-[#0a0a0c]">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = settingsSection === sec.id;

              return (
                <button
                  key={sec.id}
                  onClick={() => setSettingsSection(sec.id as any)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-black font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#000000]">
            {settingsSection === 'general' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#111114] border border-[#1e1e24]">
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

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#111114] border border-[#1e1e24]">
                  <div>
                    <p className="text-xs font-medium text-white">Typing Speed</p>
                    <p className="text-[11px] text-zinc-500">Words per minute for stats</p>
                  </div>
                  <input
                    type="number"
                    value={typingWPM}
                    onChange={(e) => setTypingWPM(Number(e.target.value))}
                    className="w-16 bg-[#09090b] border border-[#1e1e24] rounded-md px-2 py-1 text-xs text-white text-right font-mono"
                  />
                </div>
              </div>
            )}

            {settingsSection === 'dictation' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#111114] border border-[#1e1e24]">
                  <div>
                    <p className="text-xs font-medium text-white">Dictation Shortcut</p>
                    <p className="text-[11px] text-zinc-500">Global activation key</p>
                  </div>
                  <input
                    type="text"
                    value={hotkey}
                    onChange={(e) => setHotkey(e.target.value)}
                    className="w-28 bg-[#09090b] border border-[#1e1e24] rounded-md px-2 py-1 text-xs text-white text-center font-mono"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#111114] border border-[#1e1e24]">
                  <div>
                    <p className="text-xs font-medium text-white">Push-to-Talk</p>
                    <p className="text-[11px] text-zinc-500">Hold key while speaking</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushToTalk}
                    onChange={(e) => setPushToTalk(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#111114] border border-[#1e1e24]">
                  <div>
                    <p className="text-xs font-medium text-white">Auto-Paste</p>
                    <p className="text-[11px] text-zinc-500">Insert directly at cursor</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPaste}
                    onChange={(e) => setAutoPaste(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {settingsSection === 'audio' && (
              <div className="p-3 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-2">
                <label className="block text-xs font-medium text-white">Input Device</label>
                <select
                  value={selectedInputDevice}
                  onChange={(e) => setSelectedInputDevice(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1e1e24] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  {inputDevices.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {settingsSection === 'overlay' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'notch', title: 'Dynamic Notch', desc: 'Top notch + shelf' },
                  { id: 'minimal', title: 'Minimal Pill', desc: 'Floating bar' },
                  { id: 'hidden', title: 'Hidden', desc: 'Audio cues only' },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setOverlayStyle(style.id as OverlayStyle)}
                    className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
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
            )}

            {settingsSection === 'data' && (
              <div className="p-3 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white">Local Dictation Cache</p>
                  <p className="text-[11px] text-zinc-500">Stored on your Mac</p>
                </div>
                <button
                  onClick={clearHistory}
                  className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-medium border border-rose-500/20 transition-colors cursor-pointer"
                >
                  Clear Cache
                </button>
              </div>
            )}

            {settingsSection === 'license' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Active Edition</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                      licenseInfo?.is_pro
                        ? licenseInfo.tier === 'forever'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {licenseInfo?.is_pro
                        ? licenseInfo.tier === 'forever'
                          ? 'Pro Forever'
                          : 'Pro Core'
                        : 'Community Free'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {licenseInfo?.is_pro
                      ? `Registered to ${licenseInfo.customer_email || 'INFNI-T Customer'} with active entitlements.`
                      : 'Community edition active. Upgrade to DopeNotch Pro for unlimited history and dictation.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setActiveTab('preferences');
                    setSettingsSection('license');
                  }}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-medium border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Open Full License & Entitlements Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
