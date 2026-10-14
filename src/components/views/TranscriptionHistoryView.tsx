import React, { useState } from 'react';
import {
  History,
  Search,
  Copy,
  Check,
  Trash2,
  FileText,
  Mic,
  Pin,
  Code2,
  ExternalLink,
  Palette,
} from 'lucide-react';
import { useAppStore, ClipboardItem } from '../../stores/appStore';

export const TranscriptionHistoryView: React.FC = () => {
  const {
    historyRecords,
    clearHistory,
    clipboardItems,
    togglePinClipboardItem,
    deleteClipboardItem,
    clearClipboardItems,
  } = useAppStore();

  const [activeViewTab, setActiveViewTab] = useState<'dictations' | 'clipboard'>('dictations');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    historyRecords[0]?.id || null
  );
  const [selectedClipId, setSelectedClipId] = useState<string | null>(
    clipboardItems[0]?.id || null
  );
  const [copied, setCopied] = useState(false);

  // Filter Dictations
  const filteredRecords = historyRecords.filter(
    (r) =>
      r.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.enhancedText && r.enhancedText.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.appName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter Clipboard
  const filteredClips = clipboardItems.filter(
    (c) =>
      c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.sourceApp && c.sourceApp.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedRecord =
    historyRecords.find((r) => r.id === selectedRecordId) || filteredRecords[0];
  const selectedClip =
    clipboardItems.find((c) => c.id === selectedClipId) || filteredClips[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getCategoryBadge = (category: ClipboardItem['category']) => {
    switch (category) {
      case 'dictation':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-mono bg-white/5 text-zinc-400 border border-white/10">
            <Mic className="w-2.5 h-2.5" /> Dictation
          </span>
        );
      case 'code':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-mono bg-white/5 text-zinc-400 border border-white/10">
            <Code2 className="w-2.5 h-2.5" /> Code
          </span>
        );
      case 'link':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-mono bg-white/5 text-zinc-400 border border-white/10">
            <ExternalLink className="w-2.5 h-2.5" /> Link
          </span>
        );
      case 'color':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-mono bg-white/5 text-zinc-400 border border-white/10">
            <Palette className="w-2.5 h-2.5" /> Color
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-mono bg-white/5 text-zinc-400 border border-white/10">
            <FileText className="w-2.5 h-2.5" /> Text
          </span>
        );
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden select-none bg-[#000000] text-[#ededed]">
      {/* Left List Pane */}
      <div className="w-full md:w-80 h-full border-r border-[#1e1e24] flex flex-col bg-[#0a0a0c]">
        {/* Search & Header */}
        <div className="p-4 border-b border-[#1e1e24] space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xs font-semibold text-white tracking-wide uppercase flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-zinc-400" /> History & Clips
            </h1>
            {activeViewTab === 'dictations' ? (
              historyRecords.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                  title="Clear history"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )
            ) : (
              clipboardItems.length > 0 && (
                <button
                  onClick={clearClipboardItems}
                  className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                  title="Clear clips"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )
            )}
          </div>

          {/* Segmented Switcher */}
          <div className="grid grid-cols-2 p-0.5 bg-[#121215] border border-[#1e1e24] rounded-lg text-xs">
            <button
              onClick={() => setActiveViewTab('dictations')}
              className={`py-1 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeViewTab === 'dictations'
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>Dictations</span>
            </button>
            <button
              onClick={() => setActiveViewTab('clipboard')}
              className={`py-1 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeViewTab === 'clipboard'
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Clipboard</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder={activeViewTab === 'dictations' ? 'Search dictations...' : 'Search clips...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121215] border border-[#1e1e24] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeViewTab === 'dictations' ? (
            filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No past dictations found.
              </div>
            ) : (
              filteredRecords.map((record) => {
                const isSelected = selectedRecord?.id === record.id;

                return (
                  <button
                    key={record.id}
                    onClick={() => setSelectedRecordId(record.id)}
                    className={`w-full text-left p-2.5 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#18181c] border border-white/20'
                        : 'bg-[#111114] border border-[#1e1e24] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1 font-mono">
                      <span className="text-zinc-200 font-medium truncate max-w-[140px]">{record.appName}</span>
                      <span className="text-zinc-500 text-[10px]">{record.timestamp}</span>
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                      {record.enhancedText || record.rawText}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500 font-mono">
                      <span>{record.speakingWPM} WPM</span>
                      <span>•</span>
                      <span>{record.durationSeconds.toFixed(1)}s</span>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            filteredClips.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No clipboard clips found.
              </div>
            ) : (
              filteredClips.map((clip) => {
                const isSelected = selectedClip?.id === clip.id;
                const isColor = clip.category === 'color';

                return (
                  <button
                    key={clip.id}
                    onClick={() => setSelectedClipId(clip.id)}
                    className={`w-full text-left p-2.5 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#18181c] border border-white/20'
                        : 'bg-[#111114] border border-[#1e1e24] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1 font-mono">
                      <div className="flex items-center gap-1.5">
                        {getCategoryBadge(clip.category)}
                        {clip.sourceApp && (
                          <span className="text-zinc-400 text-[10px] truncate max-w-[90px]">{clip.sourceApp}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {clip.isPinned && <Pin className="w-2.5 h-2.5 text-amber-400 fill-current" />}
                        <span className="text-zinc-500 text-[10px]">{clip.timestamp}</span>
                      </div>
                    </div>
                    {isColor ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="w-3.5 h-3.5 rounded border border-white/20 shrink-0"
                          style={{ backgroundColor: clip.content }}
                        />
                        <span className="text-xs font-mono text-white">{clip.content}</span>
                      </div>
                    ) : (
                      <p
                        className={`text-xs text-zinc-300 line-clamp-2 leading-relaxed ${
                          clip.category === 'code' ? 'font-mono text-[11px]' : 'font-sans'
                        }`}
                      >
                        {clip.content}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500 font-mono">
                      <span>{clip.wordCount} words</span>
                      <span>•</span>
                      <span>{clip.charCount} chars</span>
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Right Detail Pane */}
      <div className="flex-1 h-full overflow-y-auto p-6 space-y-4 bg-[#000000]">
        {activeViewTab === 'dictations' ? (
          selectedRecord ? (
            <>
              {/* Record Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1e1e24]">
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <span>{selectedRecord.appName} Dictation</span>
                    <span className="text-xs font-normal font-mono text-zinc-500">
                      ({selectedRecord.timestamp})
                    </span>
                  </h2>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1 font-mono">
                    <span>{selectedRecord.modelUsed}</span>
                    <span>•</span>
                    <span>{selectedRecord.latencyMs}ms</span>
                    <span>•</span>
                    <span>{selectedRecord.durationSeconds.toFixed(1)}s</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleCopy(selectedRecord.enhancedText || selectedRecord.rawText)
                  }
                  className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Enhanced or Raw Transcript */}
              {selectedRecord.enhancedText && (
                <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Enhanced Transcript</span>
                  <p className="text-xs text-white leading-relaxed select-text">
                    {selectedRecord.enhancedText}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-2">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Raw Speech Transcription</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-mono select-text">
                  {selectedRecord.rawText}
                </p>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              Select a dictation to view details.
            </div>
          )
        ) : (
          selectedClip ? (
            <>
              {/* Clipboard Clip Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1e1e24]">
                <div>
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(selectedClip.category)}
                    <h2 className="text-sm font-semibold text-white tracking-tight">
                      {selectedClip.sourceApp || 'Clipboard Item'}
                    </h2>
                    <span className="text-xs font-normal font-mono text-zinc-500">
                      ({selectedClip.timestamp})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1 font-mono">
                    <span>{selectedClip.wordCount} words</span>
                    <span>•</span>
                    <span>{selectedClip.charCount} chars</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePinClipboardItem(selectedClip.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectedClip.isPinned
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>{selectedClip.isPinned ? 'Pinned' : 'Pin'}</span>
                  </button>

                  <button
                    onClick={() => handleCopy(selectedClip.content)}
                    className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Clip Content Card */}
              <div className="p-4 rounded-xl bg-[#111114] border border-[#1e1e24] space-y-3">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>CONTENT</span>
                  <button
                    onClick={() => deleteClipboardItem(selectedClip.id)}
                    className="text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>

                {selectedClip.category === 'color' ? (
                  <div
                    className="h-28 rounded-lg border border-white/10 p-3 flex flex-col justify-end"
                    style={{ backgroundColor: selectedClip.content }}
                  >
                    <span className="text-xs font-mono font-bold text-white bg-black/60 px-2.5 py-1 rounded backdrop-blur-md self-start">
                      {selectedClip.content}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-lg bg-[#09090b] border border-[#1e1e24] select-text text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap ${
                      selectedClip.category === 'code' ? 'font-mono text-[11px]' : 'font-sans'
                    }`}
                  >
                    {selectedClip.content}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              Select an item to view details.
            </div>
          )
        )}
      </div>
    </div>
  );
};
