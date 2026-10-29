import React, { useState } from 'react';
import { Check, Sparkles, ShieldCheck } from 'lucide-react';
import { AppleLogo } from './AppleLogo';
import { openInstallGuideModal } from './InstallGuideModal';

export const Pricing: React.FC = () => {
  const [foreverUpdates, setForeverUpdates] = useState<boolean>(false);

  const currentPlan = foreverUpdates
    ? {
        name: 'DopeNotch Pro + Forever Updates Pass',
        badge: 'Includes all future v1.0 & v2.0+ feature releases',
        price: '$24',
        oldPrice: '$49',
        updateFeature: 'Forever Updates Pass — all future features & major versions',
        buttonText: 'Get Pro + Forever Updates ($24)',
        checkoutUrl: 'https://buy.polar.sh/polar_cl_Vo7H00kWSn6lc0gMQLS3RETsL2sva2tE3kwhP1SRGR0',
      }
    : {
        name: 'DopeNotch Pro Core',
        badge: 'Keep the current stable release (v0.4.x) forever',
        price: '$15',
        oldPrice: '$29',
        updateFeature: 'Current stable release (v0.4.x) + security patches & bug fixes',
        buttonText: 'Get Pro Core ($15)',
        checkoutUrl: 'https://buy.polar.sh/polar_cl_fby6JW0hZacNedJuyHKQoi5m834UHFEwb9jUk1yBbMp',
      };

  return (
    <section id="pricing" className="relative py-28 sm:py-36 px-4 sm:px-6 flex flex-col items-center text-center bg-white overflow-hidden select-none">
      
      {/* ─── 1:1 SUPASTE ATMOSPHERIC BRAND GRADIENT (DEEP #F69E0B & LOGO SHADES) ─── */}
      <div 
        className="absolute pointer-events-none overflow-visible"
        style={{
          bottom: '160px',
          left: '-10vw',
          right: '-10vw',
          height: '820px',
          filter: 'blur(60px)',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(254, 243, 199, 0.7) 22%, #FCD34D 40%, #F69E0B 62%, #D97706 82%, #9A3412 100%)',
          opacity: 0.95,
          zIndex: 1,
        }}
        aria-hidden="true"
      />
      
      {/* Soft Seamless Bottom White Transition (1:1 Supaste framer-qkmt98) */}
      <div 
        className="absolute inset-x-0 bottom-0 h-56 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.85) 55%, #ffffff 100%)',
          zIndex: 2,
        }}
        aria-hidden="true" 
      />

      {/* ─── 1:1 HEADLINE & SUBTITLE ──────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto mb-14 sm:mb-16 relative z-10">
        <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#111113] mb-5 leading-[1.05]">
          Simple pricing.<br />
          Own it forever.
        </h2>
        <p className="text-[#3a3a3c] text-sm sm:text-base font-medium mb-3 leading-relaxed">
          Start free with Community Edition, or own the current stable Pro release forever — with optional Forever Updates.
        </p>
        <p className="text-[#6e6e73] text-xs max-w-lg mx-auto leading-relaxed font-normal">
          One-time payment. No monthly subscriptions. Select additional device seats or upgrades directly at checkout.
        </p>
      </div>

      {/* ─── 2-TIER PRICING GRID (COMMUNITY & PRO LIFETIME) ───────────────── */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch z-10 relative">

        {/* ─── TIER 1: FREE COMMUNITY EDITION CARD ──────────────────────────── */}
        <div className="bg-white/95 backdrop-blur-md rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-black flex flex-col justify-between border border-black/[0.06] relative">
          
          <div>
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold mb-6">
              <span>🌱</span>
              <span>Community Free</span>
            </div>

            {/* Price Header */}
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-6xl sm:text-7xl font-bold text-[#111113] tracking-tight">$0</span>
              <span className="text-sm font-semibold text-zinc-500">/ forever</span>
            </div>
            <p className="text-xs text-zinc-500 mb-8 max-w-xs mx-auto">
              Essential on-device voice dictation & clipboard utility for casual everyday use.
            </p>

            {/* Feature Limits & Inclusions */}
            <div className="w-full space-y-3.5 text-left text-xs sm:text-[13px] font-medium text-zinc-700 mb-8 border-t border-zinc-100 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border border-zinc-300 flex items-center justify-center flex-none text-zinc-500">
                  <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <span><strong>Last 25 clips</strong> clipboard history</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border border-zinc-300 flex items-center justify-center flex-none text-zinc-500">
                  <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <span><strong>5 min/day</strong> local Whisper voice dictation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border border-zinc-300 flex items-center justify-center flex-none text-zinc-500">
                  <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <span>Standard floating top notch HUD</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border border-zinc-300 flex items-center justify-center flex-none text-zinc-500">
                  <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <span>Basic search & instant paste history</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-4 h-4 rounded-full border border-zinc-200 flex items-center justify-center flex-none text-zinc-300">
                  <span className="text-[10px] leading-none">✕</span>
                </div>
                <span className="line-through">Notch Stash shelf & custom categories</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-4 h-4 rounded-full border border-zinc-200 flex items-center justify-center flex-none text-zinc-300">
                  <span className="text-[10px] leading-none">✕</span>
                </div>
                <span className="line-through">Unlimited voice speech, AI voices & models</span>
              </div>
            </div>
          </div>

          {/* Download Community Button */}
          <div>
            <a 
              href="/DopeNotch.dmg"
              download="DopeNotch.dmg"
              onClick={() => openInstallGuideModal(true)}
              className="w-full py-4 rounded-[18px] sm:rounded-[20px] text-sm font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-black/5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
            >
              <AppleLogo className="w-4 h-4 text-zinc-900" />
              <span>Download Community Free (.dmg)</span>
            </a>
            <p className="text-[11px] sm:text-[11.5px] text-zinc-500 mt-2.5 text-center leading-relaxed">
              First launch on macOS: Right-click in Applications → Open, or allow in Privacy &amp; Security.{' '}
              <button
                type="button"
                onClick={() => openInstallGuideModal(false)}
                className="text-zinc-900 hover:text-amber-600 underline underline-offset-2 font-semibold transition-colors cursor-pointer"
              >
                [See 10-sec Install Steps →]
              </button>
            </p>
          </div>

        </div>

        {/* ─── TIER 2: SIGNATURE NOTCHED PRO LIFETIME CARD ─────────────────── */}
        <div className="bg-[#f7f7f7] rounded-[40px] shadow-[0_25px_70px_rgba(0,0,0,0.14)] p-8 sm:p-10 text-black flex flex-col justify-between border-2 border-amber-500/20 relative">
          
          {/* Card's Top Hardware Notch with Smooth Concave Ears */}
          <div className="absolute top-0 inset-x-0 flex justify-center z-20 pointer-events-none">
            <div className="relative bg-black text-white h-10 sm:h-11 px-5 sm:px-6 rounded-b-[20px] sm:rounded-b-[22px] flex items-center justify-center gap-2.5 shadow-md flex-none">
              
              {/* Left smooth concave ear */}
              <div className="absolute top-0 -left-[23px] w-6 h-6 overflow-visible pointer-events-none">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-black block" style={{ transform: 'scaleX(-1)', shapeRendering: 'geometricPrecision' }} aria-hidden="true">
                  <path d="M 0 0 L 24 0 C 10 0 0 10 0 24 Z" />
                </svg>
              </div>

              {/* Icon & Label */}
              <div className="w-5 h-5 rounded-[6px] bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-black text-black shadow-xs flex-none">
                ⚡
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold tracking-tight text-white whitespace-nowrap">
                DopeNotch Pro — Lifetime
              </span>

              {/* Right smooth concave ear */}
              <div className="absolute top-0 -right-[23px] w-6 h-6 overflow-visible pointer-events-none">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-black block" style={{ shapeRendering: 'geometricPrecision' }} aria-hidden="true">
                  <path d="M 0 0 L 24 0 C 10 0 0 10 0 24 Z" />
                </svg>
              </div>

            </div>
          </div>

          <div>
            {/* Big Price Display ($15 Standard or $24 Forever Updates) */}
            <div className="mt-9 sm:mt-10 mb-2 flex items-baseline justify-center gap-3">
              <span className="text-6xl sm:text-7xl font-bold text-[#111113] tracking-tight">{currentPlan.price}</span>
              <span className="text-3xl font-normal text-zinc-300 line-through tracking-normal">{currentPlan.oldPrice}</span>
              <span className="text-xs font-semibold text-zinc-500">one-time</span>
            </div>
            <p className="text-xs font-medium text-zinc-500 mb-5">
              {currentPlan.badge}
            </p>

            {/* Optional Forever Updates Add-on Toggle Card */}
            <button
              type="button"
              onClick={() => setForeverUpdates((prev) => !prev)}
              className={`w-full p-3.5 sm:p-4 rounded-[16px] border mb-6 text-left flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer ${
                foreverUpdates
                  ? 'bg-amber-50/90 border-amber-500/50 shadow-sm'
                  : 'bg-white border-black/[0.06] hover:border-black/15 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-[7px] flex items-center justify-center flex-none transition-colors ${
                    foreverUpdates
                      ? 'bg-amber-500 text-white'
                      : 'bg-zinc-100 border border-zinc-300 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-[13px] font-bold text-zinc-900">
                      Add Forever Updates Pass
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700">
                      +$9
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Unlock all future major versions (v1.0, v2.0+) & upcoming roadmap features forever.
                  </p>
                </div>
              </div>
              <Sparkles className={`w-4 h-4 flex-none ${foreverUpdates ? 'text-amber-500' : 'text-zinc-300'}`} />
            </button>

            {/* Feature Checklist with Rounded Check Circles */}
            <div className="w-full space-y-3.5 text-left text-xs sm:text-[13px] font-medium text-zinc-700 mb-8">
              {[
                'Unlimited clipboard, Stash shelf & voice history',
                'Unlimited offline Whisper & local AI assistant',
                'Natural human AI voice responses (Nova & Leo)',
                currentPlan.updateFeature,
                'Multi-device licenses selectable in Polar checkout',
                '14-day money-back guarantee',
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-amber-500/40 bg-amber-50 flex items-center justify-center flex-none text-amber-600">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Download Pro for macOS Button */}
          <div>
            <a 
              href={currentPlan.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-[18px] sm:rounded-[20px] text-sm font-semibold bg-black text-white hover:bg-zinc-800 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-lg flex items-center justify-center gap-2.5 mt-4"
            >
              <AppleLogo className="w-4 h-4 text-white" />
              <span>{currentPlan.buttonText}</span>
            </a>
            <p className="text-[11.5px] text-zinc-500 mt-2.5 text-center">
              Already purchased? Download the{' '}
              <a
                href="/DopeNotch.dmg"
                download="DopeNotch.dmg"
                onClick={() => openInstallGuideModal(true)}
                className="text-zinc-800 underline underline-offset-2 font-medium"
              >
                macOS DMG
              </a>{' '}
              &amp;{' '}
              <button
                type="button"
                onClick={() => openInstallGuideModal(false)}
                className="text-zinc-900 hover:text-amber-600 underline underline-offset-2 font-semibold cursor-pointer"
              >
                [See 10-sec Install Steps →]
              </button>
            </p>
          </div>

        </div>

      </div>

      {/* ─── SUB-FOOTER REASSURANCE TEXT (1:1 SUPASTE) ─────────────────────── */}
      <p className="text-[12px] sm:text-[13px] text-zinc-500 text-center max-w-md mx-auto mt-10 relative z-10 leading-relaxed font-normal flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-zinc-400 flex-none" />
        <span>Secure checkout by Polar.sh. Choose device seats or upgrade options directly at checkout.</span>
      </p>

    </section>
  );
};
