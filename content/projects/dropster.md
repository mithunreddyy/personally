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
---

- Built a native macOS app that compresses and converts images, video, audio, PDFs, and documents on the device. Files are never uploaded.
- Designed the clover dial: hold ⌥ while dragging files and a four-petal dial opens at the cursor with the formats that fit them, with haptic detents on each leaf.
- Built Fit Under a size. Pick a limit, and it searches for the best quality that fits, scaling down only when quality alone isn't enough. Video uses two-pass H.264.
- Enforced safe output: an optimized file that isn't smaller is never written, originals are only read, and every result is checked to open as the right format before it's kept.
- Wrote a JPEG optimizer with standard quantisation tables and optimal Huffman coding. Measured with SSIM, it came out 13 to 34% smaller than Apple's encoder at equal quality.
- Added watch folders, a batch queue with pause, cancel, and retry, and a `dropster-cli` command line for analyze, optimize, convert, fit, merge, and more.

