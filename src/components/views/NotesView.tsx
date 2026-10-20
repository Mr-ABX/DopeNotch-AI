import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  Pin,
  CheckSquare,
  Clock,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore, NoteItem } from '../../stores/appStore';
import { convertToMarkdownChecklist } from '../../services/quickPrompt';

export const NotesView: React.FC = () => {
  const { notes, setNotes, addNote, deleteNote, updateNote } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  // Load notes from Rust backend on mount
  useEffect(() => {
    invoke<NoteItem[]>('get_notes')
      .then((loaded) => {
        if (Array.isArray(loaded)) {
          setNotes(loaded);
        }
      })
      .catch((e) => console.error('Failed to load notes', e));
  }, [setNotes]);

  // Handle saving new note
  const handleCreateNote = async (asChecklist: boolean = false) => {
    if (!newContent.trim()) return;

    let finalContent = newContent.trim();
    if (asChecklist) {
      finalContent = convertToMarkdownChecklist(finalContent);
    }

    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (asChecklist && !tagsArray.includes('checklist')) {
      tagsArray.push('checklist');
    }

    try {
      const saved = await invoke<NoteItem>('save_note', {
        title: newTitle.trim(),
        content: finalContent,
        tags: tagsArray,
      });
      addNote(saved);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setIsCreating(false);
    } catch (e) {
      console.error('Failed to save note', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_note', { id });
      deleteNote(id);
    } catch (e) {
      console.error('Failed to delete note', e);
    }
  };

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    try {
      const updated = await invoke<NoteItem>('update_note', {
        id,
        isPinned: !currentPin,
      });
      updateNote(id, { is_pinned: updated.is_pinned });
    } catch (e) {
      console.error('Failed to toggle pin', e);
    }
  };

  const handleToggleCheckbox = async (note: NoteItem, lineIndex: number) => {
    const lines = note.content.split('\n');
    let taskCount = 0;
    const updatedLines = lines.map((line) => {
      if (/^\s*-\s*\[([ xX])\]/.test(line)) {
        if (taskCount === lineIndex) {
          const isChecked = /^\s*-\s*\[[xX]\]/.test(line);
          const toggled = isChecked
            ? line.replace(/^\s*-\s*\[[xX]\]/, '- [ ]')
            : line.replace(/^\s*-\s*\[\s*\]/, '- [x]');
          taskCount++;
          return toggled;
        }
        taskCount++;
      }
      return line;
    });

    const newContentStr = updatedLines.join('\n');
    try {
      await invoke<NoteItem>('update_note', {
        id: note.id,
        content: newContentStr,
      });
      updateNote(note.id, { content: newContentStr });
    } catch (e) {
      console.error('Failed to update checklist item', e);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTag =
        activeTag === 'all' ||
        n.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase());
      return matchSearch && matchTag;
    });
  }, [notes, searchQuery, activeTag]);

  // Collect unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => tagsSet.add(t.toLowerCase())));
    return Array.from(tagsSet);
  }, [notes]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0c] text-[#ededed] p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-5 border-b border-white/[0.08] shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              Voice Notes & Checklists
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-400">
              {notes.length} notes
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Shortcut <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">⌥N</kbd> anywhere to dictate a note • 100% offline
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Creation Modal / Expandable Area */}
      {isCreating && (
        <div className="my-4 p-4 rounded-2xl bg-[#141418] border border-white/10 shadow-lg shrink-0 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Note Title (Optional — auto-generated from text if left empty)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
          />
          <textarea
            placeholder="Write your note or list here... (Tip: Click 'Save as Checklist' to auto-format each item with checkboxes!)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400/50 resize-none font-mono"
          />
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              placeholder="Tags (comma separated, e.g. meeting, ideas, todo)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateNote(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30 transition-all"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Save as Checklist</span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateNote(false)}
                className="px-3 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold shadow-sm transition-all"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar with Segmented Control */}
      <div className="flex items-center justify-between gap-4 my-3 shrink-0">
        <div className="flex items-center gap-2.5 bg-[#121216] border border-white/[0.08] focus-within:border-white/20 rounded-xl px-3 py-1.5 w-72 transition-all">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search notes & tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-zinc-500 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Clean Segmented Filter Bar (No messy #hashtag clutter) */}
        <div className="flex items-center gap-1 bg-[#121216] border border-white/[0.08] p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTag('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTag === 'all'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>All Notes</span>
            <span
              className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTag === 'all' ? 'bg-black/10 text-black font-bold' : 'bg-white/[0.06] text-zinc-400'
              }`}
            >
              {notes.length}
            </span>
          </button>

          {allTags.map((tag) => {
            const count = notes.filter((n) => n.tags.some((t) => t.toLowerCase() === tag.toLowerCase())).length;
            const capitalized = tag.charAt(0).toUpperCase() + tag.slice(1);
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>{capitalized}</span>
                <span
                  className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-black/10 text-black font-bold' : 'bg-white/[0.06] text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes Stream / Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-slim-scrollbar space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500 gap-2">
            <FileText className="w-8 h-8 text-zinc-600 mb-1" />
            <p className="text-sm font-medium text-zinc-400">No notes found</p>
            <p className="text-xs text-zinc-600 max-w-sm">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">⌥N</kbd> anywhere to dictate a voice note, or click &quot;New Note&quot; above.
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isChecklist = note.content.includes('- [ ]') || note.content.includes('- [x]');
            let taskIndexCounter = 0;

            return (
              <div
                key={note.id}
                className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between group ${
                  note.is_pinned
                    ? 'bg-[#15151a] border-amber-500/30 shadow-md'
                    : 'bg-[#111114] border-white/[0.06] hover:border-white/15'
                }`}
              >
                {/* Note Card Header */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-semibold text-white tracking-tight truncate">
                      {note.title}
                    </h3>
                    {isChecklist && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase font-semibold">
                        Checklist
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePin(note.id, note.is_pinned)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        note.is_pinned
                          ? 'text-amber-400 bg-amber-400/10'
                          : 'text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100'
                      }`}
                      title={note.is_pinned ? 'Unpin Note' : 'Pin Note'}
                    >
                      <Pin className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => handleCopyText(note.id, note.content)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-colors"
                      title="Copy content"
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Note Content / Interactive Checklist Preview */}
                <div className="text-xs text-zinc-300 leading-relaxed font-sans space-y-1.5 my-1">
                  {note.content.split('\n').map((line, idx) => {
                    if (/^\s*-\s*\[([ xX])\]/.test(line)) {
                      const thisTaskIndex = taskIndexCounter++;
                      const isChecked = /^\s*-\s*\[[xX]\]/.test(line);
                      const cleanText = line.replace(/^\s*-\s*\[([ xX])\]\s*/, '');

                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleCheckbox(note, thisTaskIndex)}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white/[0.03] p-1 rounded-md transition-colors select-none"
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                              isChecked
                                ? 'bg-amber-400 border-amber-400 text-black'
                                : 'border-zinc-500 hover:border-zinc-400'
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span
                            className={`${
                              isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'
                            }`}
                          >
                            {cleanText}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="whitespace-pre-wrap">
                        {line}
                      </p>
                    );
                  })}
                </div>

                {/* Note Footer */}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.04] text-[10.5px] font-mono text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      {formatDate(note.created_at)}
                    </span>
                    <span>{note.word_count} words</span>
                  </div>

                  {note.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.2 rounded bg-white/[0.05] text-zinc-400 text-[9.5px]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
