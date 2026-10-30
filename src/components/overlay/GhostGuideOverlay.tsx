import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  X,
  Target,
  Zap,
  CornerDownLeft,
  MousePointerClick,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import {
  SpatialGuideTarget,
  SpatialStep,
  computeCurvedFlightPath,
  SAMPLE_SPATIAL_GUIDE_PRESETS,
} from '../../services/spatialGuideService';

export interface GhostGuideOverlayProps {
  target?: SpatialGuideTarget | null;
  onClose?: () => void;
  onStepComplete?: (stepNumber: number) => void;
  onLaserCircleComplete?: (rect: { x: number; y: number; width: number; height: number }) => void;
  autoClickOnArrival?: boolean;
}

export const GhostGuideOverlay: React.FC<GhostGuideOverlayProps> = ({
  target = SAMPLE_SPATIAL_GUIDE_PRESETS.photoshop_pen_tool,
  onClose,
  onStepComplete,
  onLaserCircleComplete,
  autoClickOnArrival = false,
}) => {
  const currentTarget = target || SAMPLE_SPATIAL_GUIDE_PRESETS.photoshop_pen_tool;

  // Current multi-step guide index
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const activeStep: SpatialStep = currentTarget.steps[currentStepIdx] || currentTarget.steps[0];

  // Ghost Mouse cursor position & flight animation
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number }>({
    x: window.innerWidth / 2,
    y: 14, // Starts right at the MacBook notch
  });
  const [isFlying, setIsFlying] = useState<boolean>(true);
  const [hasClicked, setHasClicked] = useState<boolean>(false);

  // Laser Circle-to-Ask state
  const [isLaserMode, setIsLaserMode] = useState<boolean>(false);
  const [laserPoints, setLaserPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isLaserDrawing, setIsLaserDrawing] = useState<boolean>(false);

  // Animate Ghost Mouse gliding from Notch to target coordinate
  useEffect(() => {
    setIsFlying(true);
    setHasClicked(false);
    const startX = window.innerWidth / 2;
    const startY = 14; // Notch center
    const destX = activeStep.x;
    const destY = activeStep.y;

    const path = computeCurvedFlightPath(startX, startY, destX, destY, 28);
    let step = 0;

    const interval = setInterval(() => {
      if (step < path.length) {
        setGhostPos({ x: path[step].x, y: path[step].y });
        step++;
      } else {
        clearInterval(interval);
        setIsFlying(false);
        // Optional physical click on arrival if enabled
        if (autoClickOnArrival) {
          invoke('perform_ghost_click', { x: destX, y: destY })
            .then(() => setHasClicked(true))
            .catch(() => {});
        }
      }
    }, 16); // ~60fps smooth flight

    return () => clearInterval(interval);
  }, [activeStep, autoClickOnArrival]);

  // Step navigation
  const handleNextStep = () => {
    if (currentStepIdx < currentTarget.steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      onStepComplete?.(nextIdx + 1);
    } else {
      onClose?.();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleManualClick = () => {
    invoke('perform_ghost_click', { x: activeStep.x, y: activeStep.y })
      .then(() => setHasClicked(true))
      .catch((e) => console.warn('Could not perform click:', e));
  };

  // Laser Circle-to-Ask Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isLaserMode) return;
    setIsLaserDrawing(true);
    setLaserPoints([{ x: e.clientX, y: e.clientY }]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isLaserMode || !isLaserDrawing) return;
    setLaserPoints((prev) => [...prev, { x: e.clientX, y: e.clientY }]);
  };

  const handleMouseUp = () => {
    if (!isLaserMode || !isLaserDrawing) return;
    setIsLaserDrawing(false);

    if (laserPoints.length > 5) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      laserPoints.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });

      const width = Math.max(30, maxX - minX);
      const height = Math.max(30, maxY - minY);
      onLaserCircleComplete?.({ x: minX, y: minY, width, height });
    }

    // Reset laser trail after brief confirmation glow
    setTimeout(() => {
      setLaserPoints([]);
      setIsLaserMode(false);
    }, 1200);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`fixed inset-0 z-[9990] select-none ${
        isLaserMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none cursor-default'
      }`}
      style={{ background: 'transparent' }}
    >
      {/* ========================================================================= */}
      {/* 1. LIVE SCREEN CHALKBOARD SVG OVERLAY (Brand Amber Glow)                   */}
      {/* ========================================================================= */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="amber-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Chalk Circle around Target Coordinate */}
        {!isLaserMode && (
          <g transform={`translate(${activeStep.x}, ${activeStep.y})`}>
            {/* Pulsing Target Radar Ring (Amber) */}
            <circle
              cx="0"
              cy="0"
              r="24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              filter="url(#amber-glow)"
              className="animate-ping opacity-60"
            />

            {/* Hand-drawn simulated chalk circle */}
            <circle
              cx="0"
              cy="0"
              r="20"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeDasharray="90 8"
              filter="url(#amber-glow)"
            />

            {/* Pointing Accent Line */}
            <line
              x1="32"
              y1="-32"
              x2="16"
              y2="-16"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#amber-glow)"
            />
          </g>
        )}

        {/* Laser Circle Trail (when user draws with Laser Circle-to-Ask) */}
        {laserPoints.length > 1 && (
          <polyline
            points={laserPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#amber-glow)"
            className="opacity-95"
          />
        )}
      </svg>

      {/* ========================================================================= */}
      {/* 2. NATIVE GHOST MOUSE CURSOR (Arrowhead, no tail, matching reference)      */}
      {/* ========================================================================= */}
      {!isLaserMode && (
        <motion.div
          animate={{ x: ghostPos.x, y: ghostPos.y }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{ position: 'fixed', left: 0, top: 0, pointerEvents: 'none' }}
          className="z-[9998]"
        >
          {/* Native Mac / Windows Arrowhead Cursor (Clean black with white border, rounded corners, no tail stem) */}
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transform -translate-x-[2px] -translate-y-[2px]"
          >
            <path
              d="M 2.5 2.5 L 23 9.5 L 13.5 13.5 L 9.5 23 Z"
              fill="#000000"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 3. FLOATING STEP-BY-STEP GUIDANCE PILL & SHORTCUT CALLOUT                 */}
      {/* ========================================================================= */}
      {!isLaserMode && !isFlying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 330, Math.max(20, activeStep.x + 35))}px`,
            top: `${Math.min(window.innerHeight - 170, Math.max(60, activeStep.y - 20))}px`,
            zIndex: 9997,
          }}
          className="w-80 p-3.5 rounded-2xl bg-[#0e0e12]/95 backdrop-blur-xl border border-white/15 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8)] flex flex-col gap-2.5 pointer-events-auto"
        >
          {/* Header: Step Number, Shortcuts & Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-200 border border-white/15 font-semibold">
                Step {currentStepIdx + 1} of {currentTarget.steps.length}
              </span>

              {/* Glowing Shortcut Keycap Badge */}
              {activeStep.shortcut && (
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-[10px] font-mono font-bold text-white shadow-sm flex items-center gap-1">
                  <CornerDownLeft className="w-2.5 h-2.5 text-zinc-400" />
                  <span>{activeStep.shortcut}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Laser Circle Toggle */}
              <button
                type="button"
                onClick={() => setIsLaserMode(!isLaserMode)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Toggle Circle-to-Ask Laser"
              >
                <Target className="w-3.5 h-3.5" />
              </button>

              {/* Close Guide Button */}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Guide"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Title & Instruction */}
          <div className="flex flex-col gap-0.5">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>{activeStep.title}</span>
            </h4>
            <p className="text-[11px] text-zinc-300 leading-snug">{activeStep.instruction}</p>
          </div>

          {/* Step Actions (Previous, Next, Auto-Click) */}
          <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              {currentStepIdx > 0 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-2 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>
              )}

              {/* Manual Click Trigger */}
              <button
                type="button"
                onClick={handleManualClick}
                className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-[10px] font-mono flex items-center gap-1 cursor-pointer border border-white/10"
                title="Synthesize real macOS mouse click on this element"
              >
                <MousePointerClick className="w-3 h-3 text-zinc-300" />
                <span>{hasClicked ? 'Clicked! ✓' : 'Click It'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              className="px-3.5 py-1 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>
                {currentStepIdx < currentTarget.steps.length - 1 ? 'Next Step' : 'Done!'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Laser Mode Instruction Banner */}
      {isLaserMode && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9996,
          }}
          className="px-4 py-2 rounded-2xl bg-black/90 backdrop-blur-md border border-amber-500/40 text-xs font-mono text-amber-200 flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] pointer-events-none"
        >
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Click & Drag to circle any button, error, or equation on your screen</span>
        </div>
      )}
    </div>
  );
};
