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

      {/* Quick Status & Shortcuts Strip (Bento Layout - Clean Hierarchy, No Collisions) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Active Speech Engine */}
        <button
          onClick={() => setActiveTab('voiceEngine')}
          className="p-4 rounded-2xl bg-[#0e0e11] border border-white/[0.08] hover:border-white/25 hover:bg-[#121216] transition-all text-left flex flex-col justify-between h-[112px] group cursor-pointer shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-amber-400 group-hover:scale-105 transition-all">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-zinc-400">Speech Engine</span>
            </div>
            <span className="text-[10px] font-medium text-zinc-500 group-hover:text-white transition-colors flex items-center gap-0.5">
              Change →
            </span>
          </div>

          <div className="min-w-0 pr-1">
            <p className="text-[13.5px] font-semibold text-white truncate" title={activeModel.name}>
              {activeModel.name}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>On-Device • ~120ms Latency</span>
          </div>
        </button>

        {/* Card 2: Voice Dictation Shortcut */}
        <div className="p-4 rounded-2xl bg-[#0e0e11] border border-white/[0.08] flex flex-col justify-between h-[112px] shadow-sm">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                <Mic className="w-3.5 h-3.5 text-zinc-300" />
              </div>
              <span className="text-[11px] font-medium text-zinc-400">Voice Dictation</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Global</span>
          </div>

          <div>
            <p className="text-[13.5px] font-semibold text-white">Press &amp; Hold to Speak</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Hold key while talking</span>
            <kbd className="px-2 py-0.5 rounded-md bg-[#16161a] text-zinc-200 border border-white/10 font-mono text-xs shadow-inner">
              {hotkey || '⌥Space'}
            </kbd>
          </div>
        </div>

        {/* Card 3: SuperNotch HUD */}
        <div className="p-4 rounded-2xl bg-[#0e0e11] border border-white/[0.08] flex flex-col justify-between h-[112px] shadow-sm">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                <Search className="w-3.5 h-3.5 text-zinc-300" />
              </div>
              <span className="text-[11px] font-medium text-zinc-400">SuperNotch HUD</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Top Bezel</span>
          </div>

          <div>
            <p className="text-[13.5px] font-semibold text-white">Search, Stash &amp; Shelf</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Hover or Trigger</span>
            <kbd className="px-2 py-0.5 rounded-md bg-[#16161a] text-zinc-200 border border-white/10 font-mono text-xs shadow-inner">
              ⌥V
            </kbd>
          </div>
        </div>
      </div>

      {/* Mic Test Sandbox (Interactive Live Audio Equalizer & Latency Tester) */}
      <div className="p-4.5 rounded-2xl bg-[#0e0e11] border border-white/[0.08] space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[12px] font-semibold text-white tracking-wide uppercase font-mono">
              Microphone &amp; Transcription Sandbox
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Speak freely to verify microphone gain and local Whisper latency.
            </p>
          </div>

          <button
            onClick={handleToggleLocalTest}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              isRecording
                ? 'bg-rose-500 text-white hover:bg-rose-600 animate-pulse'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isRecording ? 'Stop & Transcribe' : 'Test Mic'}</span>
          </button>
        </div>

        {/* Live Audio & Transcript Result Box */}
        <div className="rounded-xl bg-[#08080a] border border-white/[0.06] p-4 min-h-[95px] flex flex-col justify-center">
          {isRecording ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-rose-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Listening... Speak into your microphone</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Gain: {Math.round(audioLevel * 100)}%
                </span>
              </div>

              {/* Dynamic 8-bar equalizer */}
              <div className="flex items-center justify-center gap-1.5 h-6">
                {[0.4, 0.7, 1.0, 0.6, 0.9, 1.2, 0.5, 0.8].map((factor, i) => {
                  const h = Math.max(4, Math.min(24, audioLevel * factor * 70));
                  return (
                    <div
                      key={i}
                      className="w-1.5 bg-rose-500 rounded-full transition-all duration-75"
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>

              {streamingText && (
                <p className="text-xs text-zinc-200 font-mono bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.08]">
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
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-sans bg-white/[0.03] p-3 rounded-lg border border-white/[0.06]">
                "{latestTranscript}"
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 text-center py-2 font-mono">
              Click <span className="text-zinc-200 font-medium">"Test Mic"</span> or hold <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-200 font-mono text-[10px]">{hotkey || '⌥Space'}</kbd> to test voice dictation.
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
