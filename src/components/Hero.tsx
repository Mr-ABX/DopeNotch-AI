import React from 'react';
import { AppleLogo } from './AppleLogo';
import { InteractiveNotchDemo } from './InteractiveNotchDemo';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-24 sm:pt-32 pb-0 px-0 flex flex-col items-center text-center brand-hero-unified-sky text-white overflow-hidden select-none">
      
      {/* Top Translucent Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 hover:bg-white/20 border border-white/25 text-white text-xs font-semibold mb-6 backdrop-blur-md transition-all shadow-sm">
        <AppleLogo className="w-3.5 h-3.5 text-white" />
        <span>Voice & Clipboard Superpowers</span>
      </div>

      {/* Main Big Headline: Speak once. Reuse anytime. (Instrument Serif Italic) */}
      <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white max-w-5xl leading-[1.05] mb-5 px-4 drop-shadow-sm">
        Speak once.<br />
        <span className="font-serif-italic font-normal text-white">
          Reuse anytime.
        </span>
      </h1>

      {/* Subtitle description */}
      <p className="max-w-2xl text-xs sm:text-sm md:text-base text-white/90 leading-relaxed mb-7 font-normal px-6 drop-shadow-sm">
        DopeNotch saves your on-device Whisper voice dictations and clipboard in a beautiful visual history, automatically grouped by type, app, and custom categories, so you can search, find, and paste anything back in seconds.
      </p>

      {/* Download for macOS (Solid Black Pill Button) */}
      <div className="flex flex-col items-center gap-3 mb-12 sm:mb-16 md:mb-20 px-4">
        <a 
          href="#pricing"
          className="px-7 py-3 rounded-full text-xs sm:text-sm font-bold bg-black text-white hover:bg-zinc-900 border border-white/15 transition-all hover:scale-105 active:scale-95 shadow-2xl flex items-center gap-2.5"
        >
          <AppleLogo className="w-4 h-4 text-white" />
          <span>Download for macOS</span>
        </a>

        <p className="text-[11.5px] text-white/85 font-medium">
          First time installing DopeNotch?{' '}
          <a
            href="/apps/dopenotch/install/mac/"
            className="underline decoration-white/60 hover:decoration-white font-semibold text-white transition-colors"
          >
            Read the setup guide →
          </a>
        </p>

        {/* Micro Trust Metadata */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-white/70 font-medium">
          <span>One-time purchase</span>
          <span>•</span>
          <span>Fully offline and privacy</span>
          <span>•</span>
          <span>macOS Sonoma 14.0 or later</span>
        </div>
      </div>

      {/* 1:1 Sonoma Landscape Wallpaper & Frosted Glass Window with Scroll Depth */}
      <InteractiveNotchDemo />

    </section>
  );
};
