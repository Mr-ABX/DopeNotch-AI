import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const TitleBar: React.FC = () => {
  const { wordsToday, timeSavedMinutesToday, selectedSpeechModel, models } = useAppStore();
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
      className={`h-11 w-full bg-[#0a0a0c] border-b border-[#1e1e24] flex items-center justify-between ${
        isMac ? 'pl-20 pr-4' : 'px-4'
      } select-none z-10 cursor-default`}
    >
      {/* Left Active Engine Pill */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#121215] border border-[#1e1e24] text-[11px]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="font-medium text-zinc-200">{activeModel?.name || 'Local Whisper (Ready)'}</span>
        </div>
      </div>

      {/* Center Draggable Region */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full cursor-default pointer-events-auto"
      />

      {/* Right Stats & Non-Mac Controls */}
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono" data-tauri-drag-region>
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

        {/* Windows / Linux Controls only (Hidden on macOS where native traffic lights exist) */}
        {!isMac && (
          <div className="flex items-center gap-1 ml-2" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={handleMinimize}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              title="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
