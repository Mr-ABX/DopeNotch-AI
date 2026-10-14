import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldCheck,
  Cpu,
  Download,
  Check,
  Search,
  Filter,
  FolderOpen,
  HardDrive,
  Mic,
} from 'lucide-react';
import { useAppStore, SpeechModelInfo } from '../../stores/appStore';
import { invoke } from '@tauri-apps/api/core';

export const VoiceEngineView: React.FC = () => {
  const {
    models,
    selectedSpeechModel,
    setSelectedSpeechModel,
    downloadProgress,
    setDownloadProgress,
    markModelInstalled,
    isRecording,
    audioLevel,
    streamingText,
    historyRecords,
    hotkey,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'Local Whisper' | 'Cloud' | 'Apple'>('all');
  const [modelDirStatus] = useState<string>('~/Library/Application Support/DopeNotch/models');

  useEffect(() => {
    // Check downloaded models from backend
    invoke<Record<string, boolean>>('get_downloaded_models')
      .then((downloaded) => {
        if (downloaded) {
          Object.entries(downloaded).forEach(([modelKey, isDown]) => {
            if (isDown) {
              const matched = models.find((m) => m.id.includes(modelKey) || modelKey.includes(m.id));
              if (matched) {
                markModelInstalled(matched.id);
              }
            }
          });
        }
      })
      .catch(() => {});
  }, []);

  const activeModel = models.find((m) => m.id === selectedSpeechModel) || models[0];
  const latestTranscript = historyRecords[0]?.enhancedText || historyRecords[0]?.rawText;

  const handleToggleTestRecording = async () => {
    try {
      await invoke('toggle_recording');
    } catch (e) {
      console.error('Failed to toggle recording:', e);
    }
  };

  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.languages.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider =
      providerFilter === 'all' ||
      m.provider === providerFilter ||
      (providerFilter === 'Local Whisper' && (m.provider === 'Local Whisper' || m.provider === 'OpenAI'));
    return matchesSearch && matchesProvider;
  });

  const handleOpenFolder = async () => {
    try {
      await invoke('open_models_directory');
    } catch (e) {
      console.error('Failed to open models folder', e);
    }
  };

  const handleDownload = async (model: SpeechModelInfo) => {
    if (model.isInstalled) return;

    // Map model ID to Rust WhisperModel enum
    let rustModel = 'base';
    if (model.id.includes('tiny')) rustModel = 'tiny';
    else if (model.id.includes('small')) rustModel = 'small';
    else if (model.id.includes('medium')) rustModel = 'medium';
    else if (model.id.includes('large')) rustModel = 'large-v3-turbo';

    setDownloadProgress(model.id, 1);

    try {
      await invoke('download_model', { model: rustModel });
    } catch (err) {
      console.error('Download error:', err);
      // Fallback progress simulation for web/demo mode
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        if (progress >= 100) {
          clearInterval(interval);
          setDownloadProgress(model.id, 100);
          markModelInstalled(model.id);
        } else {
          setDownloadProgress(model.id, progress);
        }
      }, 250);
    }
  };

  const handleSelectModel = async (modelId: string) => {
    setSelectedSpeechModel(modelId);
    try {
      let rustModel = 'base';
      if (modelId.includes('tiny')) rustModel = 'tiny';
      else if (modelId.includes('small')) rustModel = 'small';
      else if (modelId.includes('medium')) rustModel = 'medium';
      else if (modelId.includes('large')) rustModel = 'large-v3-turbo';

      const current = await invoke<any>('get_settings');
      if (current) {
        current.model = rustModel;
        current.cloudProvider = modelId.includes('cloud') ? 'groq' : 'local';
        await invoke('save_settings', { settings: current });
      }
    } catch (e) {
      // Running in browser dev mode
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 space-y-6 bg-[#000000] text-[#ededed]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#ededed] tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Speech Engines & Local Whisper
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Choose your on-device Whisper model. 100% offline, zero latency, runs directly on CPU / Apple Metal.
          </p>
        </div>

        <button
          onClick={handleOpenFolder}
          className="btn-swift-ghost px-3.5 py-1.5 text-xs font-medium flex items-center gap-2"
        >
          <FolderOpen className="w-4 h-4 text-amber-400" />
          <span>Open Models Folder</span>
        </button>
      </div>

      {/* Interactive Speech Test Sandbox */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-[#1e1e24] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-[#ededed] flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-amber-400" /> Live Dictation Test
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Press shortcut <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-[10px]">{hotkey || '⌥Space'}</kbd> or click the test button below.
            </p>
          </div>
          <button
            onClick={handleToggleTestRecording}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                : 'bg-amber-500 text-black hover:bg-amber-400'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isRecording ? 'Stop & Transcribe' : 'Test Mic & Dictation'}</span>
          </button>
        </div>

        {isRecording ? (
          <div className="rounded-xl bg-[#09090b] border border-amber-500/30 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-medium text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Recording microphone input in real-time...</span>
            </div>
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
        ) : latestTranscript ? (
          <div className="rounded-xl bg-[#09090b] border border-[#1e1e24] p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold">Latest Transcription Output:</span>
            <p className="text-zinc-100 font-medium text-xs leading-relaxed">
              "{latestTranscript}"
            </p>
          </div>
        ) : null}
      </div>

      {/* Local Storage Info Callout */}
      <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#1e1e24] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 text-zinc-300">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span>
            Local Models Path: <code className="text-zinc-200 font-mono text-[11px] bg-[#09090b] px-2 py-0.5 rounded border border-[#1e1e24]">{modelDirStatus}</code>
          </span>
        </div>
        <span className="text-[11px] text-amber-400 font-medium bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
          whisper.cpp Engine
        </span>
      </div>

      {/* Dynamic Model Comparison Benchmark Card */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-[#1e1e24] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#ededed]">
              Active Benchmark ({activeModel.name})
            </h2>
          </div>
          <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-medium">
            Active Engine
          </span>
        </div>

        {/* 3 Benchmark Metric Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Speed */}
          <div className="p-3.5 rounded-xl bg-[#09090b] border border-[#1e1e24] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Latency / Speed
              </span>
              <span className="text-white font-mono font-bold">
                {Math.round(activeModel.speedPercent * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1c1c1c] overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${activeModel.speedPercent * 100}%` }}
              />
            </div>
          </div>

          {/* Accuracy */}
          <div className="p-3.5 rounded-xl bg-[#09090b] border border-[#1e1e24] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Precision
              </span>
              <span className="text-white font-mono font-bold">
                {Math.round(activeModel.accuracyPercent * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1c1c1c] overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${activeModel.accuracyPercent * 100}%` }}
              />
            </div>
          </div>

          {/* RAM Footprint */}
          <div className="p-3.5 rounded-md bg-[#0a0a0a] border border-[#222222] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-zinc-400" /> RAM Footprint
              </span>
              <span className="text-white font-mono font-bold">{activeModel.ramFootprint}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1c1c1c] overflow-hidden">
              <div
                className="h-full bg-zinc-300 rounded-full transition-all duration-500"
                style={{
                  width: activeModel.ramFootprint === '0 MB' ? '10%' : '45%',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Model Catalog Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search speech models or languages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#444444]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#0a0a0a] p-1 rounded-md border border-[#222222] text-xs">
          <Filter className="w-3.5 h-3.5 text-zinc-400 ml-2 mr-1" />
          {(['all', 'Local Whisper', 'Cloud', 'Apple'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={`px-2.5 py-1 rounded-full transition-all capitalize font-medium ${
                providerFilter === p
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Models List */}
      <div className="space-y-3">
        {filteredModels.map((model) => {
          const isSelected = selectedSpeechModel === model.id;
          const isDownloading =
            downloadProgress[model.id] !== undefined && downloadProgress[model.id] < 100;

          return (
            <div
              key={model.id}
              className={`p-4 rounded-2xl bg-[#121215] border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                isSelected ? 'border-amber-400/50 bg-[#16161a] ring-1 ring-amber-400/20' : 'border-[#1e1e24] hover:border-[#2a2a32]'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-white">{model.name}</h3>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#18181c] text-zinc-400 border border-[#2a2a32]">
                    {model.provider}
                  </span>
                  {model.isDefault && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">{model.description}</p>
                <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-1 font-mono">
                  <span>🌐 {model.languages}</span>
                  <span>🧠 RAM: {model.ramFootprint}</span>
                  <span>💾 Disk: {model.diskSize}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {model.isInstalled ? (
                  isSelected ? (
                    <button
                      disabled
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Active Model
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectModel(model.id)}
                      className="btn-swift-ghost px-3.5 py-1.5 text-xs font-semibold hover:border-[#444444]"
                    >
                      Select Model
                    </button>
                  )
                ) : isDownloading ? (
                  <div className="w-32 space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                      <span>Downloading</span>
                      <span>{downloadProgress[model.id]}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${downloadProgress[model.id]}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(model)}
                    className="btn-swift-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
