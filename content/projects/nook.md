---
date: "2026-10-04"
title: "nook"
summary: "Automatic window tiling for macOS."
tech:
  - "Swift"
  - "AppKit"
  - "Accessibility API"
  - "Carbon"
  - "Swift Package Manager"
link: "https://github.com/mithunreddyy/nook"
logo: "projects/nook.svg"
---

- Built a pure Swift layout engine. Each screen is a split tree, solved into window frames with gaps, split weights, and per-app minimum sizes.
- Each new window takes half of the newest space, and closing one lets the rest fill it. Only windows whose frames change are moved.
- Built on Accessibility observers, Carbon hotkeys, and a global mouse monitor. Each window event retiles the affected screens.
- Apps that won't shrink: Nook learns each app's minimum size, moves split lines to fit it, and floats the window when it can't fit.
- Added Focus mode, No Peek, Clean Space, Tab View, stacks, pins, workspaces, and session restore, with a `nook://` URL scheme and a bundled CLI.
- Uses private APIs for window IDs, Spaces, and activation, so it can't be sandboxed or sold on the Mac App Store. It makes no network requests and never stores window titles.