import React from 'react';
import { Minus, Square, X, Settings } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const TitleBar: React.FC = () => {
  const { wordsToday, timeSavedMinutesToday, selectedSpeechModel, models, setActiveTab } = useAppStore();
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

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('button, a, input, select, textarea')) {
      try {
        await getCurrentWindow().startDragging();
      } catch (err) {
        // Fallback to native data-tauri-drag-region
      }
    }
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onDoubleClick={handleMaximize}
      className={`h-10 w-full bg-[#09090b] border-b border-white/[0.06] flex items-center justify-between ${
        isMac ? 'pl-[74px] pr-3.5' : 'px-3.5'
      } select-none z-10 cursor-default`}
    >
      {/* Left: Active Engine Pill with click-to-configure */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <button
          onClick={() => setActiveTab('voiceEngine')}
          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-[11px] transition-all cursor-pointer group"
          title="Click to change Speech Engine"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
          <span className="font-medium text-zinc-300 group-hover:text-white truncate max-w-[170px]">
            {activeModel?.name || 'Local Whisper'}
          </span>
        </button>
      </div>

      {/* Center Draggable Window Strip */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full cursor-default pointer-events-auto"
      />

      {/* Right Stats & Quick Preferences Trigger */}
      <div className="flex items-center gap-2.5" data-tauri-drag-region>
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10.5px] text-zinc-400 font-mono"
        >
          <div className="flex items-center gap-1">
            <span className="text-zinc-200 font-semibold">{wordsToday}</span>
            <span>words</span>
          </div>
          <span className="text-zinc-700">•</span>
          <div className="flex items-center gap-1">
            <span className="text-zinc-200 font-semibold">{timeSavedMinutesToday.toFixed(1)}m</span>
            <span>saved</span>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('preferences')}
          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Open Preferences"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Windows / Linux Controls only (Hidden on macOS where native traffic lights exist) */}
        {!isMac && (
          <div className="flex items-center gap-1 ml-1" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={handleMinimize}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              title="Minimize"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              title="Maximize"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
