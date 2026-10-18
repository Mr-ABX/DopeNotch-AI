import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Eye,
  Key,
  FolderOpen,
  Check,
  Cpu,
  Terminal,
  Mic,
  Send,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { AVAILABLE_AI_MODELS, AIModelId, sendAIChatRequest } from '../../services/aiChatService';
import { invoke } from '@tauri-apps/api/core';

export const AIEnhancementsView: React.FC = () => {
  const {
    apiKeys,
    setApiKey,
    setActiveTab,
  } = useAppStore();

  const [selectedModel, setSelectedModel] = useState<AIModelId>('qwen2.5-0.5b');
  const [testInput, setTestInput] = useState('Analyze this code and generate a markdown todo checklist for production release.');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [savedKeyFeedback, setSavedKeyFeedback] = useState<string | null>(null);

  const handleOpenExtensionsFolder = async () => {
    try {
      await invoke('open_extensions_folder');
    } catch (e) {
      console.error('Failed to open extensions folder', e);
    }
  };

  const handleSaveKey = (provider: string, value: string) => {
    setApiKey(provider, value);
    setSavedKeyFeedback(provider);
    setTimeout(() => setSavedKeyFeedback(null), 2000);
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
        apiKeys['openai']
      );
      setTestOutput(response);
    } catch (err: any) {
      setTestOutput(`Error: ${err?.message || 'Failed to process prompt'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 space-y-6 bg-[#000000] text-[#ededed]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#ededed] tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-400" />
            <span>AI Models & Screen Copilot</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure local smart reasoning models, multimodal screen vision, and modular extension scripts.
          </p>
        </div>

        <button
          onClick={handleOpenExtensionsFolder}
          className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs text-zinc-200 hover:text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          title="Open ~/.dopenotch/extensions in Finder"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Coder Scripts Folder</span>
        </button>
      </div>

      {/* Clear Separation Banner: Speech Dictation vs AI Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Speech Dictation (Whisper) */}
        <div className="p-4 rounded-2xl bg-[#0e0e11] border border-[#1e1e24] flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
            <Mic className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white">Voice Engine (Whisper)</h3>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500/10 text-rose-300 font-mono">
                Speech-to-Text
              </span>
            </div>
            <p className="text-[11.5px] text-zinc-400 leading-relaxed">
              Dedicated on-device Whisper models (Base, Small, Large-v3-Turbo) for converting spoken voice into text in real-time. Audio stays 100% on your Mac.
            </p>
            <button
              onClick={() => setActiveTab('voiceEngine')}
              className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1 font-medium pt-1 cursor-pointer"
            >
              <span>Manage Speech Models in Voice Engine</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Right: AI Intelligence & Vision (LLMs) */}
        <div className="p-4 rounded-2xl bg-[#0e0e11] border border-amber-500/20 flex items-start gap-3.5 bg-gradient-to-br from-amber-500/[0.03] to-transparent">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white">AI Copilot & Screen Vision</h3>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-300 font-mono">
                Reasoning & Vision
              </span>
            </div>
            <p className="text-[11.5px] text-zinc-400 leading-relaxed">
              Smart LLMs (Qwen 2.5, SmolLM2, Gemini 2.0 Flash) that power the Notch dynamic chat island, analyze full-screen pixels, and format checklists.
            </p>
            <span className="text-[11px] text-zinc-400 inline-flex items-center gap-1 font-mono pt-1">
              <CheckCircle2 className="w-3 h-3 text-amber-400" />
              <span>Active in 4th Tab (✦) of SuperNotch</span>
            </span>
          </div>
        </div>
      </div>

      {/* Available AI Models Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>AI Copilot Models</span>
          </h2>
          <span className="text-[11px] text-zinc-500 font-mono">Select active model</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AVAILABLE_AI_MODELS.map((model) => {
            const isSelected = selectedModel === model.id;
            return (
              <div
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`p-4 rounded-2xl bg-[#0e0e11] border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400/50 bg-[#16161b] ring-1 ring-amber-400/20 shadow-md'
                    : 'border-[#1e1e24] hover:border-zinc-700 hover:bg-white/[0.02]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-white tracking-tight">{model.name}</span>
                    <span
                      className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full border ${
                        model.isLocal
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                      }`}
                    >
                      {model.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed min-h-[32px]">
                    {model.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.04] text-[10.5px]">
                  <span className="flex items-center gap-1 font-mono text-zinc-500">
                    {model.supportsVision ? (
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Screen Vision
                      </span>
                    ) : (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Cpu className="w-3 h-3" /> Offline CPU AVX2
                      </span>
                    )}
                  </span>

                  {isSelected ? (
                    <span className="text-amber-400 font-medium flex items-center gap-1">
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

      {/* Cloud API Keys & Credentials */}
      <div className="p-5 rounded-2xl bg-[#0e0e11] border border-[#1e1e24] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              API Keys for Multimodal Vision & Cloud Reasoning
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">Stored securely in local config</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google Gemini 2.0 Flash (Recommended for Free Screen Vision) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-zinc-300 flex items-center gap-1.5">
                <span>Google Gemini API Key</span>
                <span className="text-[10px] text-cyan-400 font-mono">(Free 1M TPM Tier)</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10.5px] text-zinc-400 hover:text-amber-400 flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeys['gemini'] || ''}
                onChange={(e) => handleSaveKey('gemini', e.target.value)}
                className="flex-1 bg-[#09090b] border border-[#1e1e24] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 font-mono"
              />
              {savedKeyFeedback === 'gemini' && (
                <span className="text-xs text-emerald-400 font-mono shrink-0">Saved ✓</span>
              )}
            </div>
            <p className="text-[10.5px] text-zinc-500">
              Powers instant <code className="text-zinc-400">[👁️ See Screen]</code> multimodal screenshot analysis in the Notch.
            </p>
          </div>

          {/* xAI Grok / OpenAI API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-zinc-300">OpenAI / Grok / Claude API Key</label>
              <span className="text-[10.5px] text-zinc-500 font-mono">Optional</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="sk-..."
                value={apiKeys['openai'] || ''}
                onChange={(e) => handleSaveKey('openai', e.target.value)}
                className="flex-1 bg-[#09090b] border border-[#1e1e24] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 font-mono"
              />
              {savedKeyFeedback === 'openai' && (
                <span className="text-xs text-emerald-400 font-mono shrink-0">Saved ✓</span>
              )}
            </div>
            <p className="text-[10.5px] text-zinc-500">
              Used if you choose GPT-4o, Claude 3.5 Sonnet, or Grok in the model picker.
            </p>
          </div>
        </div>
      </div>

      {/* Coder / Developer Extensions Directory Info */}
      <div className="p-5 rounded-2xl bg-[#0e0e11] border border-[#1e1e24] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Coder Extensions & Custom Scripts (~/.dopenotch/extensions)
            </h2>
          </div>
          <button
            onClick={handleOpenExtensionsFolder}
            className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>Open in Finder</span>
            <span>→</span>
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Any executable script (<code className="text-zinc-300 font-mono">.sh</code>, <code className="text-zinc-300 font-mono">.py</code>, <code className="text-zinc-300 font-mono">.js</code>, <code className="text-zinc-300 font-mono">.ts</code>) placed in <code className="text-amber-400 font-mono">~/.dopenotch/extensions/</code> automatically registers as a global slash command in the SuperNotch search palette.
        </p>

        <div className="p-3 rounded-xl bg-[#09090b] border border-white/[0.06] font-mono text-[11px] text-zinc-300 space-y-1">
          <span className="text-zinc-500"># Example: ~/.dopenotch/extensions/deploy.sh</span>
          <p className="text-amber-300">#!/usr/bin/env bash</p>
          <p className="text-emerald-400"># @title: Quick Deploy Status</p>
          <p className="text-cyan-400"># @mode: clipboard</p>
          <p className="text-zinc-200">git status -s</p>
        </div>
      </div>

      {/* Verification Playground */}
      <div className="p-5 rounded-2xl bg-[#0e0e11] border border-[#1e1e24] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Interactive AI Test Sandbox
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">Active: {selectedModel}</span>
        </div>

        <div className="space-y-3">
          <textarea
            rows={2}
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            className="w-full bg-[#09090b] border border-[#1e1e24] rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/50 resize-none font-sans"
            placeholder="Type a prompt to test your AI model..."
          />

          <div className="flex justify-end">
            <button
              onClick={handleRunTest}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Generating response...' : 'Test AI Model'}</span>
            </button>
          </div>

          {testOutput && (
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1 select-text">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> Output:
              </div>
              <div className="text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap">
                {testOutput}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
