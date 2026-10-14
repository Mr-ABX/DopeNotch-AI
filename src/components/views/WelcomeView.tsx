import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Mic,
  Zap,
  ShieldAlert,
  Copy,
  Check,
  Search,
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
  const [copied, setCopied] = useState(false);

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

  const handleCopyTranscript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const needsPermissions = !permissions.microphone || !permissions.accessibility;

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#000000] text-[#ededed]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#ededed] tracking-tight">Overview</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Instant voice dictation & top-notch clipboard shelf</p>
        </div>

        <div className="flex items-center gap-2">
          {needsPermissions ? (
            <button
              onClick={handleRequestPermissions}
              disabled={isRequestingPerms}
              className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isRequestingPerms ? 'Requesting...' : 'Grant Permissions'}</span>
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              System Ready
            </span>
          )}
        </div>
      </div>

      {/* Permissions Banner if Missing */}
      {needsPermissions && (
        <div className="p-3.5 rounded-xl bg-[#141418] border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-zinc-300">
              {!permissions.microphone && !permissions.accessibility
                ? 'Microphone and Accessibility permissions required.'
                : !permissions.microphone
                ? 'Microphone permission required.'
                : 'Accessibility permission required for auto-typing.'}
            </span>
          </div>
          <button
            onClick={handleRequestPermissions}
            className="text-amber-400 hover:underline font-semibold cursor-pointer shrink-0"
          >
            Open Settings
          </button>
        </div>
      )}

      {/* Quick Status & Shortcuts Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Active Engine */}
        <button
          onClick={() => setActiveTab('voiceEngine')}
          className="p-3.5 rounded-xl bg-[#111114] border border-[#1e1e24] hover:border-zinc-700 transition-colors text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400">Speech Engine</p>
              <p className="text-xs font-medium text-white">{activeModel.name}</p>
            </div>
          </div>
          <span className="text-[10px] text-zinc-400 group-hover:text-white transition-colors">Change →</span>
        </button>

        {/* Dictation Shortcut */}
        <div className="p-3.5 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400">Dictation Shortcut</p>
              <p className="text-xs font-medium text-white">Press or Hold</p>
            </div>
          </div>
          <kbd className="px-2 py-0.5 rounded-md bg-[#18181c] text-zinc-200 border border-[#2a2a32] font-mono text-xs">
            {hotkey || '⌥Space'}
          </kbd>
        </div>

        {/* Search HUD */}
        <div className="p-3.5 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <Search className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400">SuperNotch HUD</p>
              <p className="text-xs font-medium text-white">Search & Clipboard</p>
            </div>
          </div>
          <kbd className="px-2 py-0.5 rounded-md bg-[#18181c] text-zinc-200 border border-[#2a2a32] font-mono text-xs">
            ⌥V
          </kbd>
        </div>
      </div>

      {/* Mic Test Sandbox */}
      <div className="p-5 rounded-2xl bg-[#111114] border border-[#1e1e24] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-white tracking-wide uppercase">Microphone & Transcription Test</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">Speak to verify microphone levels and Whisper speech-to-text.</p>
          </div>

          <button
            onClick={handleToggleLocalTest}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-500 text-white hover:bg-rose-600 animate-pulse'
                : 'bg-amber-500 text-black hover:bg-amber-400'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isRecording ? 'Stop & Transcribe' : 'Test Mic'}</span>
          </button>
        </div>

        {/* Live Audio or Result Box */}
        <div className="rounded-xl bg-[#09090b] border border-[#1e1e24] p-4 min-h-[90px] flex flex-col justify-center">
          {isRecording ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-rose-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Listening... Speak into microphone</span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {Math.round(audioLevel * 100)}%
                </span>
              </div>

              {/* Minimal Waveform Bar */}
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.max(6, audioLevel * 100 * 2.5))}%` }}
                />
              </div>

              {streamingText && (
                <p className="text-xs text-zinc-200 font-mono bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                  {streamingText}
                </p>
              )}
            </div>
          ) : latestTranscript ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono text-zinc-400">Latest Transcription:</span>
                <button
                  onClick={() => handleCopyTranscript(latestTranscript)}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-sans bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80">
                "{latestTranscript}"
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 text-center py-2">
              Click <span className="text-zinc-200 font-medium">"Test Mic"</span> or press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">{hotkey || '⌥Space'}</kbd> to test voice dictation.
            </p>
          )}
        </div>
      </div>

      {/* Quick Navigation Footer Row */}
      <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-4">
          <span>Engine: <strong className="text-zinc-300 font-medium">{activeModel.name}</strong></span>
          <span>•</span>
          <span>Latency: <strong className="text-zinc-300 font-medium">Real-Time (~120ms)</strong></span>
          <span>•</span>
          <span>Storage: <strong className="text-zinc-300 font-medium">100% Offline</strong></span>
        </div>

        <button
          onClick={() => setActiveTab('preferences')}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          Preferences →
        </button>
      </div>
    </div>
  );
};
