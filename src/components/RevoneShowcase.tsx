import React from 'react';
import { Bell, Clock, Sparkles, Search, CheckCircle2, ArrowRight } from 'lucide-react';

export const RevoneShowcase: React.FC = () => {
  const cards = [
    {
      title: 'Real-time notifications',
      description: "Get notified the moment a new voice dictation or clipboard clip is processed. DopeNotch uses native macOS notifications, so you never have to check dashboards to know what's going on.",
      tag: '01 / NOTIFICATIONS',
      renderVisual: () => (
        <div className="w-full aspect-[16/11] rounded-2xl bg-gradient-to-b from-zinc-900 to-black p-5 flex flex-col justify-center items-center shadow-inner relative overflow-hidden select-none">
          {/* macOS Floating Notification Banner Mockup */}
          <div className="w-full max-w-[340px] rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3.5 shadow-2xl flex items-start gap-3">
            <img src="/logo.png" alt="DopeNotch" className="w-9 h-9 rounded-xl object-contain shadow-md flex-none bg-black/40 p-1" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[12px] font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Dictation Completed
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Just now</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-snug line-clamp-2">
                "Transcribed 48 words in 68ms with on-device Whisper Base. Auto-pasted into active editor."
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
            <Bell className="w-3 h-3 text-amber-400" />
            <span>macOS UserNotifications API</span>
          </div>
        </div>
      ),
    },
    {
      title: 'See every clip in one place',
      description: "View all your voice dictations, code snippets, and clippings in a single, clean timeline. Everything is organized chronologically, so you can quickly understand what's happening across your Mac.",
      tag: '02 / TIMELINE',
      renderVisual: () => (
        <div className="w-full aspect-[16/11] rounded-2xl bg-gradient-to-b from-zinc-50 to-zinc-100 p-4 flex flex-col justify-between border border-zinc-200/80 shadow-inner overflow-hidden select-none">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pb-2 border-b border-zinc-200">
            <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Live History Feed
            </span>
            <span>342 items saved</span>
          </div>
          <div className="space-y-2 py-1">
            <div className="p-2.5 rounded-xl bg-white border border-black/5 shadow-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold uppercase font-mono">Voice</span>
                <span className="text-xs text-zinc-800 font-medium truncate">"Schedule standup with the design team tomorrow"</span>
              </div>
              <span className="text-[10px] text-zinc-400 flex-none">2m ago</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-black/5 shadow-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full bg-[#f59e0b] ring-1 ring-black/10 flex-none" />
                <span className="text-xs font-mono text-zinc-800 font-semibold truncate">#F59E0B • Brand Amber</span>
              </div>
              <span className="text-[10px] text-zinc-400 flex-none">8m ago</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-black/5 shadow-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold uppercase font-mono">Code</span>
                <span className="text-xs font-mono text-zinc-800 truncate">git commit -m "feat: release gates"</span>
              </div>
              <span className="text-[10px] text-zinc-400 flex-none">1h ago</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Smart AI auto-formatting',
      description: 'Transform raw speech transcripts into clean bullet points, executive summaries, or formatted code blocks on the fly using on-device Apple Silicon intelligence.',
      tag: '03 / AI FORMATTING',
      renderVisual: () => (
        <div className="w-full aspect-[16/11] rounded-2xl bg-zinc-900 p-4 flex flex-col justify-between border border-white/10 shadow-inner select-none text-left">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pb-2 border-b border-white/10">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              On-Device AI Polisher
            </span>
            <span className="text-[10px] text-emerald-400">0ms Cloud Latency</span>
          </div>
          <div className="space-y-2 py-1">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono block mb-1">Spoken Raw:</span>
              <p className="text-[11px] text-zinc-400 italic">"um yeah so basically we need to finish the release installer for both intel and apple silicon"</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[9px] uppercase tracking-wider text-amber-400 font-mono block mb-1">Polished Output:</span>
              <p className="text-[12px] font-medium text-amber-200">"Build and notarize dual universal installers for Intel and Apple Silicon Macs."</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Stay on top of your workflow',
      description: 'Search through thousands of copied words in sub-milliseconds, filter by application or tag, and access everything instantly through global keyboard shortcuts.',
      tag: '04 / WORKFLOW',
      renderVisual: () => (
        <div className="w-full aspect-[16/11] rounded-2xl bg-gradient-to-b from-zinc-50 to-zinc-100 p-4 flex flex-col justify-between border border-zinc-200/80 shadow-inner select-none">
          {/* Quick Search Palette Mockup */}
          <div className="p-3 rounded-xl bg-white border border-black/10 shadow-md">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 text-xs">
              <Search className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-zinc-800">Search clips, notes & tags...</span>
              <span className="ml-auto text-[10px] font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500">⌘K</span>
            </div>
            <div className="flex items-center gap-1.5 pt-2 text-[10px] font-medium text-zinc-500">
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">All (1,240)</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">Voice (28)</span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">Colors (16)</span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">Links (84)</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-200">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sub-millisecond SQLite FTS5 search
            </span>
            <span className="font-mono text-[10px]">Option+Space</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="workflows" className="bg-white text-black py-24 sm:py-32 px-4 flex flex-col items-center text-center relative select-none">
      
      {/* ─── SECTION TITLE & SUBTITLE (DESIGN SYSTEM ALIGNED) ─────────────── */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#111113] mb-5 leading-[1.08]">
          Everything you need to<br className="hidden sm:inline" /> understand your workflow
        </h2>
        <p className="text-[#6e6e73] text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
          Track voice dictations, clipboard history, and performance across all your apps — in one fast, unified Mac app.
        </p>
      </div>

      {/* ─── 2-COLUMN GRID WITH 2 ROWS (4 CARDS TOTAL IN LIGHT DESIGN SYSTEM) ─── */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {cards.map((card, idx) => (
          <div 
            key={idx}
            className="rounded-[32px] sm:rounded-[40px] bg-[#f5f5f7] border border-black/[0.04] p-8 sm:p-10 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
          >
            <div className="mb-6">
              <div className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase mb-2">
                {card.tag}
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111113] mb-3">
                {card.title}
              </h3>
              <p className="text-[#6e6e73] text-sm sm:text-base leading-relaxed font-normal">
                {card.description}
              </p>
            </div>

            {/* Custom Interactive Preview Visual Component */}
            {card.renderVisual()}
          </div>
        ))}
      </div>

    </section>
  );
};
