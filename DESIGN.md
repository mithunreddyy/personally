# DESIGN.md: Mithun Reddy Portfolio

**Status:** owner-directed redesign, October 2026. The owner asked for the structure and restraint of shedsgns.me, made personal. Values below come from `src/index.css` and the components.

## Identity

A personal index for a full-stack engineer: a short introduction, then plain lists of projects, experience, stack, and writing. It reads like a well-kept text file. Nothing on the page competes with the words.

What makes it his, not the reference:
- The greeting line uses the live time in Hyderabad ("good evening from Hyderabad, where it's 19:42").
- A neutral charcoal dark theme (not pure black) by default, a cool off-white light theme, and the blue accent.
- Keyboard shortcuts (M, V, D, T, ⌘K) and the command menu.

## Dials

ENERGY 2 / RHYTHM 1 / MOTION 2.

Design Read: *"Reading this as: personal index and blog for engineers and hiring managers, in a quiet text-first list style with one recurring character and Apple-style controls, dial ENERGY 2 / RHYTHM 1 / MOTION 2."*

ENERGY and MOTION went from 1 to 2 in November 2026 at the owner's request: a walking stick figure at the top of the intro, and Apple-inspired controls (glass dock, status pill, keycaps). The words still lead; the character and the controls sit around them, never in the reading column's text.

RHYTHM went from 1 to 2 in October 2026, then back to 1 the same month, when the owner asked for Projects and Writing to follow the shedsgns.me row: one line per entry, name left, muted detail right. Every section now keeps the same frame (muted label, rows, no divider).

## Palette

Dark is the default, set by the October 2026 owner request for "less black": a neutral charcoal instead of near-pure black, which is easier on the eyes over long reading. Light is a working toggle through `data-theme="light"` on `:root`, and a visitor's choice is remembered. `color-scheme` and the `theme-color` meta follow the active theme.

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#040404` | `#f6f7f9` |
| `--color-ink` | `#ececec` | `#15171a` |
| `--color-body` | `#b0b0b0` | `#4f4f4f` |
| `--color-muted` | `#7a7a7a` | `#707070` |
| `--color-line` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |
| `--color-accent` | `#3B82F6` | `#2563EB` |

- Ink: names, links, the first-person name in the intro.
- Body: prose, meaning the intro paragraphs, the shortcuts line, the Connect and RSS sentences, the 404 text, the CV role bullets, and article prose.
- Muted: the greeting, section labels, dates, detail columns, empty states.
- Body and muted are shedsgns.me's `--text` and `--text-muted`, taken as-is on 31 October 2026 at the owner's request. The one exception is light `body`: their `#000` came out darker than `ink`, so the intro read as solid black and the ink words looked lighter than the text around them. It is `#4f4f4f`, the mirror of dark `#b0b0b0`, so prose sits under ink in both themes. Muted was later lifted at the owner's request (November 2026) from shedsgns.me's 4.0:1 dark and 2.5:1 light to `#7a7a7a` (4.8:1) and `#707070` (4.6:1), so the greeting, labels, dates, and dimmed titles now pass WCAG AA. It still sits well under body (9.5:1 and 7.6:1), so the ink, body, muted order holds.
- Accent: only the focus ring and the "copied" check. Nowhere else.
- The ballpoint-blue `--color-pen` token left with the signature it was made for (November 2026). The walker uses `ink` and `muted`, so the palette is back to neutrals plus the focus accent.

## Typography

- One face, Inter (variable, weights 100 to 900 with optical sizing), for everything. Owner's choice, October 2026, replacing Hanken Grotesk. Optical sizing is on, so the 11px clock and the 15px body are each drawn for their size. Self-hosted from `@fontsource-variable/inter` (November 2026) instead of Google Fonts, so no third-party stylesheet blocks first paint; the Latin file is preloaded, and the italic loads only with blog posts.
- One size: 15px, line-height 23px, everywhere: body, labels, list rows and their dates, meta lines, the command menu. The greeting line alone stays at the reference's 14px / 22px. Below 360px the row details drop to 13.5px / 19px. Article prose (blog posts and `/work/:slug`) uses the same 15px / 23px and the `body` colour, so it follows any change to the shared size. Hierarchy comes from color (ink against muted), not from size or weight.
- Scale origin: shedsgns.me's sizes, taken exactly from its live stylesheet on 31 October 2026 (`body`, `.greetings`, `.information p`, `.link-section h2`, `.link-row`, `.dates` are all 14px / 22px). The same day the owner raised every size 1px above the reference except the greeting, which keeps the exact 14px / 22px.
- The CV clock and the visit count: 11px / 20px (10.5px at 720px and below), tracked 0.02em.
- Article contents rail (issue number and headings): 13px / 19px only when it is pinned to the left at 1180px and wider. Below that it sits in the column above the title at the shared 15px / 23px.
- Article text at 720px and below is justified with automatic hyphenation (`.prose-flow` in `src/index.css`), so each line fills the narrow column without wide gaps between words. Wider screens keep ragged-right text.
- Code blocks: 14px / 23px (13px / 21px at 540px and below), language label and Copy button 12px, inline code 0.88em.
- Print styles keep their own sizes, set for the A4 PDF.
- Code in blog posts uses Geist Mono (400 and 500, Latin), self-hosted and loaded only with the blog post chunk. JetBrains Mono, the unused second mono face, was dropped.
- The hero has no display type: its one image is the walker (see Components), so Inter stays the only face.

## Layout

- One column, 540px wide with 30px side gutters; at 720px and below it is up to 560px with 32px gutters (20px under 360px). 120px top padding (64px at 720px and below), 144px bottom padding to clear the dock.
- Spacing: the greeting sits at the top of the column, 14px above the first paragraph, and paragraphs are 12px apart (12 and 10 on phones). The intro and each section end with 40px before the next label; the CV header and the article header and body end with 28px. Labels sit 14px above their content, rows are 6px apart in every list, Projects and Writing included.
- No dividers between sections. Owner decision, October 2026, for a more minimal page: whitespace and the muted label do the separating.
- Article pages start at the same 120px as the index; the pinned rail sits at 120px from the top.
- Every section is the `Section` component in `src/components/List.tsx`: a muted label, then content.
- List rows are the `Row` component: name left, detail right in muted, at the body size. Below 360px the detail drops under the name at 13.5px / 19px.
- **Projects** are one line each: the title (with its arrow) on the left and the project's month on the right (`date` in its frontmatter, shown in lowercase as "may 2026"). The `summary` stays in the frontmatter but no longer shows on the index. An "All" link sits on the right of the section label and opens the GitHub repositories list. Details live on `/work/:slug`.
- **Writing** uses the same row: the post title on the left, the read time on the right. Titles are short and in sentence case ("Caching in layers"), so each fits on one line.
- **Focus by colour** (`.focus-index` in `src/index.css`): hovering or focusing an entry in Projects or Writing turns the other titles from ink to muted. Colour, not opacity, so dimmed titles take the muted token.
- Article pages (blog posts and `/work/:slug`) use `Article` in `src/components/Article.tsx`. At 1180px and wider, the back link, issue number, and contents are pinned to the left edge. On narrower screens they sit above the title.

- The CV page (`/cv`) follows the same shapes. The header puts the name and an "Updated" date on the left and the email with its copy button on the right. Below it come Currently, Experience, then Earlier and Education as `CollapsibleSection` ("+" turns into "×"), a Download PDF link, and a live GMT+5:30 clock at 12px. Its entries come from `content/cv.md`, one `name | detail | line underneath | place` per line. The place ("Hyderabad, India") sits on the right of the line underneath in every section, Experience included. Below 480px the right-hand column goes away: each entry reads name (with its toggle), role, then one muted line of "dates, place" (`PhoneMeta` in `src/components/List.tsx`), so company names never break.

## Components

- **Links:** the `.link-line` class. A resting 1px `line` underline that fills with ink from the left in 0.38s on hover and keyboard focus. This is the identity motif: every link on every page uses it.
- **Arrow (↗):** the `Arrow` component in `src/components/List.tsx`, drawn like the shedsgns.me icon, 0.62em, in ink. It is invisible until its link is hovered or keyboard-focused, then fades in; it takes no room at rest (so "GitHub." never reads "GitHub  ."), and its box opens over 0.2s on hover or focus, which nudges any text after it in a sentence by under 1em. Touch screens without hover don't show it. It appears after project titles and after links that leave the site (GitHub, LinkedIn, the PDF view, RSS, project URLs; `TextLink` adds it to any http URL). Internal links (CV, blog posts, download) stay plain so the arrow keeps one meaning. The underline stays on the text only. Owner decision, October 2026: R-08 was raised and the owner chose this scope over arrows on every link.
- **Theme toggle:** a single icon fixed top-right, 44px tap target.
- **Dock:** fixed bottom centre on a glass surface (see Shape and depth), round 44px icons for email, GitHub, and LinkedIn, plus a back-to-index icon on every page except home. As in the macOS Dock, each icon's name rises above it in an `ink` pill on hover or keyboard focus, and with a mouse the icons swell toward the pointer (up to 30%, fading out over 72px) from their base. Touch and reduced motion get no magnification.
- **Stack (CV page only, between Experience and Earlier):** one flat row of 24px logos from `public/stack/`, masked to the `muted` colour (`ink` on hover) so they follow the theme instead of showing brand colours. Each logo carries its name as `aria-label` and a hover title.
- **Experience rows (CV page only):** a "+" toggle that turns into "×" and opens the role's bullets.
- **Command menu (⌘K):** a plain text list with no icons or shadow, on the same glass as the dock. It and the Motion library load on the first ⌘K, not with the page.
- **Skip link:** "Skip to content" appears top-left on the first Tab and jumps to `main`.
- **Shortcut feedback:** every shortcut confirms in the status pill: "Copied <email>" (only after the clipboard accepts it), "Light appearance" or "Dark appearance", "Resume opened in a new tab", "Resume downloading".
- **Visit count:** the home page ends with one muted line, "1,284 visits", at the CV clock's 11px. Each browser session counts once. The number comes only from the worker's counter; when it can't be reached (local dev, the GitHub Pages backup), the line stays empty instead of showing a guess.
- **RSS:** `/feed.xml` is generated from `content/blog/` by `vite-plugin-feed.ts`, linked in the page head and in one sentence under Writing on the index.
- **Favicon:** the site's mascot, one character and nothing else (November 2026, owner request; it replaced the peeking creature, then a striding M, then a lowercase m over an underline, none of which fit the page). He is the hero walker's cousin: a big upright head on two straight legs, mirrored about one vertical axis, so he reads as calm and ready to go. No tile, no letters, no ground line. Built like a Figma component on a 32 grid: head circle r8 at (16, 12.4); two plain eye holes 3.5 by 4.6 cut from it (even-odd, so the tab shows through) at x 13.4 and 18.6, with no pupils; legs are one 3.1-wide round-capped straight stroke each, from the hips at x 14.5 and 17.5 to the feet at x 10.9 and 21.1. Every part mirrors about x = 16, and the measured bounding box centres at exactly 16.0. The whole figure is then centred on the grid by its measured bounding box (vertical shift only, -1.18). One flat fill, no gradients or effects, so it imports cleanly as vector. `favicon.svg` has no background and switches ink with the tab, `#15171a` on light and `#ececec` on dark. `favicon.ico` carries mid-grey `#8c8c8c` (legible on both) at 16, 32 and 48px; the 16px frame is drawn pixel by pixel (9px head, 2px legs mirrored about the head's centre column, eyes as 1 by 2 holes) because scaling the vector down turned the legs to mush. `apple-touch-icon.png` is the full-bleed charcoal square at 78% scale (iOS rounds it); `icon-192.png` and `icon-512.png` use 62% so he stays inside the maskable safe zone under circle and squircle crops. Bump the `?v=` in `index.html` and `manifest.json` whenever it changes.
- **Walker:** the top of the intro is a stick figure walking along a path (`src/components/Walker.tsx`), replacing the hand-traced signature in November 2026 at the owner's request. He walks in place while the path slides under him; one step is 0.55s, and the track dashes and grass tufts move exactly one stride (19.9 units) per step, so the planted foot never skids. The far arm and leg are drawn at 45% so the figure has depth without a second colour. The path fades in and out at its ends. Figure in `ink`, ground in `muted`. 176px wide (160px at 720px and below). He pauses when scrolled out of view. He is a button ("Wave at the walker"): tapping him stops him mid-stride to wave for 2.4s, and the status pill says "Hi, thanks for stopping by" so the moment reaches screen readers too.
- **Walker's sky:** his scene keeps Hyderabad time, the same clock as the greeting, in a sky band above his head (the scene is 200 by 90 units, so the walker is 176px wide and about 79px tall). From 6:00 to 18:30 a small ink sun travels an arc from low on the right, ahead of him, through the top of the band, to low on the left behind him; it rises and sets inside the sky, never on the path. His shadow falls away from it, long near the horizon and short at noon. After dark a crescent moon takes the same arc over nine stars of three sizes, every third one twinkling slowly and out of step, and he carries a lantern that swings with his hand. It updates every minute and is drawn only in the browser, so the prerendered page carries no build-time sky. A visitor in another time zone sees Hyderabad's sky, not their own.
- **Walker at rest:** after 40 seconds with no input he sits down on a stone, elbows on his knees and chin in his hand, and the path stops with him, so an idle tab does no animation work. Any key, scroll, pointer move or tap stands him back up. Both moves ease over 0.52s from whatever pose he is in (`morph` in Walker.tsx), so he never snaps. Tapping him while he rests stands him up first, then he waves. Reduced motion skips resting altogether.
- **Lost walker:** the 404 page (`LostWalker.tsx`) shows the same figure where the path breaks off into a few scattered pieces, scratching his head in short bursts while a question mark rises and fades. Same strokes and colours, so it reads as one character.
- **Reading path:** blog posts carry a path pinned to the top of the screen once the title has scrolled away (`ReadingPath.tsx`), lined up with the reading column, on a band of `bg` that fades out below it. It is the hero's world in small: a solid path over a dashed track, fading in from the left, with quarter markers like distance posts, and the hero's own figure at 40px tall with the same stride. He stands at the reader's progress, measured where the eye is (60% down the screen); the end is where the last line reaches that eye line, or the bottom of the page when a tall window or short post can't scroll that far, so he always arrives. The scroll is his clock: every pixel he travels plays exactly that much of the hero's walk cycle (one step per 12.8px), so his planted foot holds still at any scroll speed, slow scrolling is slow deliberate steps, a flick is a stride, and stopping freezes him mid-step. Scrolling back turns him round. Each step leaves a small ink print on the path that fades over 2.4s. At the end he turns to face back along the path and settles onto the bench. The path ends at a park bench with a scrolled armrest under a street lamp. When the post is finished he is sitting on the bench, legs crossed, reading a book and swinging the crossed foot, and the lamp lights: the bulb fills and dashed rays fall to the path. Iron work in `muted`, figure and light in `ink`, so both themes hold. On phones the track stops short of the theme toggle. It is decorative and `aria-hidden`; the scroll position already tells assistive tech where the reader is.
- **Status pill:** `Island.tsx`, in the spirit of the Dynamic Island. An `ink` capsule with `bg` text (it inverts with the theme, about 17:1 either way) at the top centre, below the safe area. It confirms things that have no on-screen control of their own: the M, T, D and V shortcuts and the walker's wave. It grows in on a slight spring, holds 2.2s, and folds back. A check marks a confirmation; a waving hand marks the greeting. It is a polite live region, so every message is read out. Copy buttons that sit next to what they copy (email, code, link) keep their own inline feedback instead, as the HIG asks for feedback near the thing it describes.
- **Keycaps:** the shortcut letters are `.keycap` keys: 12px, a 1px border at 20% ink with a 2px lower edge, 5px radius. Holding a shortcut key flattens its cap, so the reader sees which key registered.

## Shape and depth

- No shadows anywhere.
- Glass on the two floating controls only, the dock and the command menu, never in the content: `bg` at 68% (80% for the menu) with a 22px blur and 1.6x saturation, and a 1px `line` border. Reduced transparency, or a browser without backdrop blur, gets solid `bg`.
- Radius: the dock, its icons, the status pill and the dock labels are fully round; the command menu is 12px; keycaps are 5px. Nothing else has a radius.
- No section dividers. The 1px `line` border is kept only on the dock, the command menu and code blocks, where it outlines a surface.

## Motion

- Entrance: each block fades up 4px once on load (`.appear`, 0.6s), staggered 40ms apart through `--appear-delay`.
- The walker loops for as long as he is on screen and someone is there: off screen he pauses, and after 40 idle seconds he sits down and everything stops, twinkling stars included (owner request; see Resolved conflicts). The reading path's walker has no clock of his own: his stride is scrubbed by the scroll position, and his foot swings only once he is seated. The lost walker's scratch and head tilt loop on the 404 page. All transform or opacity only.
- The status pill springs in (0.5s, slight overshoot) and folds out in 0.26s. Dock magnification follows the pointer with a 0.2s ease. Keycaps press in 0.08s.
- Interaction: the link underline fill, the focus-by-colour fade in Projects and Writing (0.3s), the experience toggle (0.3s height), and the command menu fade.
- Reduced motion turns off the entrance, the walking (he stands mid-stride; a wave is a raised arm), resting, the twinkle, the reading path's stride, footprints and the seated foot swing (he still moves along the path, standing, and the lamp still lights), the lost walker's loops, the pill's spring, dock magnification and the underline transition. The sky still shows, because it is a picture of the time, not motion. Print shows the walker standing.

## Resolved conflicts with antislop

1. Radial accent spotlight on `body::after`: removed in this redesign.
2. Uppercase mono labels with wide tracking: removed. Labels are now sentence case in the body face.
3. Lucide icons: kept only where a glyph names a real destination or action (mail, GitHub, LinkedIn, back, theme, copy), plus the check and hand in the status pill, which mark what kind of message it is.
4. Endless loop (R-19, Endless Pulses and Loops): the walker keeps walking while someone is looking. Owner's explicit request ("keep walking"), November 2026, kept as an override. Limits: transform-only, paused off screen, he sits down after 40 idle seconds, and he stands still under reduced motion.
5. Glass (R-10): on two elements only, both in the floating control layer, which is the dose cap and where Apple's guidance puts the material.
6. Theme toggle against Apple's dark-mode.md ("Avoid offering an app-specific appearance setting"): kept, with dark as the default, because both are the owner's earlier decisions. Following the system appearance until a visitor chooses would be the HIG's answer.

## Antislop checks for this design

- No em dashes in UI text (R-02).
- Mobile: no horizontal overflow, 44px tap targets (R-03).
- Every stat, testimonial, and claim is real or removed (R-17, R-18, R-36).
- Every link has a real destination (R-24).
- Light and dark both verified (R-34).
