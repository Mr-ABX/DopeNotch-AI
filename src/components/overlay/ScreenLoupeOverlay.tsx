import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface ScreenLoupeOverlayProps {
  screenshotUrl?: string;
  onClose: () => void;
}

export const ScreenLoupeOverlay: React.FC<ScreenLoupeOverlayProps> = ({
  screenshotUrl,
  onClose,
}) => {
  const { setClipboardItems, clipboardItems } = useAppStore();

  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const [zoom, setZoom] = useState<number>(2.5); // Default comfortable 2.5x zoom (1.5x - 8.0x)
  const [sampledColor, setSampledColor] = useState<{ hex: string; rgb: string }>({
    hex: '#FFFFFF',
    rgb: '255, 255, 255',
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Loupe radius: 125px (250px diameter) — wider/medium comfortable radius
  const radius = 125;
  const diameter = radius * 2;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Load screenshot into Image object
  useEffect(() => {
    if (!screenshotUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = screenshotUrl;
  }, [screenshotUrl]);

  // Track mouse coordinates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Trackpad pinch-to-zoom & mouse wheel listener
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        // Trackpad pinch gesture on macOS
        const factor = -e.deltaY * 0.015;
        setZoom((prev) => Math.min(8.0, Math.max(1.5, +(prev + factor).toFixed(2))));
      } else {
        // Regular mouse scroll wheel
        const factor = -e.deltaY * 0.005;
        setZoom((prev) => Math.min(8.0, Math.max(1.5, +(prev + factor).toFixed(2))));
      }
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      if (e.scale) {
        setZoom((prev) => Math.min(8.0, Math.max(1.5, +(prev * e.scale).toFixed(2))));
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('gesturechange', handleGestureChange as any, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('gesturechange', handleGestureChange as any);
    };
  }, []);

  // Keyboard controls: Escape to close, +/- or [/] to zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=' || e.key === ']') {
        e.preventDefault();
        setZoom((prev) => Math.min(8.0, +(prev + 0.5).toFixed(1)));
      } else if (e.key === '-' || e.key === '_' || e.key === '[') {
        e.preventDefault();
        setZoom((prev) => Math.max(1.5, +(prev - 0.5).toFixed(1)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Render magnified region onto circular canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, diameter, diameter);

    // Save clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    if (img && imageLoaded) {
      // Calculate scaling between screen viewport and retina screenshot
      const scaleX = img.naturalWidth / window.innerWidth;
      const scaleY = img.naturalHeight / window.innerHeight;

      const sourceW = (diameter / zoom) * scaleX;
      const sourceH = (diameter / zoom) * scaleY;
      const sourceX = mousePos.x * scaleX - sourceW / 2;
      const sourceY = mousePos.y * scaleY - sourceH / 2;

      // Draw magnified image slice
      ctx.imageSmoothingEnabled = zoom < 4.0;
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        diameter,
        diameter
      );

      // Sample color from center
      try {
        const pixel = ctx.getImageData(radius, radius, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b)
          .toString(16)
          .slice(1)
          .toUpperCase()}`;
        setSampledColor({
          hex,
          rgb: `${r}, ${g}, ${b}`,
        });
      } catch {}
    } else {
      // Fallback dark grid
      ctx.fillStyle = '#18181c';
      ctx.fillRect(0, 0, diameter, diameter);
    }

    // Grid lines for high zoom
    if (zoom >= 4.0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const step = zoom * 4;
      for (let x = 0; x < diameter; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, diameter);
        ctx.stroke();
      }
      for (let y = 0; y < diameter; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(diameter, y);
        ctx.stroke();
      }
    }

    // Draw center crosshair reticle
    ctx.restore();

    // Crosshair lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 3;

    // Top hair
    ctx.beginPath();
    ctx.moveTo(radius, radius - 16);
    ctx.lineTo(radius, radius - 4);
    ctx.stroke();

    // Bottom hair
    ctx.beginPath();
    ctx.moveTo(radius, radius + 4);
    ctx.lineTo(radius, radius + 16);
    ctx.stroke();

    // Left hair
    ctx.beginPath();
    ctx.moveTo(radius - 16, radius);
    ctx.lineTo(radius - 4, radius);
    ctx.stroke();

    // Right hair
    ctx.beginPath();
    ctx.moveTo(radius + 4, radius);
    ctx.lineTo(radius + 16, radius);
    ctx.stroke();

    // 1px center pixel target square
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(radius - 3, radius - 3, 6, 6);
  }, [mousePos, zoom, imageLoaded, diameter, radius]);

  // Click to copy color and add to SuperShelf
  const handleLoupeClick = useCallback(() => {
    if (!sampledColor.hex) return;
    navigator.clipboard.writeText(sampledColor.hex);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setClipboardItems([
      {
        id: `color-${Date.now()}`,
        content: sampledColor.hex,
        category: 'color',
        timestamp: timeStr,
        timestampRaw: Date.now(),
        isPinned: false,
        sourceApp: 'Screen Loupe',
        charCount: sampledColor.hex.length,
        wordCount: 1,
      },
      ...clipboardItems,
    ]);

    showToast(`Copied ${sampledColor.hex}`);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [sampledColor, clipboardItems, setClipboardItems, onClose]);

  // Prevent lens from clipping outside viewport edges
  const lensLeft = Math.max(10, Math.min(window.innerWidth - diameter - 10, mousePos.x - radius));
  const lensTop = Math.max(10, Math.min(window.innerHeight - diameter - 10, mousePos.y - radius));

  return (
    <div
      onClick={handleLoupeClick}
      className="fixed inset-0 w-screen h-screen cursor-crosshair select-none z-[999999] overflow-hidden"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
    >
      {/* Top Floating Guide Pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-[#121215]/90 border border-white/15 backdrop-blur-xl shadow-2xl text-xs text-zinc-300 font-mono pointer-events-auto">
        <div className="flex items-center gap-1.5 text-white font-semibold">
          <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
          <span>Screen Loupe</span>
        </div>
        <span className="text-zinc-600">•</span>
        <span className="text-zinc-400">Pinch trackpad or scroll to zoom</span>
        <span className="text-zinc-600">•</span>
        <span className="text-emerald-400 font-medium">Click pixel to copy</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-2 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Circular Loupe Lens Container */}
      <div
        className="absolute pointer-events-none transition-transform duration-75 flex flex-col items-center"
        style={{
          left: `${lensLeft}px`,
          top: `${lensTop}px`,
          width: `${diameter}px`,
          height: `${diameter}px`,
        }}
      >
        {/* Glass Ring & Circular Shadow */}
        <div
          className="relative rounded-full overflow-hidden shadow-2xl border-[3px] border-white/40 ring-1 ring-black/40"
          style={{
            width: `${diameter}px`,
            height: `${diameter}px`,
            boxShadow: '0 25px 60px -10px rgba(0,0,0,0.85), inset 0 0 15px rgba(255,255,255,0.2)',
          }}
        >
          <canvas
            ref={canvasRef}
            width={diameter}
            height={diameter}
            className="w-full h-full block"
          />
        </div>

        {/* Live Floating Info Pill below Lens */}
        <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-xl border border-white/20 shadow-xl text-[11px] font-mono text-white pointer-events-none">
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm flex-shrink-0"
            style={{ backgroundColor: sampledColor.hex }}
          />
          <span className="font-bold tracking-tight text-white">{sampledColor.hex}</span>
          <span className="text-zinc-500 text-[10px]">rgb({sampledColor.rgb})</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-cyan-300 font-bold text-[10px]">
            {zoom.toFixed(1)}×
          </span>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-xs shadow-2xl z-50 animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
