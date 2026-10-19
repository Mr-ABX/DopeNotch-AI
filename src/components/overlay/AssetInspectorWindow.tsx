import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Image as ImageIcon,
  Palette,
  Type,
  Globe,
  ExternalLink,
  Download,
  Copy,
  Check,
  X,
  Minus,
  RefreshCw,
  FolderOpen,
  Sparkles,
  FileCode,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface WebInspectionResult {
  url: string;
  title: string;
  description: string;
  og_image: string | null;
  favicon: string | null;
  colors: string[];
  images: string[];
  svgs: string[];
  fonts: string[];
  total_assets_count: number;
}

export const AssetInspectorWindow: React.FC = () => {
  const [data, setData] = useState<WebInspectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'svgs' | 'palette' | 'fonts' | 'meta'>('images');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [downloadingItem, setDownloadingItem] = useState<string | null>(null);
  const [downloadSuccessItem, setDownloadSuccessItem] = useState<string | null>(null);
  const [latestDownloadedPath, setLatestDownloadedPath] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<string>('');

  // Listen for inspection data from backend
  useEffect(() => {
    const unlistenData = listen<WebInspectionResult>('dopenotch://inspector-data', (event) => {
      if (event.payload) {
        setData(event.payload);
        setTargetInput(event.payload.url);
        setIsScanning(false);
      }
    });

    const unlistenStart = listen<string>('dopenotch://inspect-fetching-started', (event) => {
      setIsScanning(true);
      if (event.payload) setTargetInput(event.payload);
    });

    const unlistenDone = listen<WebInspectionResult>('dopenotch://inspect-fetching-done', (event) => {
      setIsScanning(false);
      if (event.payload) {
        setData(event.payload);
        setTargetInput(event.payload.url);
      }
    });

    return () => {
      unlistenData.then((f) => f());
      unlistenStart.then((f) => f());
      unlistenDone.then((f) => f());
    };
  }, []);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => {
      setCopiedItem((prev) => (prev === id ? null : prev));
    }, 2000);
  }, []);

  const handleDownload = useCallback(async (contentOrUrl: string, id: string, isSvg: boolean) => {
    try {
      setDownloadingItem(id);
      const filename = isSvg
        ? `vector_${id.slice(0, 8)}.svg`
        : `image_${id.slice(0, 8)}.png`;

      const savedPath = await invoke<string>('download_asset_to_disk', {
        targetData: contentOrUrl,
        suggestedFilename: filename,
        isSvgContent: isSvg,
      });

      setDownloadingItem(null);
      setDownloadSuccessItem(id);
      setLatestDownloadedPath(savedPath);

      setTimeout(() => {
        setDownloadSuccessItem((prev) => (prev === id ? null : prev));
      }, 3000);
    } catch (err) {
      console.error('Failed to download asset:', err);
      setDownloadingItem(null);
    }
  }, []);

  const handleRevealFinder = useCallback((path: string) => {
    invoke('reveal_path_in_finder', { path });
  }, []);

  const handleRescan = useCallback(async () => {
    const target = targetInput.trim() || 'active';
    setIsScanning(true);
    try {
      const res = await invoke<WebInspectionResult>('inspect_website', { url: target });
      setData(res);
      setTargetInput(res.url);
    } catch (err) {
      console.error('Failed to inspect:', err);
    } finally {
      setIsScanning(false);
    }
  }, [targetInput]);

  const handleSnatchActiveTab = useCallback(async () => {
    setIsScanning(true);
    try {
      const res = await invoke<WebInspectionResult>('inspect_website', { url: 'active' });
      setData(res);
      setTargetInput(res.url);
    } catch (err) {
      console.error('Failed to snatch active browser tab:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleClose = () => {
    invoke('close_inspector_window');
  };

  return (
    <div className="w-screen h-screen bg-[#111114]/98 text-zinc-200 flex flex-col overflow-hidden select-none font-sans border border-white/[0.08] rounded-2xl shadow-2xl backdrop-blur-2xl">
      {/* 1. Header Drag Bar */}
      <header
        data-tauri-drag-region
        className="h-12 px-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#161619]/90 cursor-grab active:cursor-grabbing"
      >
        <div data-tauri-drag-region className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-zinc-100">Asset Inspector</span>

          {data?.url && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-white/[0.08] text-[11px] text-zinc-400 max-w-[280px]">
              {data.favicon ? (
                <img src={data.favicon} alt="" className="w-3.5 h-3.5 rounded shrink-0 object-contain" />
              ) : (
                <Globe className="w-3 h-3 shrink-0 text-zinc-500" />
              )}
              <span className="truncate font-mono">{data.url.replace(/^https?:\/\//, '')}</span>
              <button
                type="button"
                onClick={() => invoke('open_path_in_os', { path: data.url })}
                title="Open in Browser"
                className="hover:text-white transition-colors"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
            </div>
          )}

          {data && (
            <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-mono text-zinc-400">
              {data.total_assets_count} Assets
            </span>
          )}
        </div>

        {/* Tab Switcher in Center */}
        {data && (
          <nav className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'images'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Images</span>
              <span className="text-[10px] font-mono opacity-70">({data.images.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('svgs')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'svgs'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>SVGs</span>
              <span className="text-[10px] font-mono opacity-70">({data.svgs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('palette')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'palette'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Palette</span>
              <span className="text-[10px] font-mono opacity-70">({data.colors.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fonts')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'fonts'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Fonts</span>
              <span className="text-[10px] font-mono opacity-70">({data.fonts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('meta')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'meta'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Overview</span>
            </button>
          </nav>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRescan}
            disabled={isScanning}
            title="Rescan Target"
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleClose}
            title="Minimize"
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            title="Close Inspector"
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Main Content Body */}
      <main className="flex-1 overflow-y-auto custom-slim-scrollbar p-5 relative">
        {isScanning && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-7 h-7 text-zinc-300 animate-spin" />
            <p className="text-xs text-zinc-400 font-mono">Extracting DOM colors, SVGs, images & typography...</p>
          </div>
        )}

        {/* Empty State */}
        {!data && !isScanning && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500">
              <Layers className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-100">No Target Inspected Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Run <code className="text-zinc-200 font-mono">/inspect &lt;url&gt;</code> in the Dynamic Notch or snatch assets from your active browser tab.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSnatchActiveTab}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Snatch Active Tab Assets</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Images Grid */}
        {data && activeTab === 'images' && (
          <div className="space-y-4">
            {data.images.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">No images detected on this page.</div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {data.images.map((imgUrl, idx) => {
                  const id = `img-${idx}`;
                  const isCopied = copiedItem === id;
                  const isDownloading = downloadingItem === id;
                  const isDownloaded = downloadSuccessItem === id;

                  return (
                    <motion.div
                      key={idx}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-[#161619] border border-white/[0.08] hover:border-white/20 rounded-xl overflow-hidden flex flex-col transition-all shadow-sm"
                    >
                      {/* Image Preview Box */}
                      <div className="h-40 w-full bg-black/60 relative flex items-center justify-center overflow-hidden p-2">
                        <img
                          src={imgUrl}
                          alt=""
                          loading="lazy"
                          className="max-h-full max-w-full object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* Card Info & Actions */}
                      <div className="p-2.5 bg-[#141417] border-t border-white/[0.04] flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-zinc-400 truncate flex-1" title={imgUrl}>
                          {imgUrl.split('/').pop()?.split('?')[0] || 'image.png'}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(imgUrl, id)}
                            title="Copy Image URL"
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(imgUrl, id, false)}
                            disabled={isDownloading}
                            title="Download to ~/Documents/DopeNotch/downloads"
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                          >
                            {isDownloaded ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Download className={`w-3 h-3 ${isDownloading ? 'animate-bounce' : ''}`} />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Vector SVGs */}
        {data && activeTab === 'svgs' && (
          <div className="space-y-4">
            {data.svgs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">No vector SVGs detected.</div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {data.svgs.map((svgItem, idx) => {
                  const id = `svg-${idx}`;
                  const isInline = svgItem.startsWith('<svg');
                  const isCopied = copiedItem === id;
                  const isDownloading = downloadingItem === id;
                  const isDownloaded = downloadSuccessItem === id;

                  return (
                    <motion.div
                      key={idx}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-[#161619] border border-white/[0.08] hover:border-white/20 rounded-xl overflow-hidden flex flex-col transition-all shadow-sm"
                    >
                      <div className="h-36 w-full bg-black/60 relative flex items-center justify-center p-4 overflow-hidden">
                        {isInline ? (
                          <div
                            className="w-16 h-16 flex items-center justify-center text-zinc-200 fill-current [&>svg]:w-full [&>svg]:h-full"
                            dangerouslySetInnerHTML={{ __html: svgItem }}
                          />
                        ) : (
                          <img
                            src={svgItem}
                            alt=""
                            className="max-h-full max-w-full object-contain filter invert opacity-80"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>

                      <div className="p-2.5 bg-[#141417] border-t border-white/[0.04] flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-zinc-400 truncate flex-1">
                          {isInline ? `vector_${idx + 1}.svg` : svgItem.split('/').pop() || 'icon.svg'}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(svgItem, id)}
                            title="Copy SVG Code"
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(svgItem, id, isInline)}
                            disabled={isDownloading}
                            title="Download SVG"
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                          >
                            {isDownloaded ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Download className={`w-3 h-3 ${isDownloading ? 'animate-bounce' : ''}`} />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Color Palette */}
        {data && activeTab === 'palette' && (
          <div className="space-y-4">
            {data.colors.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">No color swatches extracted.</div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {data.colors.map((hex, idx) => {
                  const id = `col-${idx}`;
                  const isCopied = copiedItem === id;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCopy(hex, id)}
                      className="group p-3 rounded-xl bg-[#161619] border border-white/[0.08] hover:border-white/20 flex items-center gap-3 transition-all text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-lg border border-white/20 shrink-0 shadow-inner"
                        style={{ backgroundColor: hex }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-mono font-semibold text-zinc-200 group-hover:text-white uppercase">
                          {hex}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {isCopied ? 'Copied!' : 'Click to copy'}
                        </div>
                      </div>
                      {isCopied && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Typography */}
        {data && activeTab === 'fonts' && (
          <div className="space-y-4">
            {data.fonts.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">No custom fonts detected.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {data.fonts.map((font, idx) => {
                  const id = `font-${idx}`;
                  const isCopied = copiedItem === id;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#161619] border border-white/[0.08] flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-zinc-100 block truncate" style={{ fontFamily: font }}>
                          {font}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">font-family: "{font}"</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(font, id)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
                      >
                        {isCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Overview & Meta */}
        {data && activeTab === 'meta' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="p-5 rounded-2xl bg-[#161619] border border-white/[0.08] space-y-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Page Title</span>
                <h2 className="text-base font-semibold text-zinc-100">{data.title || 'Untitled'}</h2>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Meta Description</span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {data.description || 'No meta description tag provided.'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Source Target</span>
                <p className="text-xs font-mono text-zinc-400 break-all">{data.url}</p>
              </div>

              {data.og_image && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">OpenGraph Preview</span>
                  <div className="mt-1 rounded-xl overflow-hidden border border-white/10 max-h-56 bg-black/50">
                    <img src={data.og_image} alt="OpenGraph" className="w-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Toast / Download Status */}
      <AnimatePresence>
        {latestDownloadedPath && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs z-50"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-3 h-3" />
            </div>
            <span className="text-zinc-200">
              Saved to <code className="font-mono text-zinc-400">~/Documents/DopeNotch/downloads/</code>
            </span>
            <button
              type="button"
              onClick={() => handleRevealFinder(latestDownloadedPath)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Reveal</span>
            </button>
            <button
              type="button"
              onClick={() => setLatestDownloadedPath(null)}
              className="text-zinc-500 hover:text-zinc-300 ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
