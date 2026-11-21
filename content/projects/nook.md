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
media: "projects/nook.mp4"
poster: "projects/nook-poster.webp"
mediaAlt: "Nook's 30-second film: windows opening into half of the newest space, closing and refilling, the four layouts, stacks, dragging an edge, and No peek."
mediaSize: "1920 x 1080"
facts:
  - "Runs on | macOS 15 or later, Apple silicon or Intel"
  - "Lives in | The menu bar. Needs Accessibility access"
  - "Privacy | No network requests. Window titles are never stored"
scenes:
  - "0:00 | Open a window"
  - "0:03 | Each new window takes half of the newest space"
  - "0:09 | Close one, the rest fill the space"
  - "0:12 | Grid, Columns, Rows, Side"
  - "0:16 | More windows than tiles stack"
  - "0:20 | Drag an edge, the neighbours follow"
  - "0:23 | No peek"
timeline:
  - "2026-10-28 | First commit, with unit tests, end-to-end tests and build scripts"
  - "2026-10-28 | Hidden windows handled, and a steadier reflow"
  - "2026-11-10 | The window bar: app icons and window navigation"
notes:
  - "Architecture in nook's README, which names each private API and why | https://github.com/mithunreddyy/nook#architecture"
---

Open a window and it gets a place; close one and the rest fill the space. Nook lives in the menu bar and follows one rule: each new window takes half of the newest space.

## What I built

- A pure Swift layout engine: each screen is a split tree, solved into window frames with gaps, split weights, and per-app minimum sizes.
- Retiling that moves little: each new window takes half of the newest space, and closing one lets the rest fill it. Only windows whose frames change are moved.
- Built on Accessibility observers, Carbon hotkeys, and a global mouse monitor. Each window event retiles the affected screens.
- Apps that won't shrink: Nook learns each app's minimum size, moves split lines to fit it, and floats the window when it can't fit.
- Added Focus mode, No Peek, Clean Space, Tab View, stacks, pins, workspaces, and session restore, with a `nook://` URL scheme and a bundled CLI.

## What it doesn't do

- It uses private APIs for window IDs, Spaces and activation, the same calls yabai, AeroSpace and Rectangle rely on, so it can't be sandboxed or sold on the Mac App Store [1].
- It pauses while Stage Manager is on.
