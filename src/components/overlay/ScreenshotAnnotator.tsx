import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Square,
  Circle,
  Type,
  Hash,
  EyeOff,
  Highlighter,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Check,
  Download,
  X,
  Sparkles,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export type ToolType = 'select' | 'arrow' | 'rect' | 'circle' | 'text' | 'badge' | 'blur' | 'highlighter';

export interface BaseAnnotation {
  id: string;
  type: ToolType;
  color: string;
  strokeWidth: number;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface RectAnnotation extends BaseAnnotation {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export interface BadgeAnnotation extends BaseAnnotation {
  type: 'badge';
  x: number;
  y: number;
  stepNumber: number;
}

export interface BlurAnnotation extends BaseAnnotation {
  type: 'blur';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlighter';
  points: { x: number; y: number }[];
}

export type AnnotationItem =
  | ArrowAnnotation
  | RectAnnotation
  | CircleAnnotation
  | TextAnnotation
  | BadgeAnnotation
  | BlurAnnotation
  | HighlightAnnotation;

interface ScreenshotAnnotatorProps {
  screenshotUrl: string;
  onClose: () => void;
  onCopySuccess?: () => void;
}

const PALETTE = [
  { name: 'Red', hex: '#FF3B30' },
  { name: 'Green', hex: '#30D158' },
  { name: 'Blue', hex: '#0A84FF' },
  { name: 'Yellow', hex: '#FFD60A' },
  { name: 'White', hex: '#FFFFFF' },
];

const STROKE_WIDTHS = [
  { label: 'S', width: 2.5 },
  { label: 'M', width: 4.5 },
  { label: 'L', width: 8 },
];

export const ScreenshotAnnotator: React.FC<ScreenshotAnnotatorProps> = ({
  screenshotUrl,
  onClose,
  onCopySuccess,
}) => {
  const [currentTool, setCurrentTool] = useState<ToolType>('arrow');
  const [currentColor, setCurrentColor] = useState<string>('#FF3B30');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(4.5);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationItem[][]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [badgeCounter, setBadgeCounter] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeAnnotationRef = useRef<AnnotationItem | null>(null);

  // Load screenshot
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.src = screenshotUrl;
  }, [screenshotUrl]);

  // Main canvas render loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    if (img) {
      if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Combine committed annotations with the live active one being dragged
    const allItems = [...annotations];
    if (activeAnnotationRef.current) {
      allItems.push(activeAnnotationRef.current);
    }

    for (const item of allItems) {
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.fillStyle = item.color;
      ctx.lineWidth = item.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (item.type === 'arrow') {
        const dx = item.endX - item.startX;
        const dy = item.endY - item.startY;
        const angle = Math.atan2(dy, dx);
        const headlen = Math.max(12, item.strokeWidth * 3.5);

        // Line
        ctx.beginPath();
        ctx.moveTo(item.startX, item.startY);
        ctx.lineTo(item.endX, item.endY);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(item.endX, item.endY);
        ctx.lineTo(
          item.endX - headlen * Math.cos(angle - Math.PI / 6),
          item.endY - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          item.endX - headlen * Math.cos(angle + Math.PI / 6),
          item.endY - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      } else if (item.type === 'rect') {
        const radius = Math.min(8, Math.abs(item.width) / 2, Math.abs(item.height) / 2);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(item.x, item.y, item.width, item.height, radius);
        } else {
          ctx.rect(item.x, item.y, item.width, item.height);
        }
        ctx.stroke();
      } else if (item.type === 'circle') {
        ctx.beginPath();
        ctx.ellipse(item.cx, item.cy, Math.abs(item.rx), Math.abs(item.ry), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (item.type === 'blur') {
        // Redaction / Pixelate Mosaic
        const bx = Math.round(Math.min(item.x, item.x + item.width));
        const by = Math.round(Math.min(item.y, item.y + item.height));
        const bw = Math.round(Math.abs(item.width));
        const bh = Math.round(Math.abs(item.height));

        if (bw > 4 && bh > 4) {
          try {
            // Mosaic downsample
            const pixelSize = 10;
            const smallCanvas = document.createElement('canvas');
            const sw = Math.max(1, Math.floor(bw / pixelSize));
            const sh = Math.max(1, Math.floor(bh / pixelSize));
            smallCanvas.width = sw;
            smallCanvas.height = sh;
            const sctx = smallCanvas.getContext('2d');
            if (sctx) {
              sctx.imageSmoothingEnabled = false;
              sctx.drawImage(canvas, bx, by, bw, bh, 0, 0, sw, sh);

              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(smallCanvas, 0, 0, sw, sh, bx, by, bw, bh);
              ctx.imageSmoothingEnabled = true;

              // Border indicator
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(bx, by, bw, bh);
              ctx.setLineDash([]);
            }
          } catch {
            // Fallback dark redact block
            ctx.fillStyle = '#000000';
            ctx.fillRect(bx, by, bw, bh);
          }
        }
      } else if (item.type === 'highlighter') {
        if (item.points.length > 1) {
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = item.color;
          ctx.lineWidth = Math.max(16, item.strokeWidth * 4);
          ctx.beginPath();
          ctx.moveTo(item.points[0].x, item.points[0].y);
          for (let i = 1; i < item.points.length; i++) {
            ctx.lineTo(item.points[i].x, item.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
        }
      } else if (item.type === 'badge') {
        const radius = Math.max(14, item.strokeWidth * 3.5);
        ctx.beginPath();
        ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(radius * 1.1)}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.stepNumber.toString(), item.x, item.y);
      } else if (item.type === 'text') {
        const fontSize = item.fontSize || 18;
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
        const textMetrics = ctx.measureText(item.text);
        const paddingX = 8;
        const paddingY = 4;
        const bgWidth = textMetrics.width + paddingX * 2;
        const bgHeight = fontSize + paddingY * 2;

        // Dark pill background for text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(item.x - paddingX, item.y - fontSize + 2, bgWidth, bgHeight, 6);
          ctx.fill();
        } else {
          ctx.fillRect(item.x - paddingX, item.y - fontSize + 2, bgWidth, bgHeight);
        }

        ctx.fillStyle = item.color;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(item.text, item.x, item.y);
      }

      ctx.restore();
    }
  }, [annotations]);

  useEffect(() => {
    renderCanvas();
  }, [annotations, renderCanvas]);

  // Coordinate conversion from client display space to full image pixel space
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    isDrawingRef.current = true;
    startPosRef.current = coords;

    if (currentTool === 'badge') {
      const newBadge: BadgeAnnotation = {
        id: `badge-${Date.now()}`,
        type: 'badge',
        x: coords.x,
        y: coords.y,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        stepNumber: badgeCounter,
      };
      setAnnotations((prev) => [...prev, newBadge]);
      setRedoStack([]);
      setBadgeCounter((n) => n + 1);
      isDrawingRef.current = false;
      return;
    }

    if (currentTool === 'text') {
      const userText = window.prompt('Enter callout text:', 'Note');
      if (userText && userText.trim()) {
        const newText: TextAnnotation = {
          id: `text-${Date.now()}`,
          type: 'text',
          x: coords.x,
          y: coords.y,
          color: currentColor,
          strokeWidth: currentStrokeWidth,
          text: userText.trim(),
          fontSize: Math.max(16, currentStrokeWidth * 4.5),
        };
        setAnnotations((prev) => [...prev, newText]);
        setRedoStack([]);
      }
      isDrawingRef.current = false;
      return;
    }

    if (currentTool === 'highlighter') {
      activeAnnotationRef.current = {
        id: `hl-${Date.now()}`,
        type: 'highlighter',
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        points: [coords],
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);
    const start = startPosRef.current;

    if (currentTool === 'arrow') {
      activeAnnotationRef.current = {
        id: 'active-arrow',
        type: 'arrow',
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        startX: start.x,
        startY: start.y,
        endX: coords.x,
        endY: coords.y,
      };
    } else if (currentTool === 'rect') {
      activeAnnotationRef.current = {
        id: 'active-rect',
        type: 'rect',
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        x: Math.min(start.x, coords.x),
        y: Math.min(start.y, coords.y),
        width: Math.abs(coords.x - start.x),
        height: Math.abs(coords.y - start.y),
      };
    } else if (currentTool === 'circle') {
      const cx = (start.x + coords.x) / 2;
      const cy = (start.y + coords.y) / 2;
      activeAnnotationRef.current = {
        id: 'active-circle',
        type: 'circle',
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        cx,
        cy,
        rx: Math.abs(coords.x - start.x) / 2,
        ry: Math.abs(coords.y - start.y) / 2,
      };
    } else if (currentTool === 'blur') {
      activeAnnotationRef.current = {
        id: 'active-blur',
        type: 'blur',
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        x: Math.min(start.x, coords.x),
        y: Math.min(start.y, coords.y),
        width: Math.abs(coords.x - start.x),
        height: Math.abs(coords.y - start.y),
      };
    } else if (currentTool === 'highlighter') {
      if (activeAnnotationRef.current?.type === 'highlighter') {
        activeAnnotationRef.current.points.push(coords);
      }
    }

    renderCanvas();
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (activeAnnotationRef.current) {
      const finalItem = { ...activeAnnotationRef.current, id: `item-${Date.now()}` };
      activeAnnotationRef.current = null;
      setAnnotations((prev) => [...prev, finalItem]);
      setRedoStack([]);
      renderCanvas();
    }
  };

  const handleUndo = () => {
    if (annotations.length === 0) return;
    setRedoStack((prev) => [...prev, annotations]);
    setAnnotations((prev) => prev.slice(0, prev.length - 1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setAnnotations(next);
  };

  const handleClear = () => {
    if (annotations.length === 0) return;
    setRedoStack((prev) => [...prev, annotations]);
    setAnnotations([]);
    setBadgeCounter(1);
  };

  // Export full rendered canvas as Base64 data URL
  const getRenderedBase64 = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  const handleCopyClipboard = async () => {
    const dataUrl = getRenderedBase64();
    if (!dataUrl) return;

    try {
      await invoke('copy_screenshot_to_clipboard', { base64Data: dataUrl });
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1800);
      onCopySuccess?.();
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
  };

  const handleSaveToDisk = async () => {
    const dataUrl = getRenderedBase64();
    if (!dataUrl) return;

    try {
      const savedPath = await invoke<string>('save_screenshot_to_file', {
        base64Data: dataUrl,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      console.log('Saved annotated screenshot to:', savedPath);
    } catch (e) {
      console.error('Failed to save screenshot:', e);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        handleCopyClipboard();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveToDisk();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [annotations, redoStack]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col bg-black/85 backdrop-blur-2xl text-white select-none overflow-hidden"
    >
      {/* Top Header / Bar */}
      <div className="h-14 border-b border-white/10 px-5 flex items-center justify-between shrink-0 bg-zinc-950/60">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
              <span>DopeNotch Markup & Annotation</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                Retina Canvas
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              Draw arrows, redact sensitive text, or stamp step numbers • Copy directly to clipboard
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              isCopied
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-zinc-900 hover:bg-zinc-100 active:scale-95'
            }`}
            title="Copy to Clipboard (⌘C or Enter)"
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copied PNG!' : 'Copy to Clipboard'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToDisk}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
              isSaved
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200'
            }`}
            title="Save to ~/Downloads (⌘S)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Saved!' : 'Save Image'}</span>
          </button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace: Centered Canvas with Checkerboard Background */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 relative bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="max-w-full max-h-full rounded-xl shadow-2xl border border-white/15 cursor-crosshair bg-zinc-900 object-contain"
        />

        {/* Floating Tool Dock */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-900/90 border border-white/15 shadow-2xl backdrop-blur-xl">
          {/* Tool Selector */}
          <div className="flex items-center gap-1">
            {[
              { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
              { id: 'rect', icon: Square, label: 'Rectangle' },
              { id: 'circle', icon: Circle, label: 'Circle' },
              { id: 'blur', icon: EyeOff, label: 'Redact / Blur' },
              { id: 'text', icon: Type, label: 'Text Callout' },
              { id: 'badge', icon: Hash, label: 'Step Counter' },
              { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setCurrentTool(tool.id as ToolType)}
                  className={`p-2 rounded-xl transition-all relative ${
                    isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={tool.label}
                >
                  <Icon className="w-4 h-4" />
                  {isActive && (
                    <motion.div
                      layoutId="activeToolPill"
                      className="absolute inset-0 rounded-xl border border-white/30 pointer-events-none"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-px h-5 bg-white/15" />

          {/* Color Palette */}
          <div className="flex items-center gap-1.5">
            {PALETTE.map((p) => {
              const isSelected = currentColor === p.hex;
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => setCurrentColor(p.hex)}
                  className={`w-5 h-5 rounded-full transition-transform border border-black/20 ${
                    isSelected ? 'scale-125 ring-2 ring-white/60 ring-offset-2 ring-offset-zinc-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: p.hex }}
                  title={p.name}
                />
              );
            })}
          </div>

          <div className="w-px h-5 bg-white/15" />

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1">
            {STROKE_WIDTHS.map((sw) => {
              const isSelected = currentStrokeWidth === sw.width;
              return (
                <button
                  key={sw.label}
                  type="button"
                  onClick={() => setCurrentStrokeWidth(sw.width)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={`${sw.label} stroke`}
                >
                  {sw.label}
                </button>
              );
            })}
          </div>

          <div className="w-px h-5 bg-white/15" />

          {/* History Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={annotations.length === 0}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Undo (⌘Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={annotations.length === 0}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Clear All"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
