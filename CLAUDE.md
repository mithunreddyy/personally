# CLAUDE.md

Personal portfolio for Mithun Reddy: case studies, an editorial blog, and a live availability status. Stack: React 19, Vite, TypeScript, Tailwind CSS v4, Motion, Lenis, Markdown content files, GitHub Pages.

## Commands

- `npm run dev`: dev server on port 3000
- `npm run build`: production build
- `npm run lint`: type check (`tsc --noEmit`)
- Deploy: pushing to `master` runs `.github/workflows/deploy-pages.yml`, which publishes to https://mithunreddyy.github.io/Portfolio/. Production builds use the `/Portfolio/` base, so reference files in `public/` through `import.meta.env.BASE_URL`, not a bare `/`.

No database, forms, or environment variables are used.

## Layout

- `src/components/`: page sections and views (Hero, Projects, Experience, Blog, BlogPostView, NotFound, Dock, and others)
- `content/`: all site content as Markdown with frontmatter (`profile.md`, `skills.md`, `experience/`, `projects/`, `blog/`). Edit these to change details.
- `src/lib/content.ts`: parses `content/` at build time; `src/constants.ts` re-exports it
- `src/index.css`: Tailwind theme tokens and the editorial blog styles

## Design

- Direction lives in `DESIGN.md`. Read it before any UI, copy, or layout work.
- Colors, fonts, and radii come from the `@theme` tokens in `src/index.css`. Do not hardcode new colors.
- Dark (neutral charcoal `#161616`, not pure black) is the default. Light is a working toggle via `data-theme="light"`. Test both.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, use the `antislop` skill (core) together with the matching skill:
- UI / visual: `antislop-ui`
- Copy & text: `antislop-copywriting`
- People: `antislop-human`
- Mobile / responsive: `antislop-layoutmobile`
- Code comments: `antislop-code`

Read `DESIGN.md` for direction first. Then apply the core filter.
Before the first antislop edit in a session, state the active mode (`during` or `after`) and its source.
<!-- antislop:end -->
