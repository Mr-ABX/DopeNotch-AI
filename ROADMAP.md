# 🗺️ DopeNotch AI — Product & Architecture Roadmap

This document outlines the planned future features, hardware-adaptive layout enhancements, and UI variations for DopeNotch AI. These initiatives ensure seamless, native behavior across both physical-notch Apple Silicon MacBooks and flat-display Macs (such as Intel MacBooks, Studio Displays, and Windows machines).

---

## 📌 Upcoming Focus Areas (Saved for Future Implementation)

### 1. Hardware Notch Vertical Drop & Orb Clearance
> **Problem Identified:** On physical-notch MacBooks (14" / 16" Pro and Air M2/M3/M4), a camera housing cutout (~204×34px) is cut into the display glass. If a glowing dictation orb or equalizer is rendered at the top-center, the physical black plastic completely obscures it from view.

- **Planned Behavior:**
  - When dictation starts (<kbd>⌥Space</kbd> or push-to-talk), the notch window dynamically **expands both horizontally and vertically in height**.
  - The morphing animation gracefully extends downwards past the 34px hardware safe-zone (e.g. extending from 34px to 68px–74px).
  - The glowing Siri Aurora / Brand Amber fluid orb drops **below the physical camera line**, making it 100% visible and giving the illusion that Apple's camera housing has fluidly dropped down to listen.
  - Upon release, the notch spring-retracts flush back behind the physical camera bezel.

---

### 2. Floating Dynamic Island Layout Variation
> **Goal:** Provide a user-selectable toggle in Preferences between two distinct presentation styles.

- **Mode A: Hardware-Anchored Notch (Default for M-Series)**:
  - Hugs the physical top glass bezel at `Y = 0`.
  - Morphs outward and downward as an organic extension of Apple's camera housing.
- **Mode B: Floating Dynamic Island (Modern Detached Capsule)**:
  - Detached floating capsule resting at `Y = 8px–12px`.
  - Symmetrical 18px–22px rounded corners on all four sides.
  - Perfect for:
    - 2018 Intel MacBook Pros (flat displays with no notch).
    - External monitors (Studio Display, Pro Display XDR, LG Ultrafine).
    - Users who prefer the iOS / iPhone Dynamic Island floating look.

---

### 3. Floating Quick-List on Top Notch
> **Goal:** Instant access to pinned workflows, extensions, and recent clips without opening the full dashboard.

- **Features:**
  - A compact, keyboard-navigable floating list anchored to the bottom edge of the notch capsule.
  - Quick action launcher for:
    - Active extension scripts (Bash, Python, Node).
    - Pinned clipboard items and prompt templates.
    - Dictation modes switcher (Default, VoxCoder, Meeting Scribe).
    - Voice persona fast-toggle (Nova Cheerful Female vs. Leo Jolly Male).

---

### 4. Multi-Display & Non-Notched Screen Geometries
> **Goal:** Automatically sense screen boundaries across heterogeneous multi-monitor setups.

- **Features:**
  - Detect `NSScreen.safeAreaInsets` on display change events.
  - If moving the cursor or dragging to an external 4K monitor without a physical notch, DopeNotch automatically switches presentation to the **Floating Dynamic Island** mode.
  - When dragged back to the built-in Liquid Retina XDR screen, it automatically transitions back to **Hardware-Anchored Notch** mode.

---

## 📋 Roadmap Status Tracker

| Milestone | Feature | Scope | Status |
| :--- | :--- | :--- | :---: |
| **0.5.0** | **Physical Notch Height Morph (Orb Clearance)** | Extends notch height down to reveal Siri orb beneath camera plastic | 📝 *Planned* |
| **0.5.0** | **Floating Dynamic Island Preference Mode** | Detached pill option with 4-side rounding for Intel/External screens | 📝 *Planned* |
| **0.5.1** | **Top-Notch Floating Quick-List** | Quick-action shelf anchored to the notch for extensions & recents | 📝 *Planned* |
| **0.5.2** | **Multi-Monitor Display Awareness** | Auto-switch between Anchored and Floating based on active screen | 📝 *Planned* |

---

*Note: All items listed in this document are preserved as planned architecture goals and will be scheduled for active implementation in future milestones.*
