import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Ruler,
  Copy,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PixelRulerOverlay: React.FC = () => {
  const { setClipboardItems, clipboardItems } = useAppStore();

  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [measuredRect, setMeasuredRect] = useState<Rect | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const closeRuler = useCallback(() => {
    invoke('close_ruler').catch(() => {});
  }, []);

  const copyDimensions = useCallback(
    (rect?: Rect | null) => {
      const target = rect || measuredRect;
      if (!target || target.width === 0 || target.height === 0) {
        showToast('Draw a measurement box first');
        return;
      }

      const text = `${target.width}px × ${target.height}px`;
      navigator.clipboard.writeText(text);

      // Push to SuPaste clipboard shelf history
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setClipboardItems([
        {
          id: `ruler-${Date.now()}`,
          content: `${target.width} × ${target.height} px (${aspectRatio(target.width, target.height)})`,
          category: 'code',
          timestamp: timeStr,
          timestampRaw: Date.now(),
          isPinned: false,
          sourceApp: 'Pixel Ruler',
          charCount: text.length,
          wordCount: 3,
        },
        ...clipboardItems,
      ]);

      setIsCopied(true);
      showToast(`Copied ${text}`);
      setTimeout(() => setIsCopied(false), 2000);
    },
    [measuredRect, clipboardItems, setClipboardItems]
  );

  // Calculate GCD for simple aspect ratio (e.g. 16:9, 4:3, 1:1)
  const aspectRatio = (w: number, h: number): string => {
    if (w === 0 || h === 0) return '0:0';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(w, h);
    const rW = Math.round(w / divisor);
    const rH = Math.round(h / divisor);
    if (rW > 50 || rH > 50) {
      return (w / h).toFixed(2) + ':1';
    }
    return `${rW}:${rH}`;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRuler();
      } else if (e.key === 'Enter' || ((e.metaKey || e.ctrlKey) && e.key === 'c')) {
        e.preventDefault();
        copyDimensions();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setMeasuredRect(null);
        showToast('Cleared measurement');
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsLocked((prev) => !prev);
      } else if (
        measuredRect &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        setMeasuredRect((prev) => {
          if (!prev) return null;
          let { x, y } = prev;
          if (e.key === 'ArrowLeft') x -= step;
          if (e.key === 'ArrowRight') x += step;
          if (e.key === 'ArrowUp') y -= step;
          if (e.key === 'ArrowDown') y += step;
          return { ...prev, x, y };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeRuler, copyDimensions, measuredRect]);

  // Mouse drag events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setMeasuredRect({
      x: e.clientX,
      y: e.clientY,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isLocked) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }

    if (isDragging && startPos) {
      const curX = e.clientX;
      const curY = e.clientY;
      const x = Math.min(startPos.x, curX);
      const y = Math.min(startPos.y, curY);
      const width = Math.abs(curX - startPos.x);
      const height = Math.abs(curY - startPos.y);

      setMeasuredRect({ x, y, width, height });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setStartPos(null);
  };

  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 w-screen h-screen bg-black/10 select-none cursor-crosshair overflow-hidden z-[2147483647]"
      style={{ backdropFilter: 'none' }}
    >
      {/* 1. Fullscreen Laser Crosshair Hairlines */}
      {!isDragging && (
        <>
          {/* Horizontal Hairline */}
          <div
            className="fixed left-0 right-0 h-[1px] bg-amber-400/80 pointer-events-none z-10 shadow-[0_0_4px_rgba(251,191,36,0.5)]"
            style={{ top: mousePos.y }}
          />

          {/* Vertical Hairline */}
          <div
            className="fixed top-0 bottom-0 w-[1px] bg-amber-400/80 pointer-events-none z-10 shadow-[0_0_4px_rgba(251,191,36,0.5)]"
            style={{ left: mousePos.x }}
          />

          {/* Cursor Coordinates Floating HUD Badge */}
          <div
            className="fixed pointer-events-none z-20 flex flex-col gap-0.5 bg-[#0a0a0c]/90 border border-amber-400/30 rounded-lg px-2.5 py-1.5 text-white shadow-2xl backdrop-blur-md"
            style={{
              left: Math.min(screenW - 140, mousePos.x + 16),
              top: Math.min(screenH - 70, mousePos.y + 16),
            }}
          >
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-400">
              <span>{mousePos.x}px</span>
              <span className="text-zinc-600">×</span>
              <span>{mousePos.y}px</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
              <span>↑{mousePos.y}</span>
              <span>↓{Math.max(0, screenH - mousePos.y)}</span>
              <span>←{mousePos.x}</span>
              <span>→{Math.max(0, screenW - mousePos.x)}</span>
            </div>
          </div>
        </>
      )}

      {/* 2. Drawn Measurement Rectangle */}
      {measuredRect && (
        <div
          className="fixed border-2 border-amber-400 bg-amber-500/15 pointer-events-none z-30 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center"
          style={{
            left: measuredRect.x,
            top: measuredRect.y,
            width: measuredRect.width,
            height: measuredRect.height,
          }}
        >
          {/* Top Width Tag */}
          {measuredRect.width > 40 && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/85 border border-amber-400/40 text-[10.5px] font-mono font-semibold text-amber-400 whitespace-nowrap shadow-md">
              {measuredRect.width} px
            </div>
          )}

          {/* Right Height Tag */}
          {measuredRect.height > 30 && (
            <div className="absolute -right-16 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-black/85 border border-amber-400/40 text-[10.5px] font-mono font-semibold text-amber-400 whitespace-nowrap shadow-md">
              {measuredRect.height} px
            </div>
          )}

          {/* Center Dimension HUD Badge */}
          {measuredRect.width > 70 && measuredRect.height > 50 && (
            <div className="bg-black/85 border border-white/20 rounded-xl px-3 py-2 text-center shadow-2xl backdrop-blur-md flex flex-col items-center gap-0.5">
              <span className="text-sm font-bold text-white font-mono tracking-tight">
                {measuredRect.width} × {measuredRect.height} <span className="text-amber-400 text-xs">px</span>
              </span>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                <span className="px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                  {aspectRatio(measuredRect.width, measuredRect.height)}
                </span>
                <span>{Math.round(Math.hypot(measuredRect.width, measuredRect.height))}px diag</span>
              </div>
            </div>
          )}

          {/* 4 Corner Accents */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-amber-400 rounded-full shadow-sm" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full shadow-sm" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-400 rounded-full shadow-sm" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-amber-400 rounded-full shadow-sm" />
        </div>
      )}

      {/* 3. Top Floating Glass Island Controls */}
      <div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0a0a0c]/90 border border-white/15 text-[#ededed] shadow-2xl backdrop-blur-xl pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 pr-2 border-r border-white/10">
          <div className="w-6 h-6 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
            <Ruler className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
              <span>Pixel Ruler</span>
              {isLocked && (
                <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-mono">
                  Locked
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              {measuredRect && measuredRect.width > 0 && measuredRect.height > 0
                ? `${measuredRect.width} × ${measuredRect.height} px`
                : 'Drag to measure'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => copyDimensions()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm"
            title="Copy dimensions (Enter)"
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          {measuredRect && (
            <button
              onClick={() => setMeasuredRect(null)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear selection (Delete)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={closeRuler}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Exit Ruler (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Shortcut Guide Tips */}
        <div className="pl-2 border-l border-white/10 text-[10px] text-zinc-500 font-mono hidden md:flex items-center gap-2">
          <span><kbd className="px-1 py-0.2 bg-white/10 rounded text-zinc-300">Drag</kbd> Measure</span>
          <span><kbd className="px-1 py-0.2 bg-white/10 rounded text-zinc-300">↵</kbd> Copy</span>
          <span><kbd className="px-1 py-0.2 bg-white/10 rounded text-zinc-300">Esc</kbd> Exit</span>
        </div>
      </div>

      {/* 4. Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-black/90 border border-amber-400/30 text-amber-300 text-xs font-mono shadow-2xl backdrop-blur-md flex items-center gap-2 animate-fadeIn pointer-events-none">
          <Check className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
