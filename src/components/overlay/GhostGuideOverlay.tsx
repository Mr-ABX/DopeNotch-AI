import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MousePointer,
  ArrowRight,
  ArrowLeft,
  X,
  Target,
  Zap,
  CornerDownLeft,
} from 'lucide-react';
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
}

export const GhostGuideOverlay: React.FC<GhostGuideOverlayProps> = ({
  target = SAMPLE_SPATIAL_GUIDE_PRESETS.photoshop_pen_tool,
  onClose,
  onStepComplete,
  onLaserCircleComplete,
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

  // Laser Circle-to-Ask state
  const [isLaserMode, setIsLaserMode] = useState<boolean>(false);
  const [laserPoints, setLaserPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isLaserDrawing, setIsLaserDrawing] = useState<boolean>(false);

  // Animate Ghost Mouse gliding from Notch to target coordinate
  useEffect(() => {
    setIsFlying(true);
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
      }
    }, 16); // ~60fps smooth flight

    return () => clearInterval(interval);
  }, [activeStep]);

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
      className={`fixed inset-0 pointer-events-auto z-[9990] select-none ${
        isLaserMode ? 'cursor-crosshair' : 'cursor-default'
      }`}
      style={{ background: 'transparent' }}
    >
      {/* ========================================================================= */}
      {/* 1. DYNAMIC NOTCH MASCOT ("DopeBuddy" Eyes peeking from notch)             */}
      {/* ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9995,
        }}
        className="flex flex-col items-center pointer-events-auto"
      >
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-3 py-1 rounded-b-2xl bg-black/90 backdrop-blur-md border-x border-b border-cyan-400/30 flex items-center gap-2 shadow-[0_4px_16px_rgba(56,189,248,0.25)]"
        >
          {/* Animated Mascot Eyes */}
          <div className="flex items-center gap-1">
            <motion.div
              animate={{
                scaleY: [1, 1, 0.1, 1],
                x: ghostPos.x < window.innerWidth / 2 ? -1.5 : 1.5,
              }}
              transition={{ repeat: Infinity, duration: 3.2, times: [0, 0.9, 0.95, 1] }}
              className="w-2 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#38bdf8]"
            />
            <motion.div
              animate={{
                scaleY: [1, 1, 0.1, 1],
                x: ghostPos.x < window.innerWidth / 2 ? -1.5 : 1.5,
              }}
              transition={{ repeat: Infinity, duration: 3.2, times: [0, 0.9, 0.95, 1] }}
              className="w-2 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#38bdf8]"
            />
          </div>

          <span className="text-[10px] font-mono font-medium text-cyan-200">
            DopeBuddy Guiding
          </span>

          {/* Toggle Laser Circle-to-Ask pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLaserMode(!isLaserMode);
            }}
            className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono transition-all cursor-pointer flex items-center gap-1 ${
              isLaserMode
                ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                : 'bg-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            <Target className="w-2.5 h-2.5" />
            <span>{isLaserMode ? 'Laser Active' : 'Circle-to-Ask'}</span>
          </button>

          {/* Close Guiding Button */}
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LIVE SCREEN CHALKBOARD SVG OVERLAY                                      */}
      {/* ========================================================================= */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
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
            {/* Pulsing Target Radar Ring */}
            <circle
              cx="0"
              cy="0"
              r="24"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              filter="url(#neon-glow)"
              className="animate-ping opacity-60"
            />

            {/* Hand-drawn simulated chalk circle */}
            <circle
              cx="0"
              cy="0"
              r="20"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="90 8"
              filter="url(#neon-glow)"
            />

            {/* Pointing Arrow Stem */}
            <line
              x1="34"
              y1="-34"
              x2="16"
              y2="-16"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#neon-glow)"
            />
          </g>
        )}

        {/* Laser Circle Trail (when user draws with Laser Circle-to-Ask) */}
        {laserPoints.length > 1 && (
          <polyline
            points={laserPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neon-glow)"
            className="opacity-95"
          />
        )}
      </svg>

      {/* ========================================================================= */}
      {/* 3. AI GHOST MOUSE VIRTUAL CURSOR                                          */}
      {/* ========================================================================= */}
      {!isLaserMode && (
        <motion.div
          animate={{ x: ghostPos.x, y: ghostPos.y }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{ position: 'fixed', left: 0, top: 0, pointerEvents: 'none' }}
          className="z-[9998] flex items-center gap-1.5"
        >
          {/* Virtual AI Mouse Cursor */}
          <div className="relative">
            <MousePointer className="w-5 h-5 text-cyan-400 fill-cyan-400/80 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)] transform -rotate-12" />
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.9, 0, 0.9] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute -inset-1 rounded-full bg-cyan-400/30 -z-10"
            />
          </div>

          {/* Ghost Cursor Comet Badge */}
          {isFlying && (
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[9px] font-mono text-cyan-200">
              Moving...
            </span>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 4. FLOATING STEP-BY-STEP GUIDANCE PILL & SHORTCUT CALLOUT                 */}
      {/* ========================================================================= */}
      {!isLaserMode && !isFlying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 320, Math.max(20, activeStep.x + 30))}px`,
            top: `${Math.min(window.innerHeight - 160, Math.max(60, activeStep.y - 20))}px`,
            zIndex: 9997,
          }}
          className="w-72 p-3 rounded-2xl bg-black/85 backdrop-blur-xl border border-cyan-400/30 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.65),0_0_15px_rgba(56,189,248,0.2)] flex flex-col gap-2 pointer-events-auto"
        >
          {/* Header: Step Number & Title */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Step {currentStepIdx + 1} of {currentTarget.steps.length}
            </span>

            {/* Glowing Shortcut Keycap Badge */}
            {activeStep.shortcut && (
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-[10px] font-mono font-bold text-white shadow-sm flex items-center gap-1">
                <CornerDownLeft className="w-2.5 h-2.5 text-cyan-400" />
                <span>{activeStep.shortcut}</span>
              </span>
            )}
          </div>

          {/* Title & Instruction */}
          <div className="flex flex-col gap-0.5">
            <h4 className="text-xs font-semibold text-white">{activeStep.title}</h4>
            <p className="text-[11px] text-zinc-300 leading-snug">{activeStep.instruction}</p>
          </div>

          {/* Step Actions (Previous, Next, Finish) */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.08]">
            {currentStepIdx > 0 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-2 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.5)] cursor-pointer"
            >
              <span>
                {currentStepIdx < currentTarget.steps.length - 1 ? 'Next Step' : 'Done!'}
              </span>
              <ArrowRight className="w-3 h-3" />
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
          className="px-4 py-2 rounded-2xl bg-black/90 backdrop-blur-md border border-rose-500/40 text-xs font-mono text-rose-200 flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] pointer-events-none"
        >
          <Zap className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Click & Drag to circle any button, error, or equation on your screen</span>
        </div>
      )}
    </div>
  );
};
