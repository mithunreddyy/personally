---
title: "the gpu in your tab"
date: 2026-11-04
category: "Tech"
excerpt: "Every major browser now gives web pages real access to the graphics chip. That means games, yes, but also AI models that run on your own device, with nothing sent to a server."
published: true
---

Your laptop has a chip in it that can do thousands of small calculations at the same moment. It draws your games and your video calls, and it's the same kind of chip AI companies fill data centres with. Until recently, a web page could barely reach it.

That changed quietly. Since late 2025, WebGPU has worked in every major browser, and it may be the most important thing the web gained this decade that most people haven't heard of.

## what we had before

Web pages have been able to draw with the graphics chip since WebGL arrived around 2011. WebGL was modelled on OpenGL ES, a graphics standard designed for the phones of the late 2000s. It drew triangles well. Asking it to do anything else, like the matrix maths behind machine learning, meant disguising your numbers as the pixels of an image, drawing the image, and reading the pixels back. People did it, and it was as awkward as it sounds.

## what webgpu changes

WebGPU is modelled on the graphics interfaces modern chips actually speak: Vulkan, Metal and Direct3D 12. The web.dev announcement lists what that brings:

- **Compute pipelines.** A page can send the chip general maths to do, with no pretending it's a picture. This is the big one.
- **WGSL**, a text-based shader language written for the web.
- **Render bundles**, which record drawing commands once and replay them, so the main processor does less work every frame.

Starting looks like this:

```js
const adapter = await navigator.gpu?.requestAdapter();
if (!adapter) {
  // no WebGPU here: fall back to WebGL, the CPU, or a server
}
const device = await adapter.requestDevice();
```

## where it runs

Chrome shipped WebGPU first, in 2023. In November 2025 web.dev announced it was supported across Chrome, Edge, Firefox and Safari. Safari has it on macOS, iOS, iPadOS and visionOS 26. Firefox has it on Windows from version 141 and on Apple-silicon Macs running macOS Tahoe from version 145, and at the time of that announcement Linux, Android and Intel Macs were still in progress. So check before you rely on it, and always keep a fallback.

## the part that matters most: models on your device

The web.dev announcement says the compute pipeline greatly improves machine learning inference and training in the browser, including running large language models. Two widely used libraries already use it: ONNX Runtime and Transformers.js.

With Transformers.js, running a model on the visitor's own graphics chip is a single option:

```js
import { pipeline } from "@huggingface/transformers";

const embed = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2",
  { device: "webgpu" },
);
const vectors = await embed("caching in layers");
```

That small model turns text into numbers you can compare, which is enough to build search by meaning over your own notes. The text never leaves the page.

This flips how AI features usually work. Normally every request travels to a company's servers, costs them money, and puts your data on their machines. A model running in the tab costs the website nothing per use, works offline once it's downloaded, and keeps private text private by default.

## the honest limits

- **Downloads.** Even small models are tens to hundreds of megabytes. They're fine for a tool people return to, and too heavy for a page someone visits once.
- **Uneven hardware.** A gaming laptop and a five-year-old phone are very different machines. The same model can be instant on one and unusable on the other.
- **Memory.** Browsers cap how much graphics memory a page may use, and large language models need a lot.

So the realistic sweet spot today is small, focused models: search by meaning, background removal from photos, speech to text, translation, classifying what you type as you type it. Big chat models mostly stay on servers, for now.

## why it's worth knowing

For most of the web's history, a page asked the server to do anything difficult. WebGPU moves a real share of that work back onto the device in your hand, the one you already paid for. Websites can be faster, cheaper to run, and more private, all at once.

The chip was always there. Now the page is allowed to use it.

## sources

- [WebGPU is now supported in major browsers](https://web.dev/blog/webgpu-supported-major-browsers), web.dev, 25 November 2025
- [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API), MDN
- [Transformers.js](https://huggingface.co/docs/transformers.js), Hugging Face
