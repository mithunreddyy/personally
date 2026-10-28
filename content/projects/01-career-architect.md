---
date: "2026-05-04"
title: "nook"
summary: "Automatic window tiling for macOS."
tech:
  - "Swift"
  - "AppKit"
  - "SwiftUI"
  - "Accessibility API"
  - "Carbon"
  - "Swift Testing"
  - "Swift Package Manager"
link: "https://github.com/mithunreddyy/nook"
---

- Built a pure Swift layout engine with 4 layouts, 3 screen shapes, and a solver for gaps, split weights, and per-app minimum sizes.
- Integrated Accessibility API observers, Carbon hotkeys, and a global mouse monitor. Each window event retiles the affected screens and moves only windows whose frames differ.
- Added Focus mode, No Peek, Clean Space, Tab View, 27 shortcuts, drag to swap, stack, and resize, and a nook:// URL scheme with a CLI.
- Wrote 30 unit tests and 54 end-to-end checks. The checks run the installed app against real windows.
