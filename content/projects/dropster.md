---
date: "2026-11-10"
title: "dropster"
summary: "Compress and convert files on macOS."
outcome: "Its JPEGs come out 13 to 34% smaller than Apple's own encoder at the same quality, measured with SSIM."
tech:
  - "Swift"
  - "PDFKit"
  - "Vision"
  - "FFmpeg"
  - "Swift Package Manager"
link: "https://github.com/mithunreddyy/dropster"
logo: "projects/dropster.webp"
media: "projects/dropster.mp4"
poster: "projects/dropster-poster.webp"
mediaAlt: "Dropster's 30-second film: the clover dial opening at the cursor, a drop on the window with the space saved, Fit under 10 MB, metadata removal and watch folders."
mediaSize: "1920 x 1080"
facts:
  - "Runs on | macOS 15 or later, Apple silicon or Intel"
  - "Handles | Images, video, audio, PDFs, documents, subtitles and archives"
  - "Privacy | On the device. Files are never uploaded"
scenes:
  - "0:00 | Dropster"
  - "0:04 | Hold ⌥ and drag a file anywhere"
  - "0:07 | Rest on a leaf, its formats fan out"
  - "0:12 | Or drop on the window"
  - "0:18 | Never larger, never overwritten"
  - "0:20 | Fit under 10 MB"
  - "0:22 | Location and device serials, gone"
  - "0:24 | Watch folders"
notes:
  - "docs/BENCHMARKS.md in the dropster repo: the SSIM measurements behind the encoder settings | https://github.com/mithunreddyy/dropster/blob/master/docs/BENCHMARKS.md"
---

A native macOS app that compresses and converts images, video, audio, PDFs and documents on the device. Hold ⌥ while dragging files and a dial opens at the cursor with the formats that fit them; drop on a leaf and the result lands next to the original.

## What I built

- The clover dial: hold ⌥ while dragging files and a four-petal dial opens at the cursor with the formats that fit them, with haptic detents on each leaf.
- Fit Under a size: pick a limit, and it searches for the best quality that fits, scaling down only when quality alone isn't enough. Video uses two-pass H.264.
- Safe output: an optimized file that isn't smaller is never written, originals are only read, and every result is checked to open as the right format before it's kept.
- A JPEG optimizer: standard quantisation tables with optimal Huffman coding. Measured with SSIM, it came out 13 to 34% smaller than Apple's encoder at equal quality [1].
- Watch folders and a queue: point it at Downloads and every new file gets your chosen action. A batch queue with pause, cancel and retry, and a `dropster-cli` command line for analyze, optimize, convert, fit, merge and more.
