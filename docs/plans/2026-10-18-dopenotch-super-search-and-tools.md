# DopeNotch Super-Search, Mini-Tools & Local Intelligence Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build ultra-fast Raycast-grade in-memory super search, 3 productivity mini-tools (`/meeting`, `/emoji`, `/color`), offline voice notes with animated notch feedback and dashboard panel, and evaluate bundled sub-200MB local LLM integration (SmolLM2-135M) with 0% background idle overhead.

**Architecture:** A unified Rust/Tauri v2 + React 18 architecture utilizing in-memory Trie/Skim fuzzy indexing for sub-5ms search, background streaming Whisper (`whisper.cpp`) for non-disruptive ambient meeting transcription and voice notes persisted to `~/.dopenotch/notes.json`, and an opt-in memory-mapped GGUF runtime (`llama.cpp` Metal) for instant offline note titling and grammar polish.

**Tech Stack:** Rust (Tauri v2, cpal, whisper-rs, fuzzy-matcher, serde_json), React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.

---

### Task 1: Complete Deep Focus Notch Countdown & Live Controller

**Files:**
- Modify: `src/components/overlay/SuperNotch.tsx:825-835, 960-990, 1410-1490`
- Modify: `src/stores/appStore.ts:590-630`
- Test: Build and manual verification with `/focus 14` and preset chips.

**Step 1: Verify Focus Mode Idle Notch Dimensions & Center Alignment**
Ensure the idle notch is locked at `160px` width and `28px` height with centered flame icon (`Flame`) and monospace countdown (`MM:SS`).

**Step 2: Verify Search View Live Card**
Ensure `/focus [mins]` renders the live card with instant preset chips (`15m`, `25m`, `45m`, `60m`), live remaining time, Pause, and Reset controls.

**Step 3: Test and compile**
Run: `npm run build && cd src-tauri && cargo check`
Expected: 0 errors.

**Step 4: Commit**
```bash
git add src/components/overlay/SuperNotch.tsx src/stores/appStore.ts
git commit -m "feat(focus): lock idle notch visuals to 160px and add interactive /focus card"
```

---

### Task 2: `/emoji` (Instant Unicode & Emoji Finder) Mini-Tool

**Files:**
- Create: `src/services/emojiFinder.ts`
- Create: `src/data/unicodeSymbols.json` (compact offline dictionary: arrows, dev symbols, emojis, greek math)
- Modify: `src/components/overlay/SuperNotch.tsx` (wire `/emoji` or `/symbol` filter and 1-click clipboard insertion)
- Test: Query `/emoji arrow` or `/symbol cmd` and verify instant result list.

**Step 1: Create Unicode & Emoji Offline Dataset**
Bundle ~1,200 curated common developer symbols (`⌘`, `⌥`, `⇧`, `⎋`, `→`, `⇒`, `✓`, `✕`, `λ`, `π`, `≠`, `≈`) and top emojis with search keywords into `src/data/unicodeSymbols.json`.

**Step 2: Create Finder Engine in `emojiFinder.ts`**
Implement sub-millisecond substring/tag matching returning `{ char, name, category, keywords }`.

**Step 3: Connect to SuperNotch Search & Paste**
When user types `/emoji <query>` or `/symbol <query>`, render a sleek horizontal/grid picker in the search view. Pressing Enter or clicking copies to clipboard and direct-pastes into the active window.

**Step 4: Verify & Build**
Run: `npm run build`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/data/unicodeSymbols.json src/services/emojiFinder.ts src/components/overlay/SuperNotch.tsx
git commit -m "feat(tools): add /emoji and /symbol instant unicode finder"
```

---

### Task 3: `/color` (Color Palette Memory & Figma Grabber) Mini-Tool

**Files:**
- Create: `src/services/colorPaletteService.ts`
- Modify: `src/stores/appStore.ts` (store clustered color palettes)
- Modify: `src/components/overlay/SuperNotch.tsx` (render palette bar & `/color` command handler)
- Test: Copy hex codes (`#10b981`, `#3b82f6`) and verify automatic grouping into palette row.

**Step 1: Create Color Clustering Logic**
Extract and cluster hex, rgb, and hsl colors from clipboard items into cohesive palettes (e.g., primary, accent, neutral).

**Step 2: Wire `/color` Command & SuPaste Shelf Strip**
Add a dedicated palette quick bar in the shelf header and a `/color` search card with contrast ratios (WCAG AA/AAA) and 1-click CSS/Tailwind format copy (`bg-[#10b981]`, `rgb(16, 185, 129)`).

**Step 3: Verify & Build**
Run: `npm run build`
Expected: PASS.

**Step 4: Commit**
```bash
git add src/services/colorPaletteService.ts src/components/overlay/SuperNotch.tsx
git commit -m "feat(tools): add /color palette clustering and contrast analysis"
```

---

### Task 4: Voice Notes Engine (`⌥N`) with Animated Notch Feedback & Dashboard Notes Tab

**Files:**
- Create: `src/components/views/NotesView.tsx` (Dashboard Notes panel)
- Create: `src-tauri/src/notes.rs` (CRUD persistence to `~/.dopenotch/notes.json`)
- Modify: `src-tauri/src/lib.rs` (register `get_notes`, `save_note`, `delete_note` commands & `⌥N` shortcut)
- Modify: `src/stores/appStore.ts` (add `notes` to `SidebarTab`, `NoteItem` interface, notes state)
- Modify: `src/components/layout/Sidebar.tsx` (add Notes nav item)
- Modify: `src/components/layout/Dashboard.tsx` (route to `NotesView`)
- Modify: `src/components/overlay/SuperNotch.tsx` (trigger animated `📝 Saved to Notes ✨` badge upon save)
- Test: Press `⌥N`, speak a note, observe animated notch indicator, and view saved card in Dashboard Notes tab.

**Step 1: Rust Notes Persistence Layer**
Implement `notes.rs` in `src-tauri` with atomic file writes to `~/.dopenotch/notes.json`. Provide Tauri commands:
- `load_notes() -> Result<Vec<NoteItem>>`
- `save_note(title: String, content: String, tags: Vec<String>) -> Result<NoteItem>`
- `delete_note(id: String) -> Result<()>`

**Step 2: Global Shortcut `⌥N` in Tauri**
Register global hotkey `Option+N` to start voice note recording without stealing foreground focus. When stopped, route transcribed text directly to `save_note` rather than clipboard auto-pasting.

**Step 3: Animated Notch Micro-Interaction**
In `SuperNotch.tsx`, when a voice note is saved, trigger a 1.8-second hardware notch pill animation:
- Glowing amber notepad icon: `📝`
- Slide-up text: `Saved to Notes ✨`
- Smooth spring collapse back to idle bezel.

**Step 4: Dashboard Notes Tab (`NotesView.tsx`)**
Design a dark, clean Notes panel matching DopeNotch's design system:
- Search notes by keyword or tag.
- Card grid with timestamps, word counts, and copy/export/delete buttons.
- Markdown viewer and 1-click "Copy as Markdown".

**Step 5: Verify & Build**
Run: `npm run build && cd src-tauri && cargo check`
Expected: PASS.

**Step 6: Commit**
```bash
git add src/components/views/NotesView.tsx src-tauri/src/notes.rs src/components/overlay/SuperNotch.tsx
git commit -m "feat(notes): add voice notes shortcut ⌥N, animated notch pill, and dashboard notes tab"
```

---

### Task 5: `/meeting` (Ambient Meeting & Lecture Scribe) Mini-Tool

**Files:**
- Create: `src-tauri/src/meeting_scribe.rs` (continuous rolling audio chunker with VAD)
- Modify: `src-tauri/src/lib.rs` (commands `start_meeting_scribe`, `stop_meeting_scribe`)
- Modify: `src/components/overlay/SuperNotch.tsx` (live `/meeting` notch state & indicator)
- Modify: `src/components/views/NotesView.tsx` (tag meeting sessions under `#meeting`)
- Test: Trigger `/meeting`, speak for 40 seconds, stop session, and inspect timestamped transcript in Notes.

**Step 1: Background Rolling Audio Chunker**
Implement background rolling buffer in Rust using `cpal` + silence detection (energy VAD). Every 15 seconds of detected speech, run non-blocking `whisper_rs` transcription on the worker thread.

**Step 2: Real-time Transcript Aggregation**
Prepend timestamp brackets `[HH:MM:SS]` to each chunk and accumulate in memory without triggering foreground paste events.

**Step 3: Hardware Notch Meeting Indicator**
In idle notch mode during meeting scribe, show a subtle pulsing emerald mic dot + `🎙️ Meeting: MM:SS`.

**Step 4: Save & Export to Notes**
Upon stopping, write complete meeting transcript directly into `NotesView` tagged `#meeting`.

**Step 5: Verify & Build**
Run: `cd src-tauri && cargo check`
Expected: PASS.

**Step 6: Commit**
```bash
git add src-tauri/src/meeting_scribe.rs src/components/overlay/SuperNotch.tsx
git commit -m "feat(meeting): add continuous ambient meeting scribe with non-intrusive notch indicator"
```

---

### Task 6: Web Asset & Palette Downloader Extension (`/inspect-web`)

**Files:**
- Create: `~/.dopenotch/extensions/web-asset-extractor.js` (Node/Tauri extension)
- Create: `src/services/webInspector.ts`
- Modify: `src/components/overlay/SuperNotch.tsx` (handle `/inspect <url>` and `/palette <url>`)
- Test: Run `/inspect https://linear.app` and verify extracted hex colors and SVG assets.

**Step 1: DOM & CSS Variable Parser**
Implement asset extractor parsing target website HTML for:
- CSS custom properties (`--color-*`, `#hex`, `rgb()`).
- Inline `<svg>` icons and favicon/OpenGraph graphics.
- Web fonts and logo assets.

**Step 2: Output Palette Strip & Asset Folder**
Render color swatches directly in DopeNotch shelf with 1-click copy or "Save all SVGs to Downloads".

**Step 3: Commit**
```bash
git add src/services/webInspector.ts src/components/overlay/SuperNotch.tsx
git commit -m "feat(extensions): add web asset extractor and color palette scraper"
```

---

### Task 7: Bundled Mini Local LLM Architecture (SmolLM2-135M / 360M)

**Files:**
- Create: `src-tauri/src/local_llm.rs` (memory-mapped `llama.cpp` inference binding)
- Modify: `src-tauri/Cargo.toml` (optional `llama-cpp-2` feature flag)
- Create: `docs/benchmarks/local-llm-footprint.md` (memory, battery, and speed benchmarks)
- Test: Measure idle memory footprint (<10MB) and note-titling inference latency (<80ms).

**Step 1: Model Selection & Quantization Profile**
- Primary: **SmolLM2-135M-Instruct-Q4_K_M** (only **92 MB** disk footprint, <140 MB VRAM on Metal).
- Alternative: **SmolLM2-360M-Instruct-Q4_K_M** (**220 MB** disk footprint, higher reasoning quality).

**Step 2: Zero-Cost Background Strategy**
- Weights are memory-mapped (`mmap`) using Apple Silicon unified memory.
- Background CPU while idle: strictly **0.0%**.
- Model only awakens when a note is saved (to generate a 3-word title) or when `/prompt` is triggered.
- Auto-unloads from VRAM if unused for >5 minutes to preserve 100% system resources for developer tasks.

**Step 3: Verification & Benchmark Documentation**
Document cold-load time, token generation rate (180+ tokens/sec on M1/M2/M3), and power draw.

**Step 4: Commit**
```bash
git add docs/plans/2026-10-18-dopenotch-super-search-and-tools.md docs/benchmarks/local-llm-footprint.md
git commit -m "docs: add bundled local LLM architecture specification and benchmark metrics"
```
