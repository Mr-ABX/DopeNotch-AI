import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, ExternalLink, CheckCircle2 } from 'lucide-react';
import { AppleLogo } from './AppleLogo';

export function openInstallGuideModal(fromDownload: boolean = false) {
  window.dispatchEvent(
    new CustomEvent('dopenotch:open-install-guide', { detail: { fromDownload } })
  );
}

export const InstallGuideModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ fromDownload?: boolean }>;
      setIsDownloading(Boolean(custom.detail?.fromDownload));
      setIsOpen(true);
    };
    window.addEventListener('dopenotch:open-install-guide', handler);
    return () => window.removeEventListener('dopenotch:open-install-guide', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn select-none"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[24px] bg-[#121317] text-white border border-white/12 shadow-[0_30px_90px_rgba(0,0,0,0.8)] p-5 sm:p-7 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close installation guide"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {isDownloading
              ? 'Downloading DopeNotch.dmg — 100% Safe & Offline-First'
              : '100% Safe & Offline-First · 10-Second Setup'}
          </span>
        </div>

        {/* Title & 1-Line Reassurance */}
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
          How to Open DopeNotch AI (First Launch)
        </h3>
        <p className="text-xs sm:text-[13px] text-zinc-400 leading-snug mb-4">
          DopeNotch runs 100% locally on your Mac. While our Apple notarization is finishing up, do this once:
        </p>

        {/* STEP 1 + 2A ONE-LINERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-extrabold text-xs flex items-center justify-center flex-none">
              1
            </span>
            <p className="text-xs text-zinc-200 leading-snug">
              Drag <strong>DopeNotch</strong> into <strong>Applications</strong>.
            </p>
          </div>

          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-extrabold text-xs flex items-center justify-center flex-none">
              2
            </span>
            <p className="text-xs text-zinc-200 leading-snug">
              <strong>Right-Click</strong> in Applications → click <strong>Open</strong>.
            </p>
          </div>
        </div>

        {/* STEP 2B: 4 Visual Clicks */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5">
          <p className="text-xs text-zinc-300 mb-2.5">
            <AppleLogo className="w-3 h-3 inline mr-1 -mt-0.5 text-amber-400" />
            <strong>On macOS Sequoia:</strong> If a <em>“Not Opened”</em> popup appears, do these 4 clicks:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-black/60 border border-white/10 p-2.5 text-center">
              <div className="text-[11.5px] font-semibold text-white text-left mb-1.5">
                <span className="text-amber-400 font-bold">A.</span> Click <strong>“Done”</strong>
              </div>
              <img
                src="/install/mac/images/blocked.png"
                alt="Click Done"
                className="rounded-lg max-h-32 w-auto mx-auto object-contain"
              />
            </div>

            <div className="rounded-xl bg-black/60 border border-white/10 p-2.5 text-center">
              <div className="text-[11.5px] font-semibold text-white text-left mb-1.5">
                <span className="text-amber-400 font-bold">B.</span> Settings → Privacy → <strong>“Open Anyway”</strong>
              </div>
              <img
                src="/install/mac/images/privacy-security.png"
                alt="Privacy and Security Open Anyway"
                className="rounded-lg max-h-32 w-auto mx-auto object-contain"
              />
            </div>

            <div className="rounded-xl bg-black/60 border border-white/10 p-2.5 text-center">
              <div className="text-[11.5px] font-semibold text-white text-left mb-1.5">
                <span className="text-amber-400 font-bold">C.</span> Click <strong>“Open Anyway”</strong>
              </div>
              <img
                src="/install/mac/images/confirm.png"
                alt="Confirm Open Anyway"
                className="rounded-lg max-h-32 w-auto mx-auto object-contain"
              />
            </div>

            <div className="rounded-xl bg-black/60 border border-white/10 p-2.5 text-center">
              <div className="text-[11.5px] font-semibold text-white text-left mb-1.5">
                <span className="text-amber-400 font-bold">D.</span> Approve with <strong>Touch ID</strong>
              </div>
              <img
                src="/install/mac/images/authenticate.png"
                alt="Approve with Touch ID"
                className="rounded-lg max-h-32 w-auto mx-auto object-contain"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
          <a
            href="/apps/dopenotch/install/mac/READ%20FIRST%20%E2%80%94%20How%20to%20Open%20DopeNotch%20AI.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white font-medium inline-flex items-center gap-1 underline underline-offset-4"
          >
            <span>Open 1-Page PDF Guide (Also inside .dmg)</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Got it!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
