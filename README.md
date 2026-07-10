# Personal site

A minimal, content-first portfolio + blog built with [Astro](https://astro.build).
Light and airy by default, with a warm terracotta accent and a serif reading
column. Ships as static HTML — fast, and free to host.

## Commands

```sh
pnpm install     # install dependencies
pnpm dev         # local dev server at http://localhost:4321
pnpm build       # production build into ./dist
pnpm preview     # preview the production build locally
```

## Where things live

```
src/
  consts.ts              → site title, nav items, social links   ← EDIT ME FIRST
  content.config.ts      → schemas for the writing + poetry collections
  styles/global.css      → the whole design system (colors, type, spacing)
  layouts/               → BaseLayout (shell) + EntryLayout (posts & poems)
  components/            → Header, Footer, ThemeToggle
  pages/                 → one file per route
  data/projects.ts       → your portfolio entries
  content/
    writing/*.md         → blog posts
    poetry/*.md          → poems
public/favicon.svg       → the little terracotta “M”
astro.config.mjs         → set your real `site:` URL before deploying
```

## Adding a blog post

Create `src/content/writing/my-post.md`:

```md
---
title: "My Post"
description: "One line for previews and RSS."
pubDate: 2026-02-01
tags: ["essays"]
draft: false
---

Your writing, in Markdown.
```

The filename becomes the URL: `/writing/my-post/`. Set `draft: true` to hide a
post from the site and feed.

## Adding a poem

Create `src/content/poetry/my-poem.md`. End each line with a `\` for a line
break, and separate stanzas with a blank line:

```md
---
title: "My Poem"
pubDate: 2026-02-01
note: "Optional dedication or note shown beneath the poem."
---

First line here,\
second line here.

A new stanza after the blank line.
```

## Customizing the look

Everything visual is driven by CSS variables at the top of
`src/styles/global.css` — change `--accent`, the background, or the fonts in one
place and it flows through the whole site. Light and dark values live in
`:root` and `:root[data-theme="dark"]`.

## Deploying

This is a static site, so it hosts free on Cloudflare Pages, Netlify, or GitHub
Pages. Build command `pnpm build`, output directory `dist`. Remember to set the
real domain in `astro.config.mjs` (`site:`) so the sitemap and RSS use correct
URLs.
