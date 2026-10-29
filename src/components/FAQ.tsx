import React, { useState } from 'react';
import { Plus, Minus, ExternalLink } from 'lucide-react';
import { openInstallGuideModal } from './InstallGuideModal';

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const leftColumnFaqs: Array<{ q: string; a: string; hasInstallModalBtn?: boolean }> = [
    {
      q: 'What is DopeNotch?',
      a: 'DopeNotch is an ultra-fast on-device speech-to-text dictation and clipboard shelf for macOS. It merges on-device Whisper AI with a hardware-anchored dynamic notch shelf, letting you dictate anywhere and access copied clips with zero mandatory cloud dependencies.'
    },
    {
      q: 'Is my data private and kept on my device?',
      a: 'Yes. DopeNotch is built with an offline-first architecture. Your clipboard items, voice recordings, and shelf snippets are stored locally on your Mac (`~/Documents/DopeNotch` and `~/Library/Application Support/com.dopenotch.ai`). We do not track, collect, or send your data to any cloud analytics servers.'
    },
    {
      q: 'Where is my clipboard history stored?',
      a: 'Your workspace files, notes, and stashed assets live in `~/Documents/DopeNotch` (customizable in Preferences), and app settings and local models are stored in `~/Library/Application Support/com.dopenotch.ai`.'
    },
    {
      q: 'Does DopeNotch upload my audio or text to the cloud?',
      a: 'By default, never. All Whisper speech recognition and clipboard processing run 100% locally on your Mac. If you optionally connect your own cloud API key (Google Gemini, OpenAI, Grok, or OpenRouter), requests are sent directly from your Mac to that provider using your key.'
    },
    {
      q: 'What types of content does DopeNotch support?',
      a: 'DopeNotch supports voice recordings, rich text, code snippets with syntax detection, colors/hex codes, URLs, screenshots, images with OCR text extraction, and file attachments.'
    },
    {
      q: 'Can I search my clipboard history?',
      a: 'Yes. With instant fuzzy search and global shortcuts, you can search previous clips, voice memos, and code snippets in milliseconds using keywords or app filters.'
    }
  ];

  const rightColumnFaqs: Array<{ q: string; a: string; hasInstallModalBtn?: boolean }> = [
    {
      q: 'Can DopeNotch detect sensitive content?',
      a: 'Yes. DopeNotch respects macOS confidential pasteboard markers. Sensitive passwords and transient clips copied from password managers like 1Password, Bitwarden, KeePassXC, and Apple Keychain are automatically filtered out from your clipboard history.'
    },
    {
      q: 'What plans and licenses are available?',
      a: 'We offer Community Free ($0 forever, last 25 clips & 50 local dictations/day), DopeNotch Pro Core ($15 one-time for 1 Mac to keep the current v0.4.x release forever with bug fixes and security patches), and DopeNotch Pro with Forever Updates ($24 for 1 Mac or $39 for 2 Macs, including all future major versions).'
    },
    {
      q: "macOS says 'DopeNotch AI Not Opened' — how do I launch it the first time?",
      a: 'DopeNotch AI is 100% safe, offline-first software. Because we are an independent macOS studio and our official Apple Developer ID notarization is currently being finalized, macOS shows a standard first-launch notice for direct web downloads. Simply drag DopeNotch AI to Applications, then either Right-Click → Open, or click "Open Anyway" in System Settings → Privacy & Security (takes 10 seconds, once only).',
      hasInstallModalBtn: true
    },
    {
      q: 'Does DopeNotch include screenshot history?',
      a: 'Yes! Screenshots taken on your Mac are automatically organized in the Notch Shelf with built-in instant image preview, OCR text recognition, and quick drag-and-drop sharing.'
    },
    {
      q: 'Is DopeNotch a subscription?',
      a: 'No. All DopeNotch Pro options are one-time payments with no recurring subscription fees. You own your license forever.'
    },
    {
      q: 'How do I activate the app after purchase?',
      a: 'Immediately upon checkout via Polar, your license key is delivered instantly via email. Enter your key in DopeNotch Preferences > License to activate your Pro features in seconds.'
    }
  ];

  const allFaqs = [
    ...leftColumnFaqs.map((f, i) => ({ ...f, id: i * 2 })),
    ...rightColumnFaqs.map((f, i) => ({ ...f, id: i * 2 + 1 }))
  ].sort((a, b) => a.id - b.id);

  const toggleItem = (id: number) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <section id="faq" className="bg-white text-black py-24 sm:py-32 px-4 flex flex-col items-center select-none">
      
      {/* ─── 1:1 SECTION HEADER (SUPASTE STYLE) ─────────────────────────── */}
      <div className="max-w-3xl mx-auto text-center mb-14">
        <h2 className="text-5xl sm:text-6xl font-black tracking-tight text-black mb-4">
          Frequently Asked<br />Questions
        </h2>
        <p className="text-zinc-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-normal">
          Everything you need to know before getting started with DopeNotch, from privacy and compatibility to how your voice dictations and clipboard history are stored and handled.
        </p>
      </div>

      {/* ─── 1:1 2-COLUMN FAQ PILL GRID (SUPASTE STYLE) ───────────────────── */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-3.5">
          {leftColumnFaqs.map((item, idx) => {
            const itemId = idx * 2;
            const isOpen = openIndex === itemId;
            return (
              <div
                key={itemId}
                className={`rounded-2xl transition-all duration-200 border border-black/5 overflow-hidden ${
                  isOpen ? 'bg-[#f0f0f2] shadow-sm' : 'bg-[#f5f5f7] hover:bg-[#ededf0]'
                }`}
              >
                <button
                  onClick={() => toggleItem(itemId)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white border border-black/10 flex items-center justify-center flex-none text-zinc-600 group-hover:text-black transition-colors shadow-xs">
                      {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-black">
                      {item.q}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-zinc-600 leading-relaxed pl-12 border-t border-black/5">
                    <p>{item.a}</p>
                    {Boolean(item.hasInstallModalBtn) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => openInstallGuideModal(false)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-zinc-800 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                        >
                          <span>See 10-sec Visual Install Steps →</span>
                        </button>
                        <a
                          href="/apps/dopenotch/install/mac/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-black underline underline-offset-2"
                        >
                          <span>Full Printable Guide</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-3.5">
          {rightColumnFaqs.map((item, idx) => {
            const itemId = idx * 2 + 1;
            const isOpen = openIndex === itemId;
            return (
              <div
                key={itemId}
                className={`rounded-2xl transition-all duration-200 border border-black/5 overflow-hidden ${
                  isOpen ? 'bg-[#f0f0f2] shadow-sm' : 'bg-[#f5f5f7] hover:bg-[#ededf0]'
                }`}
              >
                <button
                  onClick={() => toggleItem(itemId)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white border border-black/10 flex items-center justify-center flex-none text-zinc-600 group-hover:text-black transition-colors shadow-xs">
                      {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-black">
                      {item.q}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-zinc-600 leading-relaxed pl-12 border-t border-black/5">
                    <p>{item.a}</p>
                    {Boolean(item.hasInstallModalBtn) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => openInstallGuideModal(false)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-zinc-800 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                        >
                          <span>See 10-sec Visual Install Steps →</span>
                        </button>
                        <a
                          href="/apps/dopenotch/install/mac/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-black underline underline-offset-2"
                        >
                          <span>Full Printable Guide</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </section>
  );
};
