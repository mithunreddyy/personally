---
title: "writing all at once"
date: 2026-11-20
category: "AI"
excerpt: "Most language models write like a typewriter, one word after another. Diffusion models develop the whole passage at once, like a photo coming up in a darkroom tray. Here's how that works, and why it's so fast."
published: true
---

Every chatbot you've used writes the same way a typewriter does. It picks one token (roughly a word, or part of one), then the next, then the next, and each choice depends on everything before it. It can't go back. If the third word was a poor choice, the other ninety-seven have to live with it.

There's another way to write, borrowed from image generators, and it has started to show up in real products. Instead of a typewriter, think of a photograph in a darkroom tray. The whole picture is there from the start as a grey blur, and it sharpens everywhere at once.

That's a diffusion language model.

## the typewriter's problem

The usual kind of model is called autoregressive: it feeds its own output back in as input, one step at a time. That's simple and it works very well. It also has a cost that grows with the length of the answer. A 2,000-token reply takes about twice as long as a 1,000-token one, because there are twice as many steps, and none of them can start before the one before it finishes.

Each of those steps is also wasteful on the hardware. To produce one token, the chip reads every one of the model's billions of weights from memory, does a small amount of maths with them, and throws the result away to start again. Most of the time goes on moving weights, not on thinking. In the jargon, the work is bound by memory bandwidth.

## developing the photo

A diffusion model starts with a block of placeholder tokens, a sentence-shaped blur. In each step it looks at the whole block and replaces some of the blur with guesses, keeping the guesses it's confident about and leaving the rest for later. Step by step the passage comes into focus.

```
step 1   [ ]   [ ]   [ ]   cat   [ ]   [ ]
step 2   the   [ ]   [ ]   cat   sat   [ ]
step 3   the   old   grey  cat   sat   down
```

That example is a simplification, but the shape is right. Two things fall out of it.

**It's parallel.** Each step works on many tokens at once, so a passage needs far fewer passes through the model than it has tokens. More maths happens for every weight read from memory, which is exactly what graphics chips are built for.

**It can change its mind.** Because the model sees the whole block on every step, a later step can fix an earlier word that no longer fits. A typewriter can't do that.

## what has shipped

Google DeepMind showed **Gemini Diffusion** at Google I/O in May 2025 as an experimental model. Its page describes its benchmark performance as "comparable to much larger models, whilst also being faster", and it's still offered as an experimental demo.

The more practical news is **DiffusionGemma**, an open model Google built on its Gemma 4 family and its Gemini Diffusion research. Google says it generates "up to 4x faster token output on dedicated GPUs", with more than 1,000 tokens a second on a single NVIDIA H100 and more than 700 on a GeForce RTX 5090. The reason Google gives is the one above: diffusion shifts the bottleneck from memory bandwidth to compute.

Outside Google, the startup Inception Labs sells diffusion language models under the name Mercury, so this is no longer a single-lab experiment.

## where the typewriter still wins

Diffusion models aren't a free upgrade yet.

- The best autoregressive models are still ahead on the hardest reasoning tasks. The fast diffusion models are compared with smaller, cheaper models, not with the frontier.
- The model has to decide roughly how long a block is before it fills it in, which fits short, bounded jobs better than long open-ended writing.
- Fewer steps means faster output but rougher text. Every product has to pick where to sit on that trade.

So for now, think of diffusion as the right tool when speed matters more than the last few points of quality: autocomplete, code edits, quick drafts, and agents that make hundreds of small calls where each wait adds up.

## why it matters anyway

For years, "faster AI" meant bigger chips or smaller models. Diffusion is a third option: change the way the model writes. If it keeps improving, the delay between asking and reading could shrink to almost nothing for everyday tasks, on hardware you already own.

Typewriters gave way to word processors, and nobody misses typing the whole page again to fix one word.

## sources

- [Gemini Diffusion](https://deepmind.google/models/gemini-diffusion/), Google DeepMind
- [DiffusionGemma: 4x faster text generation](https://blog.google/innovation-and-ai/technology/developers-tools/diffusion-gemma-faster-text-generation/), Google
