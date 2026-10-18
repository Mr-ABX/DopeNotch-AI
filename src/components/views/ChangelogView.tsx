import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const ChangelogView: React.FC = () => {
  return (
    <div className="flex-1 h-full overflow-y-auto p-8 space-y-6 bg-[#000000] text-[#ededed]">
      <div>
        <h1 className="text-xl font-bold text-[#ededed] tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" /> What's New in DopeNotch
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Recent architecture updates, performance improvements, and model enhancements.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[#121215] border border-[#1e1e24] space-y-5">
        <div className="flex items-center justify-between border-b border-[#1e1e24] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#ededed]">Version 0.4.0 (DopeNotch & SuperShelf)</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Latest
            </span>
          </div>
          <span className="text-xs text-zinc-500 font-mono">September 2026</span>
        </div>

        <div className="space-y-3.5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-[#ededed]">Native SuperShelf Top Notch Silhouette</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Authentic Apple MacBook notch cutout with concave reverse-ear curves, horizontal card carousel, and zero rectangular drop-shadow artifacts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-[#ededed]">Real-Time Native Clipboard Synchronizer</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Background OS daemon syncing copied text, code, links, and full visual color cards instantly with automatic source app detection.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-[#ededed]">Offline Whisper GGML Speech Inference</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                100% private, on-device Whisper models with zero API dependencies and sub-80ms transcription latency.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-[#ededed]">Apple Swift Minimalist Dashboard</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Sleek dark matte design tokens, pill filters, clean typography, and zero glitter or neon distraction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
