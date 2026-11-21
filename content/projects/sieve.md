---
date: "2026-11-10"
title: "sieve"
summary: "A local context engine for AI coding agents."
outcome: "On tasks it was not tuned on, Claude Code sessions cost 7% less with it, and all 20 answers stayed correct."
tech:
  - "TypeScript"
  - "Bun"
  - "Go"
  - "SQLite FTS5"
  - "MCP"
link: "https://github.com/mithunreddyy/sieve"
logo: "projects/sieve.svg"
media: "projects/sieve.mp4"
poster: "projects/sieve-poster.webp"
mediaAlt: "Sieve's one-minute film: a tool output archived and answered with a short receipt, the measured results, secret masking, Guard blocking a risky command, and the local dashboard."
mediaSize: "1920 x 1080"
facts:
  - "Works with | Claude Code, verified live. Other agents in preview"
  - "Runs on | macOS and Linux, on your machine"
  - "Status | Pre-1.0, no release published yet"
  - "Licence | Apache-2.0"
scenes:
  - "0:00 | Every turn re-reads every output"
  - "0:04 | Between tool and model"
  - "0:09 | Archive first, receipt back"
  - "0:21 | Cost on held-out tasks"
  - "0:25 | Short notes, exact lines"
  - "0:36 | Secrets masked, runs sandboxed"
  - "0:40 | Blocked before it runs"
  - "0:52 | Local dashboard"
notes:
  - "Results in sieve's README, with every run's raw data in packages/bench/live/results | https://github.com/mithunreddyy/sieve#results"
---

A daemon on your machine archives large tool output and gives the agent a short receipt instead. The agent can search everything it has seen and expand any receipt back to the exact original bytes. Nothing leaves the machine.

## The problem

An AI coding agent runs tools, and everything they print lands in the model's context window. That window is re-read on every later turn, so one 20 KB test log is paid for again and again, long after the one failing line in it has been read.

## How it works

- Archive first: Claude Code hands each tool result to a small Go hook, which passes it over a Unix socket to the daemon. The daemon masks secrets, compresses the text and stores it under the hash of its bytes before it decides anything.
- Receipt back: outputs under about 4 KB pass through. Larger ones come back as a short, deterministic summary with the archive id, and `sieve_get` expands it whole or by line range.
- Never in the way: if the daemon is down, slow or errors, the agent gets the original output unchanged. The hook answers in about 2 ms.
- Cache-safe: a receipt depends on nothing but the output (no clocks, session ids or counters), so it never disturbs the model's prompt cache. A test checks receipts are byte-identical across sessions.

## What I built

- Receipts that know the format: test runners and compilers keep every failure whole and drop the passing lines; git, JSON, HTML, search results and logs each get a summary of their own shape. Errors are never cut.
- Template folding: output no extractor recognises is grouped by line template, numbers folded. Repeated lines print once with a count, and the rare lines print verbatim, which is usually the one that matters.
- A note of matching lines: after a receipt, an 800-byte note carries the exact lines that match the rare words of your last request, so the agent rarely needs a second command.
- Smart reads: a large file's first read returns its outline, an unchanged re-read says so instead of resending it, and a changed file returns only the changed lines.
- Guard and a sandbox: a rule engine reads each tool call before it runs and blocks or asks, for example on piping a download into a shell. `sieve_run` is sandboxed with Seatbelt on macOS and bubblewrap on Linux.
- Search and memory: archived output, files read and the repo's symbols are searchable together, and long-term facts are kept with trust levels.

## Results

- Cost on held-out tasks | 7% lower
- Cost on tuned tasks | 33% lower
- Answers correct, both arms | 50 of 50
- Tokens vs Claude Code | 53% fewer
- Hook round trip at p50 | 2 to 2.5 ms

Cost from Claude Haiku, five paired runs per task; tokens from replaying 35 real outputs. The held-out tasks were written before tuning and run once, so 7% is the number to trust [1].

## What it doesn't do

- Bash output over about 30 KB saves close to nothing in Claude Code, which already shows the model a 2 KB preview. What Sieve adds there is the complete archive and exact expansion.
- Only Claude Code has been run in a live session. Every other agent adapter is a preview, written from documentation.
- Windows has no sandbox, and only macOS arm64 has been run with an agent.
