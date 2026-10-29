# Cross-Platform Screenshot & Annotation Suite and Raycast-Style File Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a CleanShot X-grade cross-platform Screenshot & Annotation Suite (Area/Fullscreen, floating Notch Quick-Action Capsule, direct-to-clipboard without desktop clutter, blur/redact/arrow/text markup canvas) and upgrade DopeNotch file search to Raycast-grade instant search with image thumbnails, rich file metadata drawer, Quick Look (`Spacebar`), and Windows support.

**Architecture:** 
1. **Screenshot Engine**: Native Rust backend executing macOS `screencapture` (interactive `-i` crosshair and silent fullscreen `-x`) and Windows screen capture, emitting results to a floating Notch Action Capsule in `SuperNotch.tsx`.
2. **Annotation Studio**: A dedicated high-performance canvas markup studio (`ScreenshotAnnotator.tsx`) with vector arrows, boxes, text, numbered step badges, and pixelate/blur redaction for sensitive data, allowing 1-click clipboard copy without saving to disk.
3. **Raycast File Search**: Enhanced `search_system_files` returning size, modification timestamp, and image classification, paired with an asynchronous thumbnail generator (`get_file_preview_thumbnail`) and macOS `qlmanage` Quick Look integration, displayed in a responsive split-preview drawer inside the Notch search overlay.

**Tech Stack:** Rust (Tauri v2, tokio, image, base64, serde_json), React 18, TypeScript, HTML5 Canvas API, Tailwind CSS, Framer Motion, Lucide Icons.

---

### Task 1: Rust Backend Screenshot Engine & Clipboard Copy

**Files:**
- Create: `src-tauri/src/screenshot.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: Build `cargo check` and verify capture invocation.

**Step 1: Create `src-tauri/src/screenshot.rs`**
Implement:
- `pub struct ScreenshotPayload`: `base64: String`, `width: u32`, `height: u32`, `file_path: Option<String>`, `timestamp: u64`.
- `pub fn capture_screen_area(app: &AppHandle) -> Result<ScreenshotPayload, String>`:
  - macOS: `screencapture -i -x <tmp_file>` (interactive crosshair with dimension tool).
  - Windows: Screen snapshot fallback.
  - Reads image, calculates dimensions, encodes to Base64, and removes temp file if copy-only.
- `pub fn capture_screen_full(app: &AppHandle) -> Result<ScreenshotPayload, String>`:
  - macOS: `screencapture -x -m <tmp_file>`.
  - Windows: Fullscreen capture.
- `pub fn copy_image_bytes_to_clipboard(png_bytes: &[u8]) -> Result<(), String>`.

**Step 2: Add Tauri Commands in `commands.rs`**
- `take_screenshot_area(app: AppHandle) -> Result<ScreenshotPayload, String>`
- `take_screenshot_full(app: AppHandle) -> Result<ScreenshotPayload, String>`
- `copy_screenshot_to_clipboard(base64_data: String) -> Result<(), String>`
- `save_screenshot_to_file(base64_data: String, filename: Option<String>) -> Result<String, String>`

**Step 3: Register in `lib.rs` and verify compilation**
- Run: `cargo check` in `src-tauri`.
- Expected: 0 errors.

---

### Task 2: Floating Notch Quick-Action Screenshot Capsule in `SuperNotch.tsx`

**Files:**
- Modify: `src/components/overlay/SuperNotch.tsx`
- Modify: `src/stores/appStore.ts`

**Step 1: Add Screenshot State to App Store / SuperNotch**
- State: `activeScreenshot: { base64: string; width: number; height: number; timestamp: number } | null`.
- Command triggers: `/snip`, `/screenshot`, and shortcut listener (`dopenotch://trigger-snip`).

**Step 2: Build Floating Action Capsule UI in Notch**
- Animate in from notch with Apple spring easing when capture completes.
- Display:
  - Thumbnail preview with aspect ratio.
  - Resolution badge (e.g. `1280 × 720`).
  - Action pills:
    - **Copy** (copies to clipboard, shows green checkmark toast).
    - **Annotate** (opens Markup Studio).
    - **Ask AI** (sends to Gemini 2.5 Flash Vision chat).
    - **Stash** (adds to DopeNotch shelf stream for drag-and-drop).
    - **Save** (saves to `~/Downloads` or prompt).
    - **Dismiss** (✕).

**Step 3: Verify compilation & interactivity**
- Run: `npm run build`.

---

### Task 3: Interactive Markup & Annotation Studio (`ScreenshotAnnotator.tsx`)

**Files:**
- Create: `src/components/overlay/ScreenshotAnnotator.tsx`
- Modify: `src/components/overlay/SuperNotch.tsx` (or window router)
- Test: Load captured image and draw arrows, rectangles, text, and blur.

**Step 1: Canvas Markup Engine**
- Canvas rendering loop with vector drawing objects:
  - `Arrow`: Arrowhead with anti-aliased line.
  - `Rect`: Box with 2-8px rounded corners.
  - `Ellipse`: Oval highlight.
  - `Text`: Editable text labels with high-contrast pill backdrop.
  - `StepBadge`: Numbered bubbles `(1)`, `(2)`, `(3)`.
  - `Blur / Pixelate`: Downsample-upsample mosaic effect to mask sensitive keys/passwords.
- Undo / Redo history stacks (`Ctrl+Z` / `Cmd+Z`).

**Step 2: Styling and Control Bar**
- Apple G2 squircle floating toolbar.
- Color selection: Apple Red (`#FF3B30`), Lime (`#30D158`), Azure (`#007AFF`), Gold (`#FFD60A`), White (`#FFFFFF`).
- Action buttons:
  - `Copy Image` (primary action, closes editor with instant clipboard copy).
  - `Save Image` (`Cmd+S`).
  - `Close` (`Esc`).

**Step 3: Test and verify**
- Run: `npm run build`.

---

### Task 4: Raycast-Grade File Search & Thumbnail Engine

**Files:**
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Enrich `SystemFileResult`**
```rust
pub struct SystemFileResult {
    pub name: String,
    pub path: String,
    pub kind: String,
    pub size_bytes: Option<u64>,
    pub modified_timestamp: Option<u64>,
    pub is_image: bool,
}
```

**Step 2: Add Asynchronous Preview & Metadata Commands**
- `get_file_preview_thumbnail(path: String) -> Result<String, String>`:
  - If image: loads, creates lightweight thumbnail (<64KB base64), and caches in memory.
- `quick_look_file(path: String) -> Result<(), String>`:
  - macOS: executes `/usr/bin/qlmanage -p <path>`.
  - Windows: launches default file association viewer.

**Step 3: Add Windows File Search Fallback**
- Query user directories: Desktop, Downloads, Documents, Pictures with fast substring matching so Windows users get real results instead of `[]`.

**Step 4: Verify with `cargo test` and `cargo check`**

---

### Task 5: Raycast Split Preview Drawer in SuperNotch

**Files:**
- Modify: `src/components/overlay/SuperNotch.tsx`

**Step 1: Universal Auto-Search Routing**
- Automatically trigger file search when searching (with 150ms debounce), without strictly requiring `/find` prefix (while preserving `/find` as a dedicated filter).

**Step 2: Split-View File Preview Drawer**
- When a file item is hovered/focused with keyboard:
  - Right panel expands showing:
    - Live image thumbnail / icon.
    - File size formatted (`1.4 MB`, `320 KB`).
    - Last modified date.
    - Full readable folder path.
    - Keyboard Action Hints bar:
      - `↵ Open`
      - `Space Quick Look`
      - `⌘↵ Reveal in Finder`
      - `⌘C Copy Path`

**Step 3: Wire Keyboard Navigation**
- `ArrowDown` / `ArrowUp`: Highlights items and updates preview asynchronously.
- `Space`: Calls `quick_look_file`.
- `Enter`: Calls `open_path_in_os`.
- `Cmd+Enter`: Calls `reveal_path_in_finder`.

---

### Task 6: Full Verification & Integration Testing

**Step 1: Rust tests & Cargo Check**
- Run: `cargo test` and `cargo check` in `src-tauri`.

**Step 2: Frontend Production Build**
- Run: `npm run build` in `Project 01/murmur`.

**Step 3: Verification of Existing Features**
- Verify Whisper audio transcription, clipboard listener, Notch HUD, license validation, and pixel loupe remain 100% untouched and functional.
