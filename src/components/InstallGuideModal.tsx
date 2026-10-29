import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, ExternalLink, CheckCircle2, FolderOpen } from 'lucide-react';
import { AppleLogo } from './AppleLogo';

export function openInstallGuideModal(fromDownload: boolean = false) {
  window.dispatchEvent(
    new CustomEvent('dopenotch:open-install-guide', { detail: { fromDownload } })
  );
}

export const InstallGuideModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sequoia' | 'rightclick'>('sequoia');

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn select-none"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-[#141518] text-white border border-white/12 shadow-[0_30px_90px_rgba(0,0,0,0.75)] p-6 sm:p-8 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close installation guide"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4">
          <AppleLogo className="w-3.5 h-3.5 text-amber-300" />
          <span>
            {isDownloading
              ? 'Downloading DopeNotch.dmg (v0.4.1 Universal) — 10-Second Setup Guide'
              : 'macOS First-Launch Setup Guide (10 Seconds)'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          How to open DopeNotch AI on your Mac
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-5">
          Follow these quick steps the first time you launch DopeNotch AI from your Applications folder.
        </p>

        {/* Genuine, Non-Intrusive Trust & Safety Reassurance Box */}
        <div className="rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/25 p-4 mb-6 flex items-start gap-3.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-none mt-0.5" />
          <div className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
            <strong className="text-white block mb-0.5">
              Why does macOS ask for confirmation on first launch?
            </strong>
            DopeNotch AI is an independent, 100% offline-first macOS app distributed directly from our website while our Apple Developer ID notarization is being finalized. All Whisper voice transcription and clipboard history stay locally on your Mac with zero cloud telemetry. Once you approve the first launch below, macOS remembers your choice permanently.
          </div>
        </div>

        {/* STEP 1: Drag to Applications */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 mb-4">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold text-xs flex items-center justify-center flex-none">
              1
            </span>
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Drag DopeNotch AI to your Applications folder</span>
            </h4>
          </div>
          <p className="text-xs sm:text-[13px] text-zinc-400 pl-8 leading-relaxed">
            Open the downloaded <code className="text-zinc-200 bg-black/50 px-1.5 py-0.5 rounded">DopeNotch.dmg</code> file and drag <strong>DopeNotch AI.app</strong> into <strong>Applications</strong>. Always open the app from inside your Applications folder rather than from the disk image.
          </p>
        </div>

        {/* STEP 2: Method Switcher (2A Right-Click vs 2B Privacy & Security) */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold text-xs flex items-center justify-center flex-none">
                2
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white">
                Approve First Launch (Choose your macOS version)
              </h4>
            </div>

            <div className="inline-flex rounded-xl bg-black/60 p-1 border border-white/10 self-start">
              <button
                type="button"
                onClick={() => setActiveTab('rightclick')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'rightclick'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Method 2A: Right-Click Open
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sequoia')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'sequoia'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Method 2B: Privacy &amp; Security
              </button>
            </div>
          </div>

          {activeTab === 'rightclick' ? (
            <div className="space-y-3 pl-1 sm:pl-8 text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
              <p className="text-zinc-300">
                <strong className="text-white">Fastest on macOS Sonoma (14) &amp; Ventura (13):</strong>
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-zinc-300">
                <li>
                  Open Finder and go to your <strong>Applications</strong> folder.
                </li>
                <li>
                  <strong>Right-Click (or Control-Click)</strong> directly on <strong>DopeNotch AI.app</strong> and select <strong>Open</strong> from the menu.
                </li>
                <li>
                  Click <strong>Open</strong> in the confirmation dialog. (If you are on macOS Sequoia 15+ and only see a <em>“Done”</em> button, click <strong>Done</strong> and switch to <strong>Method 2B: Privacy &amp; Security</strong>).
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-4 pl-1 sm:pl-2">
              <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                <strong className="text-white">Standard on macOS Sequoia (15+) &amp; Sonoma:</strong> When macOS shows the initial <em>“Not Opened”</em> prompt, click <strong>Done</strong>, then approve it in <strong>System Settings → Privacy &amp; Security</strong>:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Card A: Click Done */}
                <div className="rounded-xl bg-black/50 border border-white/10 p-3 flex flex-col justify-between">
                  <div className="text-xs text-zinc-300 mb-2">
                    <strong className="text-amber-400">Step A:</strong> Click <strong>Done</strong> on the initial unverified developer prompt (do not click Move to Trash).
                  </div>
                  <img
                    src="/install/mac/images/blocked.png"
                    alt="macOS unverified app dialog showing the Done button"
                    className="rounded-lg border border-white/10 max-h-40 w-auto mx-auto object-contain"
                  />
                </div>

                {/* Card B: Privacy & Security -> Open Anyway */}
                <div className="rounded-xl bg-black/50 border border-white/10 p-3 flex flex-col justify-between">
                  <div className="text-xs text-zinc-300 mb-2">
                    <strong className="text-amber-400">Step B:</strong> Open <strong>System Settings → Privacy &amp; Security</strong>, scroll down to Security, and click <strong>Open Anyway</strong>.
                  </div>
                  <img
                    src="/install/mac/images/privacy-security.png"
                    alt="macOS Privacy and Security settings showing the Open Anyway button"
                    className="rounded-lg border border-white/10 max-h-40 w-auto mx-auto object-contain"
                  />
                </div>

                {/* Card C: Confirm Open Anyway */}
                <div className="rounded-xl bg-black/50 border border-white/10 p-3 flex flex-col justify-between">
                  <div className="text-xs text-zinc-300 mb-2">
                    <strong className="text-amber-400">Step C:</strong> Choose <strong>Open Anyway</strong> in the confirmation sheet.
                  </div>
                  <img
                    src="/install/mac/images/confirm.png"
                    alt="macOS confirmation dialog with Open Anyway button"
                    className="rounded-lg border border-white/10 max-h-40 w-auto mx-auto object-contain"
                  />
                </div>

                {/* Card D: Touch ID / Password */}
                <div className="rounded-xl bg-black/50 border border-white/10 p-3 flex flex-col justify-between">
                  <div className="text-xs text-zinc-300 mb-2">
                    <strong className="text-amber-400">Step D:</strong> Confirm with Touch ID or your Mac password in the system prompt.
                  </div>
                  <img
                    src="/install/mac/images/authenticate.png"
                    alt="macOS Touch ID or password authentication dialog"
                    className="rounded-lg border border-white/10 max-h-40 w-auto mx-auto object-contain"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">
                Note: The example screenshots above illustrate the standard macOS Privacy &amp; Security approval flow on macOS 15.
              </p>
            </div>
          )}
        </div>

        {/* Footer with Full Guide Link & Got It Button */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/apps/dopenotch/install/mac/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 underline underline-offset-4"
            >
              <span>Open Web Setup Guide</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="/apps/dopenotch/install/mac/READ%20FIRST%20%E2%80%94%20How%20to%20Open%20DopeNotch%20AI.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white font-semibold inline-flex items-center gap-1 underline underline-offset-4"
            >
              <span>Preview PDF Guide (Also included inside .dmg)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Got it, thanks!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
