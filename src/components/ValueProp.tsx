import React, { useState } from 'react';
import { 
  Cloud, Sparkles, Shield, Lock, Search, Camera, FileText, Layers, Filter, Zap, EyeOff, Folder,
  Plus, Check, AtSign, Link2, MapPin, Code2, AlignLeft, Mic, Clock, MousePointer, Volume2, Wifi
} from 'lucide-react';
import { AppleLogo } from './AppleLogo';

export const ValueProp: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('Voice Notes');
  const [activeType, setActiveType] = useState<string>('voice');

  const pills = [
    { label: 'Local Whisper AI', icon: Mic, color: 'text-amber-500' },
    { label: 'On-Device Brain', icon: Sparkles, color: 'text-orange-500' },
    { label: 'Local first', icon: Shield, color: 'text-zinc-700' },
    { label: 'Privacy first', icon: Lock, color: 'text-zinc-700' },
    { label: 'Search anything', icon: Search, color: 'text-zinc-700' },
    { label: 'Screenshots', icon: Camera, color: 'text-zinc-700' },
    { label: 'Hex Color Sampler', icon: FileText, color: 'text-zinc-700' },
    { label: 'Grouped by App', icon: Layers, color: 'text-zinc-700' },
    { label: 'Type filters', icon: Filter, color: 'text-zinc-700' },
    { label: 'Smart Filter', icon: Zap, color: 'text-amber-500' },
    { label: 'Password Filtered', icon: EyeOff, color: 'text-emerald-600' },
    { label: 'Custom categories', icon: Folder, color: 'text-zinc-700' },
  ];

  const categories = [
    { name: 'Voice Notes', count: 24 },
    { name: 'Colors', count: 16 },
    { name: 'Assets', count: 32 },
    { name: 'Prompts', count: 18 },
    { name: 'Inspirations', count: 12 },
  ];

  const appIcons = [
    { name: 'Figma', color: 'bg-black text-white', icon: '🎨' },
    { name: 'Photos', color: 'bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 text-white', icon: '🌸' },
    { name: 'Notes', color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: '📝' },
    { name: 'Mail', color: 'bg-blue-500 text-white', icon: '✉️' },
    { name: 'Safari', color: 'bg-blue-600 text-white', icon: '🧭' },
    { name: 'Xcode', color: 'bg-sky-500 text-white', icon: '🔨' },
  ];

  const typeBadges = [
    { id: 'voice', label: '@', icon: AtSign, title: 'Voice Memos' },
    { id: 'links', label: '🔗', icon: Link2, title: 'Web Links' },
    { id: 'locations', label: '📍', icon: MapPin, title: 'Locations' },
    { id: 'code', label: '</>', icon: Code2, title: 'Code Snippets' },
    { id: 'text', label: '☰', icon: AlignLeft, title: 'Formatted Text' },
  ];

  return (
    <section id="features" className="bg-white text-black pt-8 sm:pt-12 pb-24 px-4 flex flex-col items-center text-center">
      
      {/* ─── 1:1 TITLE & SUBTITLE ─────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto mb-10">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#111113] mb-4">
          Your clipboard, wherever you need it
        </h2>
        <p className="text-[#6e6e73] text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
          Use the notch shelf, quick search, inline paste, drag and drop, and the full Library view to find, reuse, and organize anything you copied.
        </p>
      </div>

      {/* ─── 12 PILL BADGES GRID ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto mb-14">
        {pills.map((pill, idx) => {
          const Icon = pill.icon;
          return (
            <div 
              key={idx}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-100/80 border border-zinc-200/80 text-zinc-700 hover:bg-zinc-200/70 transition-all cursor-default select-none shadow-sm"
            >
              <Icon className={`w-3.5 h-3.5 ${pill.color}`} />
              <span>{pill.label}</span>
            </div>
          );
        })}
      </div>

      {/* ─── SECTION 1: SUPASTE-INSPIRED BIG SHOWCASE CARD ───────────────── */}
      <div className="w-full max-w-5xl rounded-[32px] sm:rounded-[40px] bg-[#f5f5f7] border border-black/[0.04] p-6 sm:p-12 text-center flex flex-col items-center mb-6 overflow-hidden relative shadow-sm">
        
        <div className="max-w-3xl mx-auto mb-8">
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111113] mb-4">
            Smarter, Faster, and Connected Across Your Mac
          </h3>
          <p className="text-[#6e6e73] text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
            Keep your clipboard synced with iCloud, automatically organize clips with Smart Auto-Filter, share files instantly through AirDrop, and rewrite or summarize text using on-device Whisper AI.
          </p>
        </div>

        {/* Realistic macOS Screen Window with Expanded Interactive Notch Shelf */}
        <div className="w-full max-w-4xl rounded-[24px] overflow-hidden border border-black/10 shadow-2xl bg-[#0e0e11] relative aspect-[16/9.5] sm:aspect-[16/9] flex flex-col justify-between">
          
          {/* macOS Wallpaper Backdrop */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0 scale-105"
            style={{
              backgroundImage: `url('/foreground_hills.png')`,
              filter: 'brightness(0.92)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
          </div>

          {/* Top macOS Menu Bar */}
          <div className="h-8 px-4 flex items-center justify-between text-white/90 text-[11px] font-medium select-none z-20 relative bg-black/30 backdrop-blur-md border-b border-white/10">
            <div className="flex items-center gap-3">
              <AppleLogo className="w-3 h-3 text-white" />
              <span className="font-semibold text-xs">DopeNotch</span>
              <span className="hidden sm:inline text-white/70">File</span>
              <span className="hidden sm:inline text-white/70">Edit</span>
              <span className="hidden sm:inline text-white/70">View</span>
              <span className="hidden sm:inline text-white/70">Window</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-white/80">
              <Volume2 className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <span>100%</span>
              <span className="font-sans font-semibold">Sun 09:41 AM</span>
            </div>
          </div>

          {/* Expanded Dynamic Notch Shelf Cutout */}
          <div className="relative z-20 flex justify-center w-full px-4 -mt-1">
            <div className="w-full max-w-2xl bg-black/95 text-white rounded-b-[20px] p-3 sm:p-4 shadow-2xl border-b border-x border-white/15 backdrop-blur-xl">
              
              {/* Shelf Header */}
              <div className="flex items-center justify-between text-[11px] mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 font-medium text-amber-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    Today's Voice & Clips
                  </span>
                  <span className="text-zinc-400 font-mono text-[10px]">14 items</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-[10px]">
                  <span>⌥ + Space</span>
                </div>
              </div>

              {/* Shelf Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                
                {/* Voice Item */}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between h-24">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                      <Mic className="w-2.5 h-2.5" /> Voice
                    </span>
                    <span className="text-[8px] text-zinc-500 font-mono">1m ago</span>
                  </div>
                  <p className="text-[9.5px] text-zinc-200 line-clamp-2 leading-tight">
                    "Send draft contract to Sarah before Friday 4pm"
                  </p>
                  <span className="text-[8px] text-zinc-400 font-mono">Slack · Whisper</span>
                </div>

                {/* Code Snippet */}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between h-24">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-sky-400 flex items-center gap-1">
                      <Code2 className="w-2.5 h-2.5" /> Code
                    </span>
                    <span className="text-[8px] text-zinc-500 font-mono">14m ago</span>
                  </div>
                  <p className="text-[9.5px] font-mono text-zinc-300 line-clamp-2 leading-tight">
                    const useWhisper = () =&gt; streamAudio();
                  </p>
                  <span className="text-[8px] text-zinc-400 font-mono">Cursor · Typescript</span>
                </div>

                {/* Color Swatch */}
                <div className="p-2.5 rounded-xl bg-[#f59e0b] text-black transition-all flex flex-col justify-between h-24 font-bold shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-extrabold">#F59E0B</span>
                    <Check className="w-3 h-3 text-black" />
                  </div>
                  <span className="text-[10px] font-bold">Dope Gold</span>
                  <span className="text-[8px] font-mono opacity-80">Figma</span>
                </div>

                {/* Address */}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between h-24">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> Address
                    </span>
                    <span className="text-[8px] text-zinc-500 font-mono">42m ago</span>
                  </div>
                  <p className="text-[9.5px] text-zinc-200 line-clamp-2 leading-tight">
                    2041 Rocket Dr, Minneapolis, MN
                  </p>
                  <span className="text-[8px] text-zinc-400 font-mono">Safari</span>
                </div>

              </div>

            </div>
          </div>

          {/* Bottom macOS Dock / Interactive Cursor */}
          <div className="relative z-20 pb-4 flex justify-center items-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80 text-[10px]">
              <MousePointer className="w-3 h-3 text-amber-400 animate-bounce" />
              <span>Hover anywhere near the top bezel to activate</span>
            </div>
          </div>

        </div>

      </div>

      {/* ─── SECTION 1 (PART B): 2-COLUMN GRID (1:1 SUPASTE STYLE) ──────── */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-16">
        
        {/* CARD 1: Custom Categories */}
        <div className="rounded-[32px] sm:rounded-[40px] bg-[#f5f5f7] border border-black/[0.04] p-8 sm:p-10 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <h4 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111113] mb-3">
              Custom Categories
            </h4>
            <p className="text-[#6e6e73] text-sm leading-relaxed mb-8 font-normal">
              Create your own spaces for projects, voice memos, templates, brand assets, and everyday snippets. Organize email replies, text blocks, logos, icons, colors, files, and anything else you want to find and reuse quickly.
            </p>
          </div>

          {/* Interactive Category Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                  activeCategory === cat.name
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-white text-zinc-700 hover:bg-zinc-200/80 border border-zinc-200/80 shadow-sm'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] ${activeCategory === cat.name ? 'text-blue-200' : 'text-zinc-400'}`}>
                  {cat.count}
                </span>
              </button>
            ))}
            <button 
              className="p-2 rounded-full bg-white hover:bg-zinc-200/80 border border-zinc-200/80 text-zinc-600 transition-all shadow-sm"
              title="Add Custom Space"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CARD 2: Find by App or Type */}
        <div className="rounded-[32px] sm:rounded-[40px] bg-[#f5f5f7] border border-black/[0.04] p-8 sm:p-10 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <h4 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111113] mb-3">
              Find by App or Type
            </h4>
            <p className="text-[#6e6e73] text-sm leading-relaxed mb-8 font-normal">
              Filter your history by the app it came from or the kind of content it is. Quickly find clips from Safari, Figma, Slack, Xcode, or Mail, and browse by voice, links, screenshots, images, files, code, colors, and more.
            </p>
          </div>

          {/* App Icons & Data Type Badges Row */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Top Row: App Source Icons */}
            <div className="flex items-center gap-2.5">
              {appIcons.map((app, idx) => (
                <div
                  key={idx}
                  className={`w-10 h-10 rounded-2xl ${app.color} flex items-center justify-center text-base shadow-sm hover:scale-110 transition-transform cursor-pointer`}
                  title={app.name}
                >
                  <span>{app.icon}</span>
                </div>
              ))}
            </div>

            {/* Bottom Row: Type Filter Badges */}
            <div className="flex items-center gap-2 pt-1">
              {typeBadges.map((type) => {
                const Icon = type.icon;
                const isSelected = activeType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setActiveType(type.id)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-black text-white shadow-md scale-105'
                        : 'bg-white text-zinc-600 hover:bg-zinc-200/80 border border-zinc-200/80 shadow-sm'
                    }`}
                    title={type.title}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </section>
  );
};
