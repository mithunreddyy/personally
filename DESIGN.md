# DESIGN.md: Mithun Reddy Portfolio

**Status:** owner-directed redesign, October 2026. The owner asked for the structure and restraint of shedsgns.me, made personal. Values below come from `src/index.css` and the components.

## Identity

A personal index for a full-stack engineer: a short introduction, then plain lists of projects, experience, stack, and writing. It reads like a well-kept text file. Nothing on the page competes with the words.

What makes it his, not the reference:
- The greeting line uses the live time in Hyderabad ("good evening from Hyderabad, where it's 19:42").
- A neutral charcoal dark theme (not pure black) by default, a cool off-white light theme, and the blue accent.
- Keyboard shortcuts (M, V, D, T, ⌘K) and the command menu.

## Dials

ENERGY 1 / RHYTHM 2 / MOTION 1.

Design Read: *"Reading this as: personal index and blog for engineers and hiring managers, in a quiet text-first list style, dial ENERGY 1 / RHYTHM 2 / MOTION 1."*

RHYTHM moved from 1 to 2 in October 2026, when the owner asked for Projects and Writing to be distinct. Every section keeps the same frame (hairline, muted label, content); only Projects and Writing break the plain row, each with a shape that fits its content.

## Palette

Dark is the default, set by the October 2026 owner request for "less black": a neutral charcoal instead of near-pure black, which is easier on the eyes over long reading. Light is a working toggle through `data-theme="light"` on `:root`, and a visitor's choice is remembered. `color-scheme` and the `theme-color` meta follow the active theme.

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#040404` | `#f6f7f9` |
| `--color-ink` | `#ececec` | `#15171a` |
| `--color-muted` | `#a3a3a3` | `#636872` |
| `--color-line` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |
| `--color-accent` | `#3B82F6` | `#2563EB` |

- Ink: names, links, the first-person name in the intro.
- Muted: section labels, prose, dates, detail columns.
- Accent: only the focus ring and the "copied" check. Nowhere else.

## Typography

- One face, Inter (variable, weights 100 to 900 with optical sizing), for everything. Owner's choice, October 2026, replacing Hanken Grotesk. Optical sizing is on, so the 12px clock, the 14px greeting and the 16px body are each drawn for their size.
- One size: 16px, line-height 24px, everywhere: body, labels, list rows, meta lines, the command menu. Article prose is 16px with a 26px line-height for long reading. Hierarchy comes from color (ink against muted), not from size or weight.
- Scale origin: matched to shedsgns.me (14/22 body, 10/20 clock, computed styles read from the live site, October 2026), then the owner raised everything 2px except the greeting line.
- The greeting line ("good night from India, where it's 23:22") stays at the reference 14px / 22px, a quiet lead-in above the 16px intro.
- The CV clock: 12px / 20px (11.5px on phones), with `GMT+5:30` tracked 0.04em.
- Geist Mono is still loaded in the theme but no longer used in the UI.

## Layout

- One column, 600px max, 20px side gutters, 120px top padding (64px on phones), 144px bottom padding to clear the dock.
- Every section is the `Section` component in `src/components/List.tsx`: a 1px `line` divider, a muted label, then content.
- List rows are the `Row` component: name left, detail right. Below 480px the detail drops under the name.
- **Projects** are the title and one muted line each (`summary` in the project's frontmatter), modelled on nublson.com, with no logos or marks. An "All" link sits on the right of the section label and opens the GitHub repositories list. Details live on `/work/:slug`.
- **Writing** is a ledger: the year hangs in a left column, shown once beside the first post of that year, then title and a muted "category, read time" line. Posts read as a timeline, not a pile.
- **Focus by colour** (`.focus-index` in `src/index.css`): hovering or focusing an entry in Projects or Writing turns the other titles from ink to muted. Colour, not opacity, so dimmed titles keep AA contrast.
- Article pages (blog posts and `/work/:slug`) use `Article` in `src/components/Article.tsx`. At 1180px and wider, the back link, issue number, and contents are pinned to the left edge. On narrower screens they sit above the title.

- The CV page (`/cv`) follows the same shapes. The header puts the name and an "Updated" date on the left and the email with its copy button on the right. Below it come Currently, Experience, then Earlier and Education as `CollapsibleSection` ("+" turns into "×"), a Download PDF link, and a live GMT+5:30 clock at 12px. Its entries come from `content/cv.md`, one `name | detail | line underneath | place` per line. The place ("Hyderabad, India") sits on the right of the line underneath in every section, Experience included. Below 480px the right-hand column goes away: each entry reads name (with its toggle), role, then one muted line of "dates, place" (`PhoneMeta` in `src/components/List.tsx`), so company names never break.

## Components

- **Links:** the `.link-line` class. A resting 1px `line` underline that fills with ink from the left in 0.38s on hover and keyboard focus. This is the identity motif: every link on every page uses it.
- **Arrow (↗):** the `Arrow` component in `src/components/List.tsx`, drawn like the shedsgns.me icon, 0.62em, in ink. It is invisible until its link is hovered or keyboard-focused, then fades in; it takes no room at rest (so "GitHub." never reads "GitHub  ."), and its box opens over 0.2s on hover or focus, which nudges any text after it in a sentence by under 1em. Touch screens without hover don't show it. It appears after project titles and after links that leave the site (GitHub, LinkedIn, the PDF view, RSS, project URLs; `TextLink` adds it to any http URL). Internal links (CV, blog posts, download) stay plain so the arrow keeps one meaning. The underline stays on the text only. Owner decision, October 2026: R-08 was raised and the owner chose this scope over arrows on every link.
- **Theme toggle:** a single icon fixed top-right, 44px tap target.
- **Dock:** fixed bottom center, a 1px `line` border on `bg`, round 44px icons for email, GitHub, and LinkedIn. A back-to-index icon appears on every page except home.
- **Stack (CV page only, between Experience and Earlier):** one flat row of 24px logos from `public/stack/`, masked to the `muted` colour (`ink` on hover) so they follow the theme instead of showing brand colours. Each logo carries its name as `aria-label` and a hover title.
- **Experience rows (CV page only):** a "+" toggle that turns into "×" and opens the role's bullets.
- **Command menu (⌘K):** a plain text list, with no icons, shadow, or blur.
- **Skip link:** "Skip to content" appears top-left on the first Tab and jumps to `main`.
- **Shortcut feedback:** pressing M confirms "Copied <email>." in ink at the end of the shortcuts line for 2s, only after the clipboard accepts it.
- **Visit count:** the home page ends with one muted line, "1,284 visits", at the CV clock's 12px. Each browser session counts once. The number comes only from the worker's counter; when it can't be reached (local dev, the GitHub Pages backup), the line stays empty instead of showing a guess.
- **RSS:** `/feed.xml` is generated from `content/blog/` by `vite-plugin-feed.ts`, linked in the page head and in one sentence under Writing on the index.

## Shape and depth

- No shadows anywhere.
- Radius: the dock and its icons are fully round; the command menu is 12px. Nothing else has a radius.
- Depth comes only from the 1px `line` hairlines.

## Motion

- Entrance: each block fades up 4px once on load (`.appear`, 0.6s), staggered 40ms apart through `--appear-delay`.
- Interaction: the link underline fill, the focus-by-colour fade in Projects and Writing (0.3s), the experience toggle (0.3s height), and the command menu fade.
- Reduced motion turns off the entrance and the underline transition.

## Resolved conflicts with antislop

1. Radial accent spotlight on `body::after`: removed in this redesign.
2. Uppercase mono labels with wide tracking: removed. Labels are now sentence case in the body face.
3. Lucide icons: kept only where a glyph names a real destination or action (mail, GitHub, LinkedIn, back, theme, copy).

## Antislop checks for this design

- No em dashes in UI text (R-02).
- Mobile: no horizontal overflow, 44px tap targets (R-03).
- Every stat, testimonial, and claim is real or removed (R-17, R-18, R-36).
- Every link has a real destination (R-24).
- Light and dark both verified (R-34).
