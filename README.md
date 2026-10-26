# Mithun Reddy

Personal portfolio and blog. Project case studies, an editorial blog, and an availability status. All content is Markdown in `content/`, bundled at build time. There is no database.

## Stack

- React 19, Vite, TypeScript
- Tailwind CSS v4
- Motion for animation
- Hanken Grotesk for text, Geist Mono for metadata
- Lucide React for icons
- Open-Meteo for the temperature shown in the blog reader

## Editing content

| File | What it holds |
|---|---|
| `content/profile.md` | Name, role, links, resume path. The body is the intro summary. |
| `content/skills.md` | One `##` heading per category, one bullet per skill. |
| `content/experience/*.md` | One file per role. Bullets are the highlights. |
| `content/projects/*.md` | One file per project. Bullets are the description. |
| `content/blog/<slug>.md` | One file per post. Set `published: false` to hide it. |

The number prefix on experience and project filenames (`01-`, `02-`) sets their order. Blog posts sort by date.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint    # type check
```


## Layout

```text
content/        Markdown source for everything on the site
src/
  components/   Sections and views
  hooks/        usePortfolioData, useTheme
  lib/          content.ts (Markdown loader), utils.ts
  index.css     Theme tokens and blog styles
DESIGN.md       Design direction
```
