import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { AppleLogo } from './AppleLogo';

export const Pricing: React.FC = () => {
  const [devices, setDevices] = useState<1 | 2 | 3>(1);

  const priceMap = {
    1: {
      price: '$15',
      oldPrice: '$29',
      license: '1 device license',
      checkoutUrl: 'https://buy.polar.sh/polar_cl_fby6JW0hZacNedJuyHKQoi5m834UHFEwb9jUk1yBbMp',
    },
    2: {
      price: '$24',
      oldPrice: '$49',
      license: '2 devices license',
      checkoutUrl: 'https://buy.polar.sh/polar_cl_Vo7H00kWSn6lc0gMQLS3RETsL2sva2tE3kwhP1SRGR0',
    },
    3: {
      price: '$29',
      oldPrice: '$59',
      license: '3 devices license',
      checkoutUrl: 'https://buy.polar.sh/polar_cl_soQ0nPqahzBwvw9vdsyUEqbVPiMPj5hYPUgtX0CTdjG',
    },
  };

  const current = priceMap[devices];

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
          Lifetime access.
        </h2>
        <p className="text-[#3a3a3c] text-sm sm:text-base font-medium mb-3 leading-relaxed">
          Start for free with Community Edition, or unlock full lifetime powers with Pro.
        </p>
        <p className="text-[#6e6e73] text-xs max-w-lg mx-auto leading-relaxed font-normal">
          One-time payment for Pro. No monthly subscriptions. 14-day money-back guarantee.
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
              <span>Free Community Edition</span>
            </div>

            {/* Price Header */}
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-6xl sm:text-7xl font-bold text-[#111113] tracking-tight">$0</span>
              <span className="text-sm font-semibold text-zinc-500">/ forever</span>
            </div>
            <p className="text-xs text-zinc-500 mb-8 max-w-xs mx-auto">
              Essential on-device voice & clipboard utility for casual everyday use.
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
                <span><strong>5 min/day</strong> Whisper voice dictation</span>
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
                <span>Basic search & paste history</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-4 h-4 rounded-full border border-zinc-200 flex items-center justify-center flex-none text-zinc-300">
                  <span className="text-[10px] leading-none">✕</span>
                </div>
                <span className="line-through">Custom categories & shelf pinning</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-4 h-4 rounded-full border border-zinc-200 flex items-center justify-center flex-none text-zinc-300">
                  <span className="text-[10px] leading-none">✕</span>
                </div>
                <span className="line-through">Unlimited voice speech & models</span>
              </div>
            </div>
          </div>

          {/* Download Community Button */}
          <a 
            href="#download"
            className="w-full py-4 rounded-[18px] sm:rounded-[20px] text-sm font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-black/5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
          >
            <AppleLogo className="w-4 h-4 text-zinc-900" />
            <span>Download Community Free</span>
          </a>

        </div>

        {/* ─── TIER 2: SIGNATURE NOTCHED PRO LIFETIME CARD ─────────────────── */}
        <div className="bg-[#f7f7f7] rounded-[40px] shadow-[0_25px_70px_rgba(0,0,0,0.14)] p-8 sm:p-10 text-black flex flex-col justify-between border-2 border-amber-500/20 relative">
          
          {/* Card's Top Hardware Notch with Seamless Concave Ears (100% Mathematically Centered) */}
          <div className="absolute top-0 inset-x-0 flex justify-center z-20 pointer-events-none">
            <div className="relative bg-black text-white h-10 sm:h-11 px-5 sm:px-6 rounded-b-[18px] sm:rounded-b-[20px] flex items-center justify-center gap-2.5 shadow-md flex-none">
              
              {/* Left concave ear */}
              <div className="absolute top-0 -left-[19.5px] w-5 h-5 overflow-visible pointer-events-none">
                <svg viewBox="0 0 20 20" className="w-5 h-5 fill-black" style={{ transform: 'scaleX(-1)' }} aria-hidden="true">
                  <path d="M 0 0 L 20 0 C 8.954 0 0 8.954 0 20 Z" />
                </svg>
              </div>

              {/* Icon & Label */}
              <div className="w-5 h-5 rounded-[6px] bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-black text-black shadow-xs flex-none">
                ⚡
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold tracking-tight text-white whitespace-nowrap">
                DopeNotch Pro for macOS
              </span>

              {/* Right concave ear */}
              <div className="absolute top-0 -right-[19.5px] w-5 h-5 overflow-visible pointer-events-none">
                <svg viewBox="0 0 20 20" className="w-5 h-5 fill-black" aria-hidden="true">
                  <path d="M 0 0 L 20 0 C 8.954 0 0 8.954 0 20 Z" />
                </svg>
              </div>

            </div>
          </div>

          <div>
            {/* Device Selector Segmented Control (1:1 Supaste rounded-[14px]) */}
            <div className="w-full grid grid-cols-3 gap-1.5 p-1 rounded-[14px] bg-white border border-black/[0.04] mt-9 sm:mt-10 mb-7 shadow-xs">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => setDevices(num as 1 | 2 | 3)}
                  className={`py-2 rounded-[11px] text-xs font-semibold transition-all duration-200 ${
                    devices === num
                      ? 'bg-black text-white shadow-xs scale-[1.01]'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  {num} {num === 1 ? 'device' : 'devices'}
                </button>
              ))}
            </div>

            {/* Big Price Display ($15 $29) */}
            <div className="flex items-baseline justify-center gap-3 mb-5">
              <span className="text-6xl sm:text-7xl font-bold text-[#111113] tracking-tight">{current.price}</span>
              <span className="text-3xl font-normal text-zinc-300 line-through tracking-normal">{current.oldPrice}</span>
            </div>

            {/* Limited Offer Progress Box (1:1 Supaste White Card) */}
            <div className="w-full p-3.5 sm:p-4 rounded-[16px] bg-white border border-black/[0.04] mb-7 text-left flex flex-col gap-2 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-800">
                <span>Limited offer for early users 🥳</span>
                <span className="text-[11px] text-zinc-500 font-medium font-sans">5 spots left</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#e3e3e3] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#F69E0B] to-[#D97706] rounded-full w-[75%] transition-all duration-500 shadow-xs" />
              </div>
            </div>

            {/* Feature Checklist with Rounded Check Circles */}
            <div className="w-full space-y-3.5 text-left text-xs sm:text-[13px] font-medium text-zinc-700 mb-8">
              {[
                'Unlimited clipboard & audio history',
                'Unlimited on-device Whisper transcription',
                'Notch Shelf, custom categories & tags',
                'Lifetime updates included (no subscription)',
                '14-day money-back guarantee',
                current.license,
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
          <a 
            href={current.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-[18px] sm:rounded-[20px] text-sm font-semibold bg-black text-white hover:bg-zinc-800 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-lg flex items-center justify-center gap-2.5 mt-4"
          >
            <AppleLogo className="w-4 h-4 text-white" />
            <span>Get DopeNotch Pro ({current.price})</span>
          </a>

        </div>

      </div>

      {/* ─── SUB-FOOTER REASSURANCE TEXT (1:1 SUPASTE) ─────────────────────── */}
      <p className="text-[12px] sm:text-[13px] text-zinc-500 text-center max-w-md mx-auto mt-10 relative z-10 leading-relaxed font-normal">
        Secure checkout by Polar.sh, powered by Stripe. Prices are in USD, excluding VAT and may vary by location.
      </p>

    </section>
  );
};
