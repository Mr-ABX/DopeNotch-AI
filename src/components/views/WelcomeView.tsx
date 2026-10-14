import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Mic,
  Play,
  Sparkles,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { invoke } from '@tauri-apps/api/core';

interface SystemPermissions {
  accessibility: boolean;
  microphone: boolean;
  microphone_status: string;
}

export const WelcomeView: React.FC = () => {
  const {
    hotkey,
    selectedSpeechModel,
    models,
    audioLevel,
    isRecording,
    streamingText,
    historyRecords,
    setActiveTab,
  } = useAppStore();

  const [permissions, setPermissions] = useState<SystemPermissions>({
    accessibility: true,
    microphone: true,
    microphone_status: 'authorized',
  });
  const [isRequestingPerms, setIsRequestingPerms] = useState(false);

  const fetchPermissions = async () => {
    try {
      const res = await invoke<SystemPermissions>('check_system_permissions');
      setPermissions(res);
    } catch (err) {
      console.error('Failed to check permissions:', err);
    }
  };

  useEffect(() => {
    fetchPermissions();
    const interval = setInterval(fetchPermissions, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermissions = async () => {
    setIsRequestingPerms(true);
    try {
      const res = await invoke<SystemPermissions>('request_system_permissions');
      setPermissions(res);
    } catch (err) {
      console.error('Failed to request permissions:', err);
    } finally {
      setIsRequestingPerms(false);
    }
  };

  const activeModel = models.find((m) => m.id === selectedSpeechModel) || models[0];
  const latestTranscript = historyRecords[0]?.enhancedText || historyRecords[0]?.rawText;

  const handleToggleLocalTest = async () => {
    try {
      await invoke('toggle_recording');
    } catch (e) {
      console.error('Failed to toggle recording:', e);
    }
  };

  const needsPermissions = !permissions.microphone || !permissions.accessibility;

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 space-y-6 bg-[#000000] text-[#ededed]">
      {/* Hero Welcome Banner */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold tracking-wide uppercase">DopeNotch • Top-Notch Dictation</span>
        </div>
        <h1 className="text-2xl font-bold text-[#ededed] tracking-tight">Talk anywhere. DopeNotch types for you.</h1>
        <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
          Ultra-fast, on-device Whisper voice dictation with 1:1 Apple-style top notch, live clipboard synchronization shelf, and Raycast fast search.
        </p>
      </div>

      {/* Permissions Alert Banner (if needed) */}
      {needsPermissions && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-300">macOS System Permissions Needed</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {!permissions.microphone && !permissions.accessibility
                  ? 'Microphone and Accessibility are required to record speech and auto-type text.'
                  : !permissions.microphone
                  ? 'Microphone permission is required to capture speech.'
                  : 'Accessibility permission is required for 1-click text insertion.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestPermissions}
            disabled={isRequestingPerms}
            className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-all shrink-0 cursor-pointer"
          >
            {isRequestingPerms ? 'Requesting...' : 'Grant Permissions'}
          </button>
        </div>
      )}

      {/* Quick Status Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">System Status & Engine</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Card 1: Voice Model Ready */}
          <div
            onClick={() => setActiveTab('voiceEngine')}
            className="p-4 rounded-2xl bg-[#121215] border border-[#1e1e24] flex items-center justify-between hover:border-[#2a2a32] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#ededed]">Whisper Engine Active</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {activeModel.name} (On-Device)
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              Ready
            </span>
          </div>

          {/* Card 2: Top Notch / SuPaste Active */}
          <div className="p-4 rounded-2xl bg-[#121215] border border-[#1e1e24] flex items-center justify-between hover:border-[#2a2a32] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#ededed]">SuperNotch & SuPaste</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Live OS Clipboard Sync</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-medium text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
              Enabled
            </span>
          </div>

          {/* Card 3: Microphone Permission */}
          <div className="p-4 rounded-2xl bg-[#121215] border border-[#1e1e24] flex items-center justify-between hover:border-[#2a2a32] transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                permissions.microphone
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {permissions.microphone ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#ededed]">Microphone Access</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">CoreAudio Studio Input</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-medium px-2.5 py-1 rounded-full border ${
              permissions.microphone
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                : 'text-red-400 bg-red-500/10 border-red-500/20 cursor-pointer'
            }`}
            onClick={!permissions.microphone ? handleRequestPermissions : undefined}
            >
              {permissions.microphone ? 'Granted' : 'Grant Now'}
            </span>
          </div>

          {/* Card 4: Accessibility */}
          <div className="p-4 rounded-2xl bg-[#121215] border border-[#1e1e24] flex items-center justify-between hover:border-[#2a2a32] transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                permissions.accessibility
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {permissions.accessibility ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#ededed]">Accessibility Typing</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Direct 1-Click Paste</p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-medium px-2.5 py-1 rounded-full border ${
              permissions.accessibility
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                : 'text-red-400 bg-red-500/10 border-red-500/20 cursor-pointer'
            }`}
            onClick={!permissions.accessibility ? handleRequestPermissions : undefined}
            >
              {permissions.accessibility ? 'Granted' : 'Grant Now'}
            </span>
          </div>
        </div>
      </div>

      {/* How to Use Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <h2 className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">Workflow Shortcuts</h2>
        </div>

        <div className="p-4 rounded-2xl bg-[#121215] border border-[#1e1e24] space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#18181c] border border-[#2a2a32] text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <p className="text-xs font-medium text-[#ededed]">Voice Dictation Hotkey</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Press global shortcut <kbd className="px-2 py-0.5 rounded-md bg-[#18181c] text-amber-400 border border-[#2a2a32] font-mono text-[10px]">{hotkey || '⌥Space'}</kbd> or click the top notch to start/stop speaking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#18181c] border border-[#2a2a32] text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <p className="text-xs font-medium text-[#ededed]">Raycast Fast Search & HUD Hotkey</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Press global shortcut <kbd className="px-2 py-0.5 rounded-md bg-[#18181c] text-amber-400 border border-[#2a2a32] font-mono text-[10px]">⌥V</kbd> or <kbd className="px-2 py-0.5 rounded-md bg-[#18181c] text-amber-400 border border-[#2a2a32] font-mono text-[10px]">⇧⌘V</kbd> to open search & tools HUD in the notch. Type <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono text-[10px]">/color</kbd> for screen loupe eyedropper.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#18181c] border border-[#2a2a32] text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <p className="text-xs font-medium text-[#ededed]">SuPaste Card Shelf & Vault</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Swipe left on trackpad or press <kbd className="px-1.5 py-0.5 rounded bg-[#18181c] text-amber-400 font-mono text-[10px]">Tab</kbd> in the notch to browse your horizontal clipboard history cards.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tryout Sandbox */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-[#1e1e24] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-[#ededed]">Interactive Mic & Dictation Sandbox</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Test your microphone and voice latency right inside this card.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#09090b] border border-[#1e1e24] p-4 min-h-[110px] flex flex-col justify-between">
          <div className="text-xs text-zinc-300 leading-relaxed font-sans">
            {isRecording ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Recording voice input... (Speak into your mic)</span>
                </div>
                {/* 60 FPS Visualizer bar */}
                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(8, audioLevel * 100 * 2.5))}%` }}
                  />
                </div>
                {streamingText && (
                  <p className="text-zinc-200 font-mono text-xs bg-zinc-900/60 p-2 rounded-md border border-zinc-800">
                    {streamingText}
                  </p>
                )}
              </div>
            ) : (
              <div>
                {latestTranscript ? (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold">Latest On-Device Transcription:</span>
                    <p className="text-zinc-100 font-medium text-xs bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80">
                      "{latestTranscript}"
                    </p>
                  </div>
                ) : (
                  <p className="text-zinc-400">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700 font-mono text-[10px]">{hotkey || '⌥Space'}</kbd> or click "Test Speech Input" below to start speaking.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#1a1a1c] mt-3">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Active: {activeModel.name}</span>
            </div>

            <button
              onClick={handleToggleLocalTest}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isRecording ? 'Stop & Transcribe' : 'Test Speech Input'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
