import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Maximize2,
  Minimize2,
  X,
  Gauge,
  Eye,
  EyeOff,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Cpu,
  Search,
} from 'lucide-react';
import {
  Holo3DSceneHandle,
  HOLO_3D_PRESETS,
  DIAGRAM_2D_PRESETS,
  DiagramNode,
} from '../../services/spatialGuideService';

export interface HoloSandboxCardProps {
  initialMode?: '3d' | '2d';
  initialPresetId?: string;
  onClose?: () => void;
  isDetachedWindow?: boolean;
}

export const HoloSandboxCard: React.FC<HoloSandboxCardProps> = ({
  initialMode = '3d',
  initialPresetId,
  onClose,
  isDetachedWindow: _isDetachedWindow = false,
}) => {
  // Mode: 3D Holo-Sandbox vs 2D Diagram Canvas
  const [activeMode, setActiveMode] = useState<'3d' | '2d'>(initialMode);

  // 3D state
  const [selected3DPresetId, setSelected3DPresetId] = useState<string>(
    initialPresetId && HOLO_3D_PRESETS.some((p) => p.id === initialPresetId)
      ? initialPresetId
      : HOLO_3D_PRESETS[0].id
  );
  const [speed, setSpeed] = useState<number>(1.0);
  const [explodeFactor, setExplodeFactor] = useState<number>(0.0);
  const [is3DPaused, setIs3DPaused] = useState<boolean>(false);
  const [isEcoMode, setIsEcoMode] = useState<boolean>(false);

  // 2D state
  const [selected2DPresetId, setSelected2DPresetId] = useState<string>(
    initialPresetId && DIAGRAM_2D_PRESETS.some((p) => p.id === initialPresetId)
      ? initialPresetId
      : DIAGRAM_2D_PRESETS[0].id
  );
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Window styling & position (Free dragging in transparent overlay)
  // Default: Transparent window for 3D learning/guiding; Solid Canvas glass for 2D diagram
  const [isTransparentGlass, setIsTransparentGlass] = useState<boolean>(initialMode === '3d');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const width = 720;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    return {
      x: Math.max(20, Math.round((screenW - width) / 2)),
      y: 80,
    };
  });
  const [isDraggingWindow, setIsDraggingWindow] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 24,
    startY: 80,
  });

  // Sync mode changes from parent props
  useEffect(() => {
    if (initialMode) {
      setActiveMode(initialMode);
      setIsTransparentGlass(initialMode === '3d');
    }
  }, [initialMode]);

  // Sync preset changes from parent props
  useEffect(() => {
    if (initialPresetId) {
      if (HOLO_3D_PRESETS.some((p) => p.id === initialPresetId)) {
        setSelected3DPresetId(initialPresetId);
        setActiveMode('3d');
        setIsTransparentGlass(true);
      } else if (DIAGRAM_2D_PRESETS.some((p) => p.id === initialPresetId)) {
        setSelected2DPresetId(initialPresetId);
        setActiveMode('2d');
        setIsTransparentGlass(false);
      }
    }
  }, [initialPresetId]);

  // 3D Canvas mount ref & Three.js handle
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const sceneHandleRef = useRef<Holo3DSceneHandle | null>(null);

  // Current active presets
  const current3DPreset = useMemo(
    () => HOLO_3D_PRESETS.find((p) => p.id === selected3DPresetId) || HOLO_3D_PRESETS[0],
    [selected3DPresetId]
  );

  const current2DPreset = useMemo(
    () => DIAGRAM_2D_PRESETS.find((p) => p.id === selected2DPresetId) || DIAGRAM_2D_PRESETS[0],
    [selected2DPresetId]
  );

  // Initialize and mount Three.js 3D scene
  useEffect(() => {
    if (activeMode !== '3d' || isMinimized) {
      if (sceneHandleRef.current) {
        sceneHandleRef.current.cleanup();
        sceneHandleRef.current = null;
      }
      return;
    }

    const container = threeContainerRef.current;
    if (!container) return;

    // Clean up previous scene if any
    if (sceneHandleRef.current) {
      sceneHandleRef.current.cleanup();
      sceneHandleRef.current = null;
    }

    try {
      const handle = current3DPreset.setupScene(container, {
        isEcoMode,
      });
      sceneHandleRef.current = handle;
      handle.setSpeed(speed);
      handle.setExplode(explodeFactor);
    } catch (err) {
      console.warn('Failed to initialize Three.js 3D Holo Scene:', err);
    }

    return () => {
      if (sceneHandleRef.current) {
        sceneHandleRef.current.cleanup();
        sceneHandleRef.current = null;
      }
    };
  }, [activeMode, selected3DPresetId, isMinimized, isEcoMode, current3DPreset]);

  // Handle speed and explode changes
  useEffect(() => {
    if (sceneHandleRef.current && activeMode === '3d') {
      sceneHandleRef.current.setSpeed(speed);
      sceneHandleRef.current.setExplode(explodeFactor);
    }
  }, [speed, explodeFactor, activeMode]);

  // Free Draggable window header event handlers
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    setIsDraggingWindow(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingWindow) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 300, dragStartRef.current.startX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.startY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingWindow(false);
    };

    if (isDraggingWindow) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWindow]);

  const handleTogglePause = () => {
    if (sceneHandleRef.current) {
      const paused = sceneHandleRef.current.togglePause();
      setIs3DPaused(paused);
    }
  };

  const handleResetCamera = () => {
    if (sceneHandleRef.current) {
      sceneHandleRef.current.resetCamera();
    }
    setSpeed(current3DPreset.defaultSpeed);
    setExplodeFactor(0.0);
    setIs3DPaused(false);
  };

  const handleCopySvg = () => {
    const svgElem = document.getElementById('holo-2d-svg-canvas');
    if (!svgElem) return;
    const svgText = svgElem.outerHTML;
    navigator.clipboard.writeText(svgText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Filter nodes for 2D diagram search
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return current2DPreset.nodes;
    const q = searchQuery.toLowerCase();
    return current2DPreset.nodes.filter(
      (n) => n.label.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q)
    );
  }, [current2DPreset, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
      }}
      className={`select-none rounded-[22px] transition-all duration-200 overflow-hidden ${
        isTransparentGlass
          ? 'bg-black/35 backdrop-blur-2xl border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_20px_rgba(56,189,248,0.15)]'
          : 'bg-[#0f1117] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
      } ${isMinimized ? 'w-[320px] h-[52px]' : 'w-[720px] max-w-[95vw] h-[520px]'}`}
    >
      {/* ========================================================================= */}
      {/* 1. DRAGGABLE WINDOW HEADER                                                */}
      {/* ========================================================================= */}
      <div
        onMouseDown={handleMouseDownHeader}
        className="h-12 px-3.5 flex items-center justify-between border-b border-white/[0.08] cursor-grab active:cursor-grabbing select-none"
      >
        {/* Left: Window Title & Mode Switcher Pills */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <span className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
            <span>Dopey</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-amber-300">
              {activeMode === '3d' ? '3D Holo-Sandbox' : '2D Diagram Canvas'}
            </span>
          </span>

          {/* Mode Switcher */}
          {!isMinimized && (
            <div className="flex items-center gap-0.5 ml-2 p-0.5 rounded-xl bg-white/[0.06] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('3d');
                  setIsTransparentGlass(true);
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  activeMode === '3d'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Interactive 3D Three.js Holo Sandbox (Default for 3D: Ultra-Translucent Glass)"
              >
                <Box className="w-3 h-3" />
                <span>3D Holo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('2d');
                  setIsTransparentGlass(false);
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  activeMode === '2d'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Live 2D Diagram & Architecture Graph Canvas (Default for 2D: Solid Canvas Glass)"
              >
                <Layers className="w-3 h-3" />
                <span>2D Canvas</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Window Controls (Glass toggle, Eco Mode, Minimize, Close) */}
        <div className="flex items-center gap-1.5">
          {/* Transparency Glass Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsTransparentGlass(!isTransparentGlass)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isTransparentGlass
                ? 'bg-white/15 text-cyan-300 border-white/20'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white border-transparent'
            }`}
            title={isTransparentGlass ? 'Switch to Solid Canvas Glass' : 'Switch to Ultra-Translucent Glass'}
          >
            {isTransparentGlass ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Eco Mode Toggle (Low CPU / Battery) */}
          {activeMode === '3d' && !isMinimized && (
            <button
              type="button"
              onClick={() => setIsEcoMode(!isEcoMode)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer text-[10px] font-mono flex items-center gap-1 ${
                isEcoMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white border-transparent'
              }`}
              title="Toggle Eco Mode (30 FPS cap, zero idle CPU drain)"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isEcoMode ? 'Eco: ON' : 'Eco'}</span>
            </button>
          )}

          {/* Minimize / Expand */}
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all cursor-pointer"
            title={isMinimized ? 'Expand Window' : 'Minimize Window'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close Window */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer"
              title="Close Sandbox"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BODY CONTENT (EXPANDED ONLY)                                           */}
      {/* ========================================================================= */}
      {!isMinimized && (
        <div className="h-[468px] flex flex-col justify-between p-3 gap-2 overflow-hidden">
          {/* MODE A: INTERACTIVE 3D HOLO-SANDBOX */}
          {activeMode === '3d' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden gap-2">
              {/* Top Sub-Bar: Preset Selector + Callout Pills */}
              <div className="flex items-center justify-between gap-2 px-1">
                {/* Preset Dropdown Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-slim-scrollbar">
                  {HOLO_3D_PRESETS.map((preset) => {
                    const isSelected = selected3DPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelected3DPresetId(preset.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm'
                            : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                        }`}
                      >
                        {preset.title.split(' ')[0]} {preset.title.split(' ')[1]}
                      </button>
                    );
                  })}
                </div>

                {/* Reset Camera button */}
                <button
                  type="button"
                  onClick={handleResetCamera}
                  className="px-2 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 hover:text-white text-[10px] font-mono flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Reset 3D Camera & Orientation"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset 3D</span>
                </button>
              </div>

              {/* 3D WebGL Canvas Viewport with Gesture Orbit Controls */}
              <div className="flex-1 w-full rounded-2xl relative overflow-hidden bg-black/20 border border-white/[0.08] flex items-center justify-center">
                <div
                  ref={threeContainerRef}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                  style={{ touchAction: 'none' }}
                />

                {/* Floating 3D Part Callout Labels overlay */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-10">
                  {current3DPreset.labels.map((lbl, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[9.5px] font-mono text-zinc-200 flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: lbl.color }} />
                      <span className="font-semibold text-white">{lbl.text}:</span>
                      <span className="text-zinc-400">{lbl.subtext}</span>
                    </div>
                  ))}
                </div>

                {/* Gesture Helper Hint */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[9px] font-mono text-zinc-400 pointer-events-none border border-white/5">
                  🖱 Drag to Orbit 360° • Scroll to Zoom
                </div>
              </div>

              {/* 3D Interactive Controls Toolbar (Speed / RPM Slider + Explode View Slider + Play/Pause) */}
              <div className="h-12 px-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-4">
                {/* Play / Pause Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 transition-all cursor-pointer shadow-sm"
                    title={is3DPaused ? 'Play Simulation' : 'Pause Simulation'}
                  >
                    {is3DPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                  </button>
                  <span className="text-xs font-mono text-zinc-300">
                    {is3DPaused ? 'Paused' : 'Running'}
                  </span>
                </div>

                {/* Speed / RPM Slider */}
                {current3DPreset.hasRpmControl && (
                  <div className="flex-1 flex items-center gap-2 max-w-[240px]">
                    <Gauge className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">Speed: {speed.toFixed(1)}x</span>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                )}

                {/* Explode-View Slider */}
                {current3DPreset.hasExplodeControl && (
                  <div className="flex-1 flex items-center gap-2 max-w-[240px]">
                    <Sliders className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      Explode: {Math.round(explodeFactor * 100)}%
                    </span>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={explodeFactor}
                      onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-400"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE B: 2D DIAGRAM & ARCHITECTURE CANVAS */}
          {activeMode === '2d' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden gap-2">
              {/* Top Sub-Bar: Diagram Presets + Search + Copy SVG */}
              <div className="flex items-center justify-between gap-2 px-1">
                {/* Preset Switcher */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-slim-scrollbar">
                  {DIAGRAM_2D_PRESETS.map((preset) => {
                    const isSelected = selected2DPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelected2DPresetId(preset.id);
                          setSelectedNode(null);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-sm'
                            : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                        }`}
                      >
                        {preset.title.split(' ')[0]} {preset.title.split(' ')[1]}
                      </button>
                    );
                  })}
                </div>

                {/* Right: Search Filter & Copy SVG */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative flex items-center">
                    <Search className="w-3 h-3 text-zinc-400 absolute left-2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter nodes..."
                      className="w-28 pl-6 pr-2 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400/50"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCopySvg}
                    className="px-2 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                    title="Copy diagram as raw SVG code"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'Copied SVG!' : 'Copy SVG'}</span>
                  </button>
                </div>
              </div>

              {/* 2D Canvas SVG Viewport */}
              <div className="flex-1 w-full rounded-2xl relative overflow-hidden bg-black/20 border border-white/[0.08] flex items-center justify-center p-2">
                <svg
                  id="holo-2d-svg-canvas"
                  viewBox="0 0 1150 360"
                  className="w-full h-full max-h-full"
                  style={{ transform: `scale(${canvasZoom}) translate(${canvasPan.x}px, ${canvasPan.y}px)` }}
                >
                  <defs>
                    {/* Glowing Edge Gradient */}
                    <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                    </linearGradient>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
                    </marker>
                  </defs>

                  {/* Edges / Connections */}
                  {current2DPreset.edges.map((edge) => {
                    const fromNode = current2DPreset.nodes.find((n) => n.id === edge.from);
                    const toNode = current2DPreset.nodes.find((n) => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    const x1 = fromNode.x + fromNode.width;
                    const y1 = fromNode.y + fromNode.height / 2;
                    const x2 = toNode.x;
                    const y2 = toNode.y + toNode.height / 2;
                    const midX = (x1 + x2) / 2;

                    return (
                      <g key={edge.id} className="cursor-pointer">
                        <path
                          d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                          fill="none"
                          stroke="url(#edge-grad)"
                          strokeWidth="2"
                          strokeDasharray={edge.dashed ? '4,4' : undefined}
                          markerEnd="url(#arrow)"
                          className="opacity-75 hover:opacity-100 transition-opacity"
                        />
                        {edge.label && (
                          <text
                            x={midX}
                            y={(y1 + y2) / 2 - 6}
                            fill="#94a3b8"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {edge.label} {edge.latency ? `(${edge.latency})` : ''}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {filteredNodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer transition-transform hover:scale-105"
                      >
                        {/* Rounded Card */}
                        <rect
                          width={node.width}
                          height={node.height}
                          rx="12"
                          fill="#141824"
                          stroke={isSelected ? '#38bdf8' : node.color}
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          className="shadow-md"
                        />
                        {/* Indicator pill */}
                        <circle cx="16" cy={node.height / 2} r="4" fill={node.color} />
                        {/* Title */}
                        <text
                          x="28"
                          y={node.height / 2 - 2}
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="600"
                          fontFamily="sans-serif"
                        >
                          {node.label}
                        </text>
                        {/* Subtext description */}
                        {node.description && (
                          <text
                            x="28"
                            y={node.height / 2 + 12}
                            fill="#94a3b8"
                            fontSize="8.5"
                            fontFamily="monospace"
                          >
                            {node.description.length > 22
                              ? node.description.slice(0, 20) + '...'
                              : node.description}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Node Inspector Panel (when a node is clicked) */}
                <AnimatePresence>
                  {selectedNode && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute bottom-2 left-2 right-2 p-2.5 rounded-xl bg-black/75 backdrop-blur-xl border border-white/15 flex items-center justify-between text-xs font-mono shadow-2xl"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: selectedNode.color }}
                        />
                        <span className="font-semibold text-white">{selectedNode.label}</span>
                        <span className="text-zinc-400 text-[10px]">({selectedNode.category})</span>
                        <span className="text-zinc-300 text-[11px]">— {selectedNode.description}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedNode(null)}
                        className="text-zinc-500 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2D Canvas Controls: Zoom In / Zoom Out / Reset Pan */}
              <div className="h-10 px-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400">
                  {current2DPreset.title} • {current2DPreset.nodes.length} nodes
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCanvasZoom((z) => Math.max(0.6, z - 0.15))}
                    className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-zinc-400 px-1">
                    {Math.round(canvasZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setCanvasZoom((z) => Math.min(2.0, z + 0.15))}
                    className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCanvasZoom(1.0);
                      setCanvasPan({ x: 0, y: 0 });
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 text-[9.5px] font-mono cursor-pointer ml-1"
                    title="Reset Zoom & Pan"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
