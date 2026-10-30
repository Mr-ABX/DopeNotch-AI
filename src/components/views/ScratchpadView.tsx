import React, { useState, useRef, useCallback } from 'react';
import {
  FileEdit,
  Copy,
  Check,
  Trash2,
  BookmarkPlus,
  Clock,
  Sparkles,
  Type,
  AlignLeft,
} from 'lucide-react';
import { useAppStore, NoteItem } from '../../stores/appStore';

export const ScratchpadView: React.FC = () => {
  const { notes, addNote, updateNote, setActiveTab } = useAppStore();

  const [text, setText] = useState<string>(() => {
    try {
      return localStorage.getItem('dopenotch_scratchpad_draft') || '';
    } catch {
      return '';
    }
  });

  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('Auto-saved locally');
  const [isMonospace, setIsMonospace] = useState<boolean>(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync to localStorage and Notes store
  const persistText = useCallback(
    (newText: string) => {
      try {
        localStorage.setItem('dopenotch_scratchpad_draft', newText);
      } catch {}

      // Find or sync with Notes collection
      const existing = notes.find(
        (n) => n.tags?.includes('scratchpad') || n.title === 'Scratchpad' || n.title === '📌 Notch Quick Scratchpad'
      );

      const now = new Date().toISOString();
      const wordCount = newText.trim() ? newText.trim().split(/\s+/).length : 0;

      if (existing) {
        updateNote(existing.id, {
          title: 'Scratchpad',
          content: newText,
          updated_at: now,
          char_count: newText.length,
          word_count: wordCount,
          tags: ['scratchpad', 'draft', 'quick-memo'],
        });
      } else if (newText.trim().length > 0) {
        const newNote: NoteItem = {
          id: `note-scratchpad-${Date.now()}`,
          title: 'Scratchpad',
          content: newText,
          tags: ['scratchpad', 'draft', 'quick-memo'],
          created_at: now,
          updated_at: now,
          char_count: newText.length,
          word_count: wordCount,
          is_pinned: true,
        };
        addNote(newNote);
      }

      setSaveStatus('All changes saved');
    },
    [notes, addNote, updateNote]
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setSaveStatus('Saving...');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistText(val);
    }, 600);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = () => {
    if (text.trim() && !window.confirm('Clear your scratchpad contents?')) return;
    setText('');
    persistText('');
  };

  const handleInsertToken = (token: string) => {
    const prefix = text && !text.endsWith('\n') ? '\n' : '';
    const updated = `${text}${prefix}${token}`;
    setText(updated);
    persistText(updated);
    textareaRef.current?.focus();
  };

  const handleInsertTimestamp = () => {
    const nowStr = `\n--- ${new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} ---\n`;
    handleInsertToken(nowStr);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const readingTimeMin = Math.ceil(wordCount / 200);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] text-[#ededed] overflow-hidden select-text">
      {/* Top Header Bar */}
      <div className="h-14 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <FileEdit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white tracking-tight">Scratchpad</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Persistent Memo
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Fast, frictionless scratch space — auto-synced across dashboard & SuperNotch
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Monospace Toggle */}
          <button
            type="button"
            onClick={() => setIsMonospace(!isMonospace)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isMonospace
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white'
            }`}
            title={isMonospace ? 'Switch to Sans-Serif font' : 'Switch to Monospace font'}
          >
            {isMonospace ? <Type className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All</span>
              </>
            )}
          </button>

          {/* View in Notes */}
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Open in Voice Notes library"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Open in Notes</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={!text}
            className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 border border-white/[0.06] hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear Scratchpad"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Insert Token Ribbon */}
      <div className="px-6 py-2 border-b border-white/[0.04] bg-[#0c0c0e] flex items-center gap-2 overflow-x-auto text-[11px] font-mono shrink-0">
        <span className="text-zinc-500 text-[10px] uppercase font-semibold mr-1">Insert:</span>

        <button
          onClick={() => handleInsertToken('• [TODO] ')}
          className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-amber-300 border border-white/[0.06] hover:border-amber-500/30 transition-all cursor-pointer"
        >
          + [TODO]
        </button>

        <button
          onClick={() => handleInsertToken('💡 [IDEA] ')}
          className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-amber-300 border border-white/[0.06] hover:border-amber-500/30 transition-all cursor-pointer"
        >
          + [IDEA]
        </button>

        <button
          onClick={() => handleInsertToken('🐞 [BUG] ')}
          className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-amber-300 border border-white/[0.06] hover:border-amber-500/30 transition-all cursor-pointer"
        >
          + [BUG]
        </button>

        <button
          onClick={handleInsertTimestamp}
          className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.06] hover:border-white/20 transition-all cursor-pointer flex items-center gap-1"
        >
          <Clock className="w-3 h-3 text-zinc-400" />
          <span>Timestamp</span>
        </button>

        <button
          onClick={() => handleInsertToken('```\n\n```')}
          className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.06] hover:border-white/20 transition-all cursor-pointer"
        >
          + Code Block
        </button>

        <div className="ml-auto text-[10.5px] text-zinc-500 font-mono">
          <span>{saveStatus}</span>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 p-6 flex flex-col min-h-0 bg-[#000000]">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="Jot down quick thoughts, paste snippets, bullet items, meeting notes, or ideas...&#10;&#10;Auto-saves in real-time. Use /scratchpad or Tab in the top notch to quickly access this memo anytime!"
          className={`flex-1 w-full bg-[#0a0a0c] border border-white/[0.08] focus:border-amber-400/50 rounded-2xl p-5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed transition-all shadow-inner ${
            isMonospace ? 'font-mono text-[12.5px]' : 'font-sans text-[13.5px]'
          }`}
          spellCheck={false}
        />
      </div>

      {/* Footer Word Count & Metric Bar */}
      <div className="h-9 px-6 border-t border-white/[0.06] bg-[#09090b] flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-200 font-semibold">{wordCount}</span>
            <span>words</span>
          </div>
          <span className="text-zinc-700">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-200 font-semibold">{charCount}</span>
            <span>characters</span>
          </div>
          <span className="text-zinc-700">•</span>
          <div className="flex items-center gap-1.5">
            <span>~{readingTimeMin} min read</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Press Esc or Command+W to minimize</span>
          </span>
        </div>
      </div>
    </div>
  );
};
