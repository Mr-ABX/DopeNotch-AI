import React, { useState, useEffect } from 'react';
import {
  Zap,
  Download,
  Check,
  Search,
  FolderOpen,
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
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'Local Whisper' | 'Cloud'>('all');

  useEffect(() => {
    // Query downloaded models from Rust backend
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

  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.languages.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider =
      providerFilter === 'all' ||
      (providerFilter === 'Local Whisper' && (m.provider === 'Local Whisper' || m.provider === 'OpenAI')) ||
      (providerFilter === 'Cloud' && m.provider === 'Cloud');
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
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        if (progress >= 100) {
          clearInterval(interval);
          setDownloadProgress(model.id, 100);
          markModelInstalled(model.id);
        } else {
          setDownloadProgress(model.id, progress);
        }
      }, 200);
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
      // Browser preview mode
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-5 bg-[#000000] text-[#ededed]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#ededed] tracking-tight">Voice Engine</h1>
          <p className="text-xs text-zinc-400 mt-0.5">On-device Whisper models running offline on Apple Metal / CPU</p>
        </div>

        <button
          onClick={handleOpenFolder}
          className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Models Folder</span>
        </button>
      </div>

      {/* Active Model Summary Card */}
      <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{activeModel.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/10">
                {activeModel.provider}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono mt-0.5">
              <span>{activeModel.diskSize}</span>
              <span>•</span>
              <span>{activeModel.ramFootprint} RAM</span>
              <span>•</span>
              <span>{Math.round(activeModel.speedPercent * 100)}% Speed</span>
            </div>
          </div>
        </div>

        <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Active Engine
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111114] border border-[#1e1e24] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#111114] p-1 rounded-lg border border-[#1e1e24] text-xs">
          {(['all', 'Local Whisper', 'Cloud'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={`px-2.5 py-1 rounded-md transition-all capitalize text-[11px] font-medium ${
                providerFilter === p
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Models Table / List */}
      <div className="space-y-2">
        {filteredModels.map((model) => {
          const isSelected = selectedSpeechModel === model.id;
          const isDownloading =
            downloadProgress[model.id] !== undefined && downloadProgress[model.id] < 100;

          return (
            <div
              key={model.id}
              className={`p-3.5 rounded-xl bg-[#111114] border flex items-center justify-between gap-4 transition-all ${
                isSelected
                  ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                  : 'border-[#1e1e24] hover:border-[#2a2a32]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-white truncate">{model.name}</h3>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/10">
                    {model.provider}
                  </span>
                  {model.isDefault && (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      (Recommended)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono mt-1">
                  <span>{model.diskSize}</span>
                  <span>•</span>
                  <span>{model.languages}</span>
                  <span>•</span>
                  <span>{Math.round(model.speedPercent * 100)}% Speed</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0">
                {model.isInstalled ? (
                  isSelected ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSelectModel(model.id)}
                      className="px-3 py-1 rounded-full text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                    >
                      Select
                    </button>
                  )
                ) : isDownloading ? (
                  <div className="w-28 space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Downloading</span>
                      <span>{downloadProgress[model.id]}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${downloadProgress[model.id]}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(model)}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Download
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
