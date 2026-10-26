import React, { useState, useEffect } from 'react';
import { Search, Star, LayoutGrid, Maximize2, Check, Plus, Wifi, Minimize2, Sparkles, Mic, Zap, ShieldCheck, Command } from 'lucide-react';
import { AppleLogo } from './AppleLogo';

export const InteractiveNotchDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('Voice Dictations');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isNotchExpanded, setIsNotchExpanded] = useState<boolean>(true);
  const [morphing, setMorphing] = useState<boolean>(false);
  const [scrollY, setScrollY] = useState<number>(0);

  // Scroll-driven zoom — very subtle, 1% max, exactly like Supaste
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCardClick = (id: string, text: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleNotch = () => {
    setMorphing(true);
    setIsNotchExpanded((prev) => !prev);
    setTimeout(() => setMorphing(false), 450);
  };

  // Very subtle scroll zoom matching Supaste — max ~8% scale increase, smooth parallax rise
  const landscapeScale = 1 + Math.min(scrollY * 0.00008, 0.08);
  const landscapeTranslateY = Math.max(-12, -scrollY * 0.012);

  return (
    <div id="notch-demo" className="w-full relative flex flex-col items-center select-none bg-transparent">

      {/* ─── HERO WINDOW SECTION: exact Supaste structure ─────────────────────────── */}
      {/*
          Supaste layout:
            - outer container: position relative, overflow hidden
            - LAYER 1 (z-10): landscape image, absolute bottom-0, full width, height 600px — BEHIND glass
            - LAYER 2 (z-20): frosted glass screen, max-w-[1000px], aspect-[16/9], rounded-[30px] — ON TOP
            - LAYER 3 (z-30): white fade gradient, absolute bottom-0, height 200px — above landscape, clips into glass bottom
      */}
      <div
        className="w-full relative flex flex-col items-center px-4 sm:px-6 overflow-hidden"
        style={{ paddingTop: '40px', paddingBottom: '200px' }}
      >

        {/* ── LAYER 1 (z-10): Landscape BEHIND glass ─────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0 w-full pointer-events-none select-none overflow-hidden"
          style={{ height: '600px', zIndex: 10 }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transform: `scale(${landscapeScale}) translateY(${landscapeTranslateY}px)`,
              transformOrigin: 'bottom center',
              willChange: 'transform',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <img
              src="/foreground_hills.png"
              alt="DopeNotch Landscape"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'bottom center',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* ── LAYER 3 (z-30): White bottom fade — above landscape, below glass edge ─ */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '200px',
            zIndex: 30,
            background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 100%)',
          }}
        />

        {/* ── LAYER 2 (z-20): Frosted Glass Mac Screen — ON TOP of landscape ────── */}
        <div
          className="w-full relative"
          style={{ maxWidth: '1000px', zIndex: 20 }}
        >
          <div
            className="w-full frosted-glass-mac overflow-hidden flex flex-col"
            style={{
              aspectRatio: '16 / 9',
              borderRadius: '30px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: [
                'inset 0 2px 4px rgba(255,255,255,0.2)',
                'inset 0 4px 8px rgba(255,255,255,0.25)',
                'inset 0 -20px 20px rgba(255,255,255,0.25)',
                'inset 0 -1px rgba(255,255,255,0.4)',
                '0 20px 60px rgba(0,0,0,0.12)',
              ].join(', '),
            }}
          >

            {/* Mac Top Bar inside Glass Window */}
            <div className="h-10 px-5 flex items-center justify-between text-white/90 text-xs font-semibold select-none relative flex-shrink-0">
              {/* Left: DopeNotch */}
              <div className="flex items-center gap-1.5 drop-shadow">
                <AppleLogo className="w-3.5 h-3.5 text-white" />
                <span className="font-semibold text-[13px] tracking-tight">DopeNotch</span>
              </div>
              {/* Right: Search, Wifi, Time */}
              <div className="flex items-center gap-3 drop-shadow text-[11px] font-medium">
                <Search className="w-3.5 h-3.5 text-white/80 cursor-pointer hover:text-white" />
                <Wifi className="w-3.5 h-3.5 text-white/80" />
                <span className="font-mono font-semibold">09:41</span>
              </div>
            </div>

            {/* HARDWARE NOTCH — cuts down from top of glass window */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 flex items-start w-full justify-center pointer-events-none">

              {/* Left Notch Ear SVG (Apple G2 Squircle Continuous Fillet) */}
              <div className="w-[18px] h-4 flex-none relative overflow-visible -mr-px">
                <svg viewBox="0 0 18 16" className="w-[18px] h-4 fill-black flex-none" style={{ transform: 'scaleX(-1)', shapeRendering: 'geometricPrecision' }} aria-hidden="true">
                  <path d="M 0 0 L 18 0 C 11 0 6.5 1.2 4 4 C 1.2 6.8 0 10.5 0 16 Z" />
                </svg>
              </div>

              {/* NOTCH CONTENT */}
              {isNotchExpanded ? (
                /* --- EXPANDED SHELF --- */
                <div
                  className={`w-[92%] sm:w-[84%] md:w-[76%] lg:w-[68%] max-w-4xl bg-black text-white rounded-b-[20px] p-3.5 sm:p-4 shadow-2xl border-b border-x border-white/10 flex flex-col gap-3 pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${morphing ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}`}
                >
                  {/* Top Row: Search + Actions */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181f] border border-white/10 text-zinc-400 text-[11px] w-40 sm:w-56">
                      <Search className="w-3 h-3 text-zinc-500" />
                      <span>Search speech & clips...</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-400">
                      <button className="p-1.5 rounded-full hover:text-amber-400 hover:bg-white/5 transition-colors" title="Starred">
                        <Star className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-full hover:text-amber-400 hover:bg-white/5 transition-colors" title="Grid View">
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-full hover:text-amber-400 hover:bg-white/5 transition-colors" title="Full Library">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={toggleNotch}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-white/10 transition-all text-[10px] font-semibold ml-1"
                        title="Collapse to Dynamic Island"
                      >
                        <Minimize2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Island</span>
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-0.5 no-scrollbar">
                    {[
                      { name: 'Voice Dictations', count: 18 },
                      { name: 'Prompts', count: 24 },
                      { name: 'Brand Colors', count: 8 },
                      { name: 'Code Snippets', count: 32 },
                      { name: 'Inspirations', count: 14 },
                    ].map((tab) => (
                      <button
                        key={tab.name}
                        onClick={() => setActiveTab(tab.name)}
                        className={`px-3 py-1 rounded-full font-medium flex items-center gap-1.5 transition-all flex-none ${activeTab === tab.name
                          ? 'bg-white text-black font-semibold shadow-sm'
                          : 'text-zinc-400 hover:text-white bg-[#18181f] hover:bg-zinc-800'
                          }`}
                      >
                        <span>{tab.name}</span>
                        <span className="text-[9px] text-zinc-500">{tab.count}</span>
                      </button>
                    ))}
                    <button className="p-1 rounded-full bg-[#18181f] text-zinc-400 hover:text-white flex-none">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Clip Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">

                    {/* CARD 1: Portrait */}
                    <div
                      onClick={() => handleCardClick('c1', 'Portrait asset screenshot')}
                      className="rounded-2xl bg-cover bg-center border border-white/5 hover:border-amber-500/50 cursor-pointer transition-all flex flex-col justify-between p-2.5 h-32 relative group overflow-hidden"
                      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80')` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                      <div className="relative z-10 flex justify-end">
                        {copiedId === 'c1' && <Check className="w-3.5 h-3.5 text-amber-400 drop-shadow" />}
                      </div>
                      <div className="relative z-10 flex items-center justify-between text-[9px] text-zinc-300 font-mono">
                        <span>5 min ago</span>
                        <span>3.5 MB</span>
                      </div>
                    </div>

                    {/* CARD 2: Address */}
                    <div
                      onClick={() => handleCardClick('c2', 'Minneapolis 55410, 2041 Rocket Drive United States')}
                      className="p-3 rounded-2xl bg-[#141419] hover:bg-[#1a1a20] border border-white/5 hover:border-amber-500/50 cursor-pointer transition-all flex flex-col justify-between h-32 group"
                    >
                      <div>
                        <span className="text-[10px] text-zinc-300 font-medium block leading-snug">
                          Minneapolis 55410, 2041 Rocket Drive United States
                        </span>
                      </div>
                      {copiedId === 'c2' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      <div className="flex items-center justify-between text-[9px] text-zinc-500">
                        <span className="flex items-center gap-1 font-mono text-zinc-400">Chrome</span>
                        <span>19 min ago</span>
                      </div>
                    </div>

                    {/* CARD 3: Bookmark */}
                    <div
                      onClick={() => handleCardClick('c3', 'A curated shelf of beautifully designed macOS apps.')}
                      className="p-3 rounded-2xl bg-[#141419] hover:bg-[#1a1a20] border border-white/5 hover:border-amber-500/50 cursor-pointer transition-all flex flex-col justify-between h-32 group"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-medium text-zinc-300 leading-snug line-clamp-2">
                          A curated shelf of beautifully designed macOS apps.
                        </p>
                        {copiedId === 'c3' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-amber-400 text-xs font-black">
                        dope
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500">
                        <span>dopenotch.com</span>
                        <span>23 min ago</span>
                      </div>
                    </div>

                    {/* CARD 4: Color Swatch */}
                    <div
                      onClick={() => handleCardClick('c4', '#F59E0B')}
                      className="p-3 rounded-2xl bg-[#f59e0b] hover:brightness-110 cursor-pointer transition-all flex flex-col justify-between h-32 text-black font-bold shadow-lg"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono font-extrabold tracking-tight">#F59E0B</span>
                        {copiedId === 'c4' && <Check className="w-4 h-4 text-black" />}
                      </div>
                      <div className="text-[10px] font-bold opacity-90">DopeNotch Gold</div>
                      <div className="text-[9px] opacity-80 font-mono">35 min ago</div>
                    </div>

                    {/* CARD 5: Voice Clip */}
                    <div
                      onClick={() => handleCardClick('c5', 'Voice dictation: Summarize key engineering milestones for Q4 launch')}
                      className="p-3 rounded-2xl bg-[#141419] hover:bg-[#1a1a20] border border-white/5 hover:border-amber-500/50 cursor-pointer transition-all flex flex-col justify-between group h-32 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-zinc-300 leading-tight line-clamp-2">Voice: "Summarize key Q4 milestones"</span>
                        {copiedId === 'c5' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="p-1.5 rounded-lg bg-black/60 border border-white/5 flex items-center justify-center">
                        <div className="flex items-center gap-1">
                          {[8, 16, 12, 22, 14, 18].map((h, i) => (
                            <div key={i} className="w-1 bg-amber-400 rounded-full animate-pulse" style={{ height: `${h}px` }} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1">
                        <span className="font-mono text-amber-400/80">Whisper Local</span>
                        <span>Just now</span>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                /* --- COMPACT DYNAMIC ISLAND --- */
                <div
                  onClick={toggleNotch}
                  className="w-[260px] sm:w-[320px] h-[38px] bg-black text-white rounded-b-[18px] px-3.5 flex items-center justify-between shadow-2xl border-b border-x border-white/10 pointer-events-auto cursor-pointer hover:bg-zinc-950 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 group"
                  title="Click to expand DopeNotch Shelf"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-400/40 absolute animate-ping" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[6, 11, 8, 14, 9].map((h, i) => (
                        <div key={i} className="w-0.5 bg-amber-400 rounded-full animate-pulse" style={{ height: `${h}px` }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-white/90 group-hover:text-amber-300 transition-colors">
                    <span>⌥ + Space to Dictate</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 group-hover:text-white transition-colors">
                    <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                    <span className="text-[10px] font-mono">Shelf</span>
                  </div>
                </div>
              )}

              {/* Right Notch Ear SVG (Apple G2 Squircle Continuous Fillet) */}
              <div className="w-[18px] h-4 flex-none relative overflow-visible -ml-px">
                <svg viewBox="0 0 18 16" className="w-[18px] h-4 fill-black flex-none" style={{ shapeRendering: 'geometricPrecision' }} aria-hidden="true">
                  <path d="M 0 0 L 18 0 C 11 0 6.5 1.2 4 4 C 1.2 6.8 0 10.5 0 16 Z" />
                </svg>
              </div>
            </div>

            {/* Bottom spacer inside glass — fills height so landscape shows through lower portion */}
            <div className="flex-1" />

          </div>
        </div>
        {/* ─────────────────────────────────────────────────────────────────────────── */}

      </div>

      {/* ── REVOLVING CIRCULAR FEATURE BADGES ROW (1:1 Supaste Style, Seamless White Flow) ── */}
      <div className="w-full bg-white flex justify-center pt-8 pb-4 relative z-40">
        <div className="flex items-center justify-center gap-5 sm:gap-8 md:gap-10 overflow-x-auto px-4 max-w-6xl no-scrollbar">

          {/* BADGE 1: On-Device Whisper AI */}
          <div className="relative w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] flex items-center justify-center group flex-none">
            <div className="absolute inset-0 rounded-full border border-zinc-200/80 group-hover:border-zinc-400 group-hover:scale-105 transition-all duration-300 bg-white" />
            <svg
              className="w-full h-full absolute inset-0 select-none pointer-events-none"
              viewBox="0 0 100 100"
              style={{ animation: 'spin 20s linear infinite' }}
            >
              <defs>
                <path
                  id="circle-whisper"
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                />
              </defs>
              <text className="text-[7px] uppercase font-bold tracking-[0.2em] fill-zinc-600 group-hover:fill-black transition-colors">
                <textPath href="#circle-whisper" startOffset="0%">
                  • ON-DEVICE WHISPER • LOCAL AI •
                </textPath>
              </text>
            </svg>
            <div className="relative z-10 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-50 border border-zinc-200/90 shadow-sm text-zinc-800 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-300">
              <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* BADGE 2: Real-time <80ms Speed */}
          <div className="relative w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] flex items-center justify-center group flex-none">
            <div className="absolute inset-0 rounded-full border border-zinc-200/80 group-hover:border-zinc-400 group-hover:scale-105 transition-all duration-300 bg-white" />
            <svg
              className="w-full h-full absolute inset-0 select-none pointer-events-none"
              viewBox="0 0 100 100"
              style={{ animation: 'spin 18s linear infinite' }}
            >
              <defs>
                <path
                  id="circle-speed"
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                />
              </defs>
              <text className="text-[7px] uppercase font-bold tracking-[0.2em] fill-zinc-600 group-hover:fill-black transition-colors">
                <textPath href="#circle-speed" startOffset="0%">
                  • ULTRA LOW LATENCY • &lt;80MS SPEED •
                </textPath>
              </text>
            </svg>
            <div className="relative z-10 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-50 border border-zinc-200/90 shadow-sm text-zinc-800 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-300">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* BADGE 3: Dynamic Notch Shelf */}
          <div className="relative w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] flex items-center justify-center group flex-none">
            <div className="absolute inset-0 rounded-full border border-zinc-200/80 group-hover:border-zinc-400 group-hover:scale-105 transition-all duration-300 bg-white" />
            <svg
              className="w-full h-full absolute inset-0 select-none pointer-events-none"
              viewBox="0 0 100 100"
              style={{ animation: 'spin 22s linear infinite' }}
            >
              <defs>
                <path
                  id="circle-notch"
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                />
              </defs>
              <text className="text-[6.8px] uppercase font-bold tracking-[0.18em] fill-zinc-600 group-hover:fill-black transition-colors">
                <textPath href="#circle-notch" startOffset="0%">
                  • DYNAMIC NOTCH SHELF • MACOS NATIVE •
                </textPath>
              </text>
            </svg>
            <div className="relative z-10 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-50 border border-zinc-200/90 shadow-sm text-zinc-800 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-300">
              <AppleLogo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* BADGE 4: AI Smart Cleanup & Formatting */}
          <div className="relative w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] flex items-center justify-center group flex-none">
            <div className="absolute inset-0 rounded-full border border-zinc-200/80 group-hover:border-zinc-400 group-hover:scale-105 transition-all duration-300 bg-white" />
            <svg
              className="w-full h-full absolute inset-0 select-none pointer-events-none"
              viewBox="0 0 100 100"
              style={{ animation: 'spin 20s linear infinite' }}
            >
              <defs>
                <path
                  id="circle-ai"
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                />
              </defs>
              <text className="text-[6.8px] uppercase font-bold tracking-[0.18em] fill-zinc-600 group-hover:fill-black transition-colors">
                <textPath href="#circle-ai" startOffset="0%">
                  • AI AUTO FORMATTING • SMART CLEANUP •
                </textPath>
              </text>
            </svg>
            <div className="relative z-10 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-50 border border-zinc-200/90 shadow-sm text-zinc-800 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-300">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* BADGE 5: 100% Offline & Private */}
          <div className="relative w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] flex items-center justify-center group flex-none">
            <div className="absolute inset-0 rounded-full border border-zinc-200/80 group-hover:border-zinc-400 group-hover:scale-105 transition-all duration-300 bg-white" />
            <svg
              className="w-full h-full absolute inset-0 select-none pointer-events-none"
              viewBox="0 0 100 100"
              style={{ animation: 'spin 24s linear infinite' }}
            >
              <defs>
                <path
                  id="circle-offline"
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                />
              </defs>
              <text className="text-[6.8px] uppercase font-bold tracking-[0.18em] fill-zinc-600 group-hover:fill-black transition-colors">
                <textPath href="#circle-offline" startOffset="0%">
                  • 100% OFFLINE FIRST • ZERO CLOUD LEAK •
                </textPath>
              </text>
            </svg>
            <div className="relative z-10 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-50 border border-zinc-200/90 shadow-sm text-zinc-800 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-300">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* BADGE 6: Global Shortcut ⌥ + Space */}
          <div className="relative w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] flex items-center justify-center group flex-none">
            <div className="absolute inset-0 rounded-full border border-zinc-200/80 group-hover:border-zinc-400 group-hover:scale-105 transition-all duration-300 bg-white" />
            <svg
              className="w-full h-full absolute inset-0 select-none pointer-events-none"
              viewBox="0 0 100 100"
              style={{ animation: 'spin 19s linear infinite' }}
            >
              <defs>
                <path
                  id="circle-shortcut"
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                />
              </defs>
              <text className="text-[7px] uppercase font-bold tracking-[0.2em] fill-zinc-600 group-hover:fill-black transition-colors">
                <textPath href="#circle-shortcut" startOffset="0%">
                  • OPTION + SPACE • INSTANT DICTATE •
                </textPath>
              </text>
            </svg>
            <div className="relative z-10 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-50 border border-zinc-200/90 shadow-sm text-zinc-800 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-300">
              <Command className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
