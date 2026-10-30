import React from 'react';
import { Settings, Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from '../../stores/appStore';
import { Sidebar } from './Sidebar';
import { WelcomeView } from '../views/WelcomeView';
import { VoiceEngineView } from '../views/VoiceEngineView';
import { AIEnhancementsView } from '../views/AIEnhancementsView';
import { CommandModeView } from '../views/CommandModeView';
import { TranscriptionHistoryView } from '../views/TranscriptionHistoryView';
import { PreferencesView } from '../views/PreferencesView';
import { ExtensionsView } from '../views/ExtensionsView';
import { NotesView } from '../views/NotesView';
import { ScratchpadView } from '../views/ScratchpadView';
import { DopeyCopilotView } from '../views/DopeyCopilotView';
import { SettingsModal } from '../settings/SettingsModal';

export const Dashboard: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    wordsToday,
    timeSavedMinutesToday,
    selectedSpeechModel,
    models,
  } = useAppStore();

  const activeModel = models.find((m) => m.id === selectedSpeechModel);

  const isMac =
    typeof navigator !== 'undefined' &&
    (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ||
      (navigator as any).userAgentData?.platform === 'macOS' ||
      navigator.platform?.toUpperCase().indexOf('MAC') >= 0);

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMaximize = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await getCurrentWindow().hide();
    } catch (e) {
      console.error(e);
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'welcome':
        return <WelcomeView />;
      case 'voiceEngine':
        return <VoiceEngineView />;
      case 'aiSettings':
      case 'aiEnhancements':
        return <AIEnhancementsView />;
      case 'scratchpad':
        return <ScratchpadView />;
      case 'copilot':
        return <DopeyCopilotView />;
      case 'history':
      case 'fileTranscription':
      case 'meetingTools':
        return <TranscriptionHistoryView />;
      case 'notes':
        return <NotesView />;
      case 'extensions':
        return <ExtensionsView />;
      case 'commandMode':
      case 'writeMode':
      case 'rewriteMode':
      case 'cleanupStyles':
      case 'customDictionary':
        return <CommandModeView />;
      case 'preferences':
      case 'stats':
      case 'changelog':
      case 'feedback':
        return <PreferencesView />;
      default:
        return <WelcomeView />;
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#000000] text-[#ededed] overflow-hidden select-none">
      {/* Main App Body Split (Sidebar + Active View) */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 h-full overflow-hidden bg-[#000000] flex flex-col relative">
          {/* Subtle Draggable Header Strip without bulky bar */}
          <div
            data-tauri-drag-region
            onDoubleClick={handleMaximize}
            className="h-6 w-full shrink-0 flex items-center justify-end px-3 select-none cursor-default bg-transparent z-10"
          >
            {/* Windows / Linux window buttons only */}
            {!isMac && (
              <div
                className="flex items-center gap-1"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleMinimize}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                  title="Minimize"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  onClick={handleMaximize}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                  title="Maximize"
                >
                  <Square className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={handleClose}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                  title="Close"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Active View Container */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Sleek Minimal Status Footer Bar (Relocated from Top Header) */}
      <footer className="h-7 px-4 border-t border-white/[0.06] bg-[#09090b] flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0 select-none">
        {/* Left: Active Voice Engine Pill */}
        <button
          onClick={() => setActiveTab('voiceEngine')}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer group"
          title="Click to configure speech engine"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
          <span className="text-zinc-300 group-hover:text-white truncate max-w-[220px]">
            {activeModel?.name || 'Whisper Base (Local GGML)'}
          </span>
        </button>

        {/* Right: Sleek Stats Hover Pill & Quick Preferences Trigger */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-300 text-[10.5px]"
            title={`Words dictated today: ${wordsToday} | Saved: ${timeSavedMinutesToday.toFixed(1)} mins`}
          >
            <div className="flex items-center gap-1">
              <span className="text-white font-semibold">{wordsToday}</span>
              <span className="text-zinc-400">words</span>
            </div>
            <span className="text-zinc-700">•</span>
            <div className="flex items-center gap-1">
              <span className="text-white font-semibold">{timeSavedMinutesToday.toFixed(1)}m</span>
              <span className="text-zinc-400">saved</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('preferences')}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Open Preferences"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* Preferences Modal */}
      <SettingsModal />
    </div>
  );
};
