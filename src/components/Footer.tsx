import React, { useState } from 'react';
import { Heart, X, Shield, FileText } from 'lucide-react';
import { AppleLogo } from './AppleLogo';

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);
  return (
    <footer className="relative bg-black text-white pt-0 pb-16 overflow-hidden select-none rounded-t-[36px] sm:rounded-t-[48px]">
      
      {/* 1:1 SMOOTH NOTCH SEPARATOR MATCHING HEADER NOTCH GEOMETRY */}
      <div className="relative w-full h-11 sm:h-12 flex justify-center items-start overflow-visible pointer-events-none select-none -top-px">
        {/* The white top notch that hangs down into the black footer, flanked by two smooth white ears */}
        <div className="relative flex items-start w-[84%] sm:w-[78%] md:w-[72%] lg:w-[66%] max-w-5xl justify-center pointer-events-auto">
          
          {/* Left White Ear (Smooth Continuous Apple Concave Curve) */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex-none relative overflow-visible -mr-[1px]">
            <svg 
              viewBox="0 0 28 28" 
              className="w-full h-full fill-white flex-none block" 
              style={{ transform: 'scaleX(-1)', shapeRendering: 'geometricPrecision' }}
              aria-hidden="true"
            >
              <path d="M 0 0 L 28 0 C 11.5 0 0 11.5 0 28 Z" />
            </svg>
          </div>

          {/* Center White Notch Body hanging down into black footer */}
          <div className="flex-1 bg-white h-10 sm:h-11 rounded-b-[22px] sm:rounded-b-[24px]"></div>

          {/* Right White Ear (Smooth Continuous Apple Concave Curve) */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex-none relative overflow-visible -ml-[1px]">
            <svg 
              viewBox="0 0 28 28" 
              className="w-full h-full fill-white flex-none block" 
              style={{ shapeRendering: 'geometricPrecision' }}
              aria-hidden="true"
            >
              <path d="M 0 0 L 28 0 C 11.5 0 0 11.5 0 28 Z" />
            </svg>
          </div>

        </div>
      </div>

      {/* Main Footer Container */}
      <div className="max-w-6xl mx-auto px-6 pt-12 sm:pt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-16">
          
          {/* Left Column (Logo, Headline, Description, Download Button) */}
          <div className="lg:col-span-6 flex flex-col items-start gap-5">
            {/* Direct Transparent Squircle Logo - Bigger, No Container Box */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="DopeNotch" 
                className="w-10 h-10 object-contain drop-shadow-md" 
              />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-base text-white tracking-tight">DopeNotch</span>
                <span className="text-[11px] text-zinc-500">macOS app</span>
              </div>
            </div>

            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Speak once.<br />
              <span className="font-serif-italic font-normal text-white">
                Reuse anytime.
              </span>
            </h3>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed">
              DopeNotch saves your on-device Whisper voice dictations and clipboard in a beautiful visual history, automatically grouped by type, app, and custom categories, so you can search, find, and paste anything back in seconds.
            </p>

            <a 
              href="#pricing"
              className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-amber-400 transition-all hover:scale-105 active:scale-95 shadow-xl w-fit"
            >
              <AppleLogo className="w-4 h-4 text-black" />
              <span>Download for macOS</span>
            </a>

            {/* Creator Profile Badge: Abdulrahman-T */}
            <a 
              href="https://x.com/Mr_AbdulrahmanT" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 transition-all group w-fit"
            >
              <img 
                src="/abdulrahman.jpg" 
                alt="Abdulrahman-T" 
                className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20 group-hover:ring-amber-400 transition-all" 
              />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-zinc-400 leading-tight">Crafted by</span>
                <span className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1">
                  Abdulrahman-T
                  <svg className="w-3 h-3 fill-current text-zinc-400 group-hover:text-amber-400 ml-0.5" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </span>
              </div>
            </a>

            <div className="text-[11px] text-zinc-500 pt-2">
              <p>© {new Date().getFullYear()} DopeNotch.com - All rights reserved</p>
              <p className="flex items-center gap-1 mt-1 text-zinc-400">
                Built with <Heart className="w-3 h-3 text-amber-500 fill-amber-500 inline" /> by Abdulrahman-T
              </p>
            </div>
          </div>

          {/* Right Columns: Menu, Navigation, More products (1:1 Screenshot 1) */}
          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            
            {/* Column 1: Menu */}
            <div className="flex flex-col gap-3">
              <span className="font-bold text-white text-xs uppercase tracking-wider">Menu</span>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Home</a>
              <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</a>
              <a href="#faq" className="text-zinc-400 hover:text-white transition-colors">FAQ</a>
              <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</a>
              <a href="#workflows" className="text-zinc-400 hover:text-white transition-colors">Updates</a>
            </div>

            {/* Column 2: Navigation */}
            <div className="flex flex-col gap-3">
              <span className="font-bold text-white text-xs uppercase tracking-wider">Navigation</span>
              <a href="mailto:support@dopenotch.com" className="text-zinc-400 hover:text-white transition-colors">Contact</a>
              <a href="#faq" className="text-zinc-400 hover:text-white transition-colors">Roadmap</a>
              <button 
                type="button" 
                onClick={() => setActiveModal('privacy')} 
                className="text-left text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Privacy policy
              </button>
              <button 
                type="button" 
                onClick={() => setActiveModal('terms')} 
                className="text-left text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Terms of service
              </button>
              <a 
                href="https://polar.sh/purchases" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Customer portal</span>
                <span className="text-[10px] text-zinc-500">↗</span>
              </a>
            </div>

            {/* Column 3: More Products */}
            <div className="flex flex-col gap-3">
              <span className="font-bold text-white text-xs uppercase tracking-wider">More products</span>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Screen Movie</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Cooldock</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Macapp.Supply</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Runey.app</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Revone.app</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Icoon.co</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Selected.site</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Supaframe.io</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Frameblox.com</a>
            </div>

          </div>

        </div>
      </div>

      {/* GIGANTIC SUBTLE WATERMARK LOGO AT BOTTOM (1:1 Supaste Style) */}
      <div className="w-full flex justify-center overflow-hidden select-none pointer-events-none -mb-10 sm:-mb-16">
        <span className="text-[14vw] font-black text-[#1f1f23] tracking-tighter leading-none select-none">
          DopeNotch
        </span>
      </div>

      {/* ─── LEGAL / POLICY MODAL (PRIVACY & TERMS) ────────────────────────── */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-text"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="w-full max-w-xl max-h-[85vh] bg-[#161619] border border-white/15 rounded-[28px] shadow-2xl overflow-hidden flex flex-col text-left text-zinc-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {activeModal === 'privacy' ? (
                  <Shield className="w-5 h-5 text-amber-400" />
                ) : (
                  <FileText className="w-5 h-5 text-amber-400" />
                )}
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {activeModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-zinc-300">
              {activeModal === 'privacy' ? (
                <>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">1. 100% On-Device Whisper Dictation</h4>
                    <p className="text-zinc-400">
                      By default, all microphone recording and voice-to-text transcription run entirely on your local Mac using embedded Whisper models. Your spoken audio never leaves your machine.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">2. Password Manager & Sensitive Content Protection</h4>
                    <p className="text-zinc-400">
                      DopeNotch inspects native macOS pasteboard types and automatically rejects concealed or transient tokens copied from 1Password, Bitwarden, Apple Passwords, Keychain, and KeePass. Passwords are never stored in history.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">3. Local File Storage</h4>
                    <p className="text-zinc-400">
                      All clipboard history, voice notes, and custom extensions reside in your local <code className="text-amber-300 font-mono">~/Documents/DopeNotch/</code> directory under your complete control. You can change this path or delete your database at any time.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">4. Optional Cloud Providers</h4>
                    <p className="text-zinc-400">
                      If you choose to use cloud AI models (Google Gemini, Groq, or OpenAI), you provide your own API key (BYOK). Requests are transmitted directly and securely to the respective provider without passing through any intermediate DopeNotch servers.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">5. Zero Analytics & Telemetry</h4>
                    <p className="text-zinc-400">
                      DopeNotch contains zero tracking scripts, user profiling, or background telemetry.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">1. License Grant & Perpetual Use</h4>
                    <p className="text-zinc-400">
                      Purchasing <strong>DopeNotch Pro Core</strong> grants you a perpetual, non-exclusive license to use the purchased release line (<code className="text-amber-300 font-mono">v0.4.x</code>) forever on your licensed number of Macs, including all bug fixes and security patches.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">2. Forever Updates Pass</h4>
                    <p className="text-zinc-400">
                      Customers who select the optional <strong>Forever Updates Pass</strong> (+9 USD) receive all future major feature releases and major version upgrades (v1.0, v2.0+) with zero recurring subscription fees.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">3. Device Limits & License Activation</h4>
                    <p className="text-zinc-400">
                      Each license key is valid for the number of Macs selected at checkout (1 Mac or 2 Macs). You can manage or transfer your active device seats anytime via the Polar.sh customer portal.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">4. 14-Day Money-Back Guarantee</h4>
                    <p className="text-zinc-400">
                      If DopeNotch does not meet your workflow needs, you can request a 100% full refund within 14 days of purchase through Polar.sh or by contacting <a href="mailto:support@dopenotch.com" className="text-amber-400 underline">support@dopenotch.com</a>.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white/[0.03] border-t border-white/10 flex items-center justify-between text-xs text-zinc-500">
              <span>Last updated: October 2026</span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-amber-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </footer>
  );
};
