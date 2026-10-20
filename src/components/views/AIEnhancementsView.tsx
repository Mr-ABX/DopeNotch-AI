import React, { useState, useEffect } from 'react';
import {
  Bot,
  Eye,
  Key,
  FolderOpen,
  Check,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Cpu,
  Terminal,
  Mic,
  Send,
  ExternalLink,
  Trash2,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import {
  AVAILABLE_AI_MODELS,
  AIModelId,
  sendAIChatRequest,
  checkLocalOllamaHealth,
  pullOllamaModel,
  deleteOllamaModel,
} from '../../services/aiChatService';
import { invoke } from '@tauri-apps/api/core';

export const AIEnhancementsView: React.FC = () => {
  const {
    apiKeys,
    setApiKey,
    setActiveTab,
  } = useAppStore();

  const [selectedModel, setSelectedModel] = useState<AIModelId>('qwen2.5-0.5b');
  const [testInput, setTestInput] = useState('Analyze this code and generate a markdown checklist');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [savedKeyFeedback, setSavedKeyFeedback] = useState<string | null>(null);
  const [visibleKey, setVisibleKey] = useState<Record<string, boolean>>({});

  // Local Ollama & LLM Detection & Download State
  const [isOllamaOnline, setIsOllamaOnline] = useState(false);
  const [installedLocalModels, setInstalledLocalModels] = useState<string[]>([]);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState('');

  const refreshLocalHealth = async () => {
    const health = await checkLocalOllamaHealth();
    setIsOllamaOnline(health.isOnline);
    setInstalledLocalModels(health.installedModels);
  };

  useEffect(() => {
    refreshLocalHealth();
    const interval = setInterval(refreshLocalHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadModel = async (modelId: string) => {
    const target = modelId === 'qwen2.5-0.5b' ? 'qwen2.5:0.5b' : 'smollm2:135m';
    setDownloadingModelId(modelId);
    setDownloadProgress(0);
    setDownloadStatusText('Connecting to Ollama...');

    try {
      await pullOllamaModel(target, (pct, status) => {
        setDownloadProgress(pct);
        setDownloadStatusText(status);
      });
      await refreshLocalHealth();
      setDownloadStatusText('Downloaded ✓');
    } catch (e: any) {
      setDownloadStatusText(`Failed: ${e.message || 'Error'}`);
    } finally {
      setTimeout(() => {
        setDownloadingModelId(null);
        setDownloadProgress(0);
      }, 2500);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    const target = modelId === 'qwen2.5-0.5b' ? 'qwen2.5:0.5b' : 'smollm2:135m';
    try {
      await deleteOllamaModel(target);
      await refreshLocalHealth();
    } catch (e: any) {
      console.error('Failed to delete model', e);
    }
  };

  const [isStartingOllama, setIsStartingOllama] = useState(false);

  const handleStartOllama = async () => {
    setIsStartingOllama(true);
    try {
      await invoke('check_or_start_ollama');
      await refreshLocalHealth();
    } catch (e) {
      console.error('Failed to auto-start local Ollama engine:', e);
    } finally {
      setIsStartingOllama(false);
    }
  };

  const handleOpenExtensionsFolder = async () => {
    try {
      await invoke('open_storage_directory', { subfolder: 'extensions' });
    } catch (e) {
      console.error('Failed to open extensions folder', e);
    }
  };

  const handleOpenLocalModelsFolder = async () => {
    try {
      await invoke('open_storage_directory', { subfolder: 'models' });
    } catch (e) {
      console.error('Failed to open local models folder', e);
    }
  };

  const handleSaveKey = (provider: string, value: string) => {
    setApiKey(provider, value);
    setSavedKeyFeedback(provider);
    setTimeout(() => setSavedKeyFeedback(null), 1800);
  };

  const toggleKeyVisibility = (provider: string) => {
    setVisibleKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleRunTest = async () => {
    if (!testInput.trim() || isTesting) return;
    setIsTesting(true);
    setTestOutput('');

    try {
      const response = await sendAIChatRequest(
        testInput,
        selectedModel,
        null,
        apiKeys['gemini'],
        apiKeys['openai'],
        apiKeys['grok'],
        apiKeys['openrouter']
      );
      setTestOutput(response);
    } catch (err: any) {
      setTestOutput(`Error: ${err?.message || 'Failed to process prompt'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-7 space-y-6 bg-[#121214] text-[#ededed]">
      {/* Header: Clean Monochrome */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-4 h-4 text-zinc-300" />
            <span>AI Models & Screen Vision</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            On-device local brains, screen vision models, and coder script extensions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenLocalModelsFolder}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open unified models folder in Finder (~/Documents/DopeNotch/models)"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>models/</span>
          </button>

          <button
            onClick={handleOpenExtensionsFolder}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open unified extensions folder in Finder (~/Documents/DopeNotch/extensions)"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>extensions/</span>
          </button>
        </div>
      </div>

      {/* Model Role Architecture Overview: Clean Compact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Voice Engine (Speech) */}
        <div className="p-3.5 rounded-2xl bg-[#18181b] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-zinc-300 shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">Voice Engine</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/[0.06] text-zinc-400 font-mono">
                  Whisper CPP
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                On-device speech-to-text dictation & continuous meeting scribe.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('voiceEngine')}
            className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors shrink-0"
          >
            Manage
          </button>
        </div>

        {/* AI Copilot (LLMs) */}
        <div className="p-3.5 rounded-2xl bg-[#18181b] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-zinc-300 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">AI Copilot & Vision</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/[0.06] text-zinc-400 font-mono">
                  Smart LLMs
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                SuperNotch floating chat island, full-screen vision & grammar fixer.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 px-2 py-1">
            Tab 4 (✦)
          </span>
        </div>
      </div>

      {/* Available AI Models Grid: Monochrome & Minimal */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Available Models
            </span>
            {isOllamaOnline ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Local Engine Online ({installedLocalModels.length} models ready)
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Local Engine Offline
                </span>
                <button
                  onClick={handleStartOllama}
                  disabled={isStartingOllama}
                  className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-zinc-200 hover:text-white text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                  title="Auto-detect & start Ollama in background"
                >
                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                  <span>{isStartingOllama ? 'Starting...' : 'Auto-Launch Engine'}</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={refreshLocalHealth}
            title="Refresh local model status"
            className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {AVAILABLE_AI_MODELS.map((model) => {
            const isSelected = selectedModel === model.id;
            const targetOllamaName = model.id === 'qwen2.5-0.5b' ? 'qwen2.5:0.5b' : 'smollm2:135m';
            const isInstalled =
              model.isLocal &&
              isOllamaOnline &&
              installedLocalModels.some((m) => m.toLowerCase().includes(targetOllamaName));
            const isDownloadingThis = downloadingModelId === model.id;

            return (
              <div
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`p-3 rounded-2xl bg-[#18181b] border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-white/30 bg-[#202024] shadow-sm'
                    : 'border-white/[0.06] hover:border-white/15 hover:bg-[#1c1c20]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-white">{model.name}</span>
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                      {model.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 line-clamp-2">
                    {model.description}
                  </p>
                </div>

                {isDownloadingThis && (
                  <div className="w-full mt-2.5 pt-2 border-t border-white/[0.06] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="flex items-center gap-1 text-zinc-300">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {downloadStatusText || 'Downloading...'}
                      </span>
                      <span className="font-mono text-zinc-200">{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-200"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/[0.04] text-[10.5px]">
                  <span className="flex items-center gap-1 font-mono text-zinc-500">
                    {model.supportsVision ? (
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Vision
                      </span>
                    ) : model.isLocal ? (
                      isInstalled ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteModel(model.id);
                            }}
                            title="Delete model from disk to free up space"
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : isOllamaOnline ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadModel(model.id);
                          }}
                          className="px-2 py-0.5 rounded bg-white/[0.08] hover:bg-white/20 text-[10px] text-white flex items-center gap-1 transition-all"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                      ) : (
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Cpu className="w-3 h-3" /> Local CPU
                        </span>
                      )
                    ) : (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Cpu className="w-3 h-3" /> API Model
                      </span>
                    )}
                  </span>

                  {isSelected ? (
                    <span className="text-white font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="text-zinc-500 hover:text-zinc-300">Select</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Vision Auto-Router Banner */}
      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-start gap-3">
        <div className="p-2 rounded-xl bg-white/[0.06] text-white shrink-0">
          <Eye className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="font-medium text-white flex items-center gap-2">
            <span>Intelligent Vision Auto-Router</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.1] text-zinc-300 font-mono">0 MB Local RAM</span>
          </div>
          <p className="text-zinc-400 leading-relaxed text-[11px]">
            Text and dictation run 100% locally on-device at 0.0% idle memory. When you toggle Screen Vision or attach a screen snapshot, DopeNotch automatically routes image understanding to Gemini 2.0 Flash or OpenRouter Vision—saving 2GB+ of RAM and eliminating Intel Mac fan noise.
          </p>
        </div>
      </div>

      {/* Cloud API Keys: Google AI Studio, Grok, OpenRouter */}
      <div className="p-4 rounded-2xl bg-[#18181b] border border-white/[0.06] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
              API Keys Configuration
            </h2>
          </div>
          <span className="text-[10.5px] text-zinc-500 font-mono">Stored locally on your device</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 1. Google AI Studio Key (Gemini 2.0 Flash) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                <span>Google AI Studio Key</span>
                <span className="text-[9.5px] text-zinc-500 font-mono">(Free Screen Vision)</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5"
              >
                <span>Get Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={visibleKey['gemini'] ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={apiKeys['gemini'] || ''}
                onChange={(e) => handleSaveKey('gemini', e.target.value)}
                className="flex-1 bg-[#121214] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility('gemini')}
                className="px-2 py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white text-[11px]"
              >
                {visibleKey['gemini'] ? 'Hide' : 'Show'}
              </button>
              {savedKeyFeedback === 'gemini' && (
                <span className="text-xs text-white font-mono shrink-0">Saved ✓</span>
              )}
            </div>
          </div>

          {/* 2. xAI Grok Key */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                <span>Grok (xAI) API Key</span>
              </label>
              <a
                href="https://console.x.ai"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5"
              >
                <span>Get Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={visibleKey['grok'] ? 'text' : 'password'}
                placeholder="xai-..."
                value={apiKeys['grok'] || ''}
                onChange={(e) => handleSaveKey('grok', e.target.value)}
                className="flex-1 bg-[#121214] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility('grok')}
                className="px-2 py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white text-[11px]"
              >
                {visibleKey['grok'] ? 'Hide' : 'Show'}
              </button>
              {savedKeyFeedback === 'grok' && (
                <span className="text-xs text-white font-mono shrink-0">Saved ✓</span>
              )}
            </div>
          </div>

          {/* 3. OpenRouter Key (200+ Models) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                <span>OpenRouter API Key</span>
                <span className="text-[9.5px] text-zinc-500 font-mono">(All Models)</span>
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5"
              >
                <span>Get Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={visibleKey['openrouter'] ? 'text' : 'password'}
                placeholder="sk-or-v1-..."
                value={apiKeys['openrouter'] || ''}
                onChange={(e) => handleSaveKey('openrouter', e.target.value)}
                className="flex-1 bg-[#121214] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility('openrouter')}
                className="px-2 py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white text-[11px]"
              >
                {visibleKey['openrouter'] ? 'Hide' : 'Show'}
              </button>
              {savedKeyFeedback === 'openrouter' && (
                <span className="text-xs text-white font-mono shrink-0">Saved ✓</span>
              )}
            </div>
          </div>

          {/* 4. OpenAI / Custom Key */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-300 font-medium">OpenAI Key (GPT-4o)</label>
              <span className="text-[9.5px] text-zinc-500 font-mono">Optional</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={visibleKey['openai'] ? 'text' : 'password'}
                placeholder="sk-..."
                value={apiKeys['openai'] || ''}
                onChange={(e) => handleSaveKey('openai', e.target.value)}
                className="flex-1 bg-[#121214] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility('openai')}
                className="px-2 py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white text-[11px]"
              >
                {visibleKey['openai'] ? 'Hide' : 'Show'}
              </button>
              {savedKeyFeedback === 'openai' && (
                <span className="text-xs text-white font-mono shrink-0">Saved ✓</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Coder Extensions (~/.dopenotch/extensions) */}
      <div className="p-4 rounded-2xl bg-[#18181b] border border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
              Custom Scripts (~/.dopenotch/extensions)
            </h2>
          </div>
          <button
            onClick={handleOpenExtensionsFolder}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>Open in Finder</span>
            <span>→</span>
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Executable scripts (<code className="text-zinc-300 font-mono">.sh</code>, <code className="text-zinc-300 font-mono">.py</code>, <code className="text-zinc-300 font-mono">.js</code>, <code className="text-zinc-300 font-mono">.ts</code>) are indexed automatically and run directly from the search palette.
        </p>

        <div className="p-2.5 rounded-xl bg-[#121214] border border-white/[0.06] font-mono text-[11px] text-zinc-400 space-y-0.5">
          <p className="text-zinc-300">#!/usr/bin/env bash</p>
          <p className="text-zinc-400"># @title: Check GitHub PRs</p>
          <p className="text-zinc-400"># @mode: notch</p>
          <p className="text-zinc-200">gh pr list --limit 5</p>
        </div>
      </div>

      {/* Test Sandbox: Clean & Focused */}
      <div className="p-4 rounded-2xl bg-[#18181b] border border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
              AI Test Sandbox
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">{selectedModel}</span>
        </div>

        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunTest()}
              className="flex-1 bg-[#121214] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              placeholder="Test prompt or checklist..."
            />
            <button
              onClick={handleRunTest}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Thinking...' : 'Test'}</span>
            </button>
          </div>

          {testOutput && (
            <div className="p-3 rounded-xl bg-[#121214] border border-white/[0.06] select-text">
              <div className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                {testOutput}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
