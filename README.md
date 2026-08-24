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

## The library

`/library` is a public view of the `Books.base` folder in Obsidian, listed as an
entry on the Projects page rather than in the main nav. It's the one part of the
site that isn't authored here — the vault is the source of truth, and a script
pulls a snapshot into the repo:

```sh
pnpm books              # re-import from Obsidian, fetching any new covers
pnpm books --no-fetch   # re-import metadata only, reuse cached covers
```

That reads `E01_Books/*.md` (override the path with `BOOKS_VAULT=…`) and writes:

- `src/data/books.json` — one record per book, **frontmatter only**. Note bodies
  are never read, so private reading notes and `[[wikilinks]]` to personal notes
  can't leak into the site.
- `public/images/books/` — every cover, cached locally so no page hotlinks
  OpenLibrary or Google Books. Placeholders (1x1 GIFs, "image not available"
  banners, HTML error pages) are rejected; books without a usable cover get a
  typographic fold instead, and the script prints their names so you can fix
  them in Obsidian.

Along the way it normalizes the vault's inconsistencies: strips the
`# physical / digital / both` template comment out of `format`, flattens
`"[[Aldo Leopold]]"` to a plain name, flips `Lowry, Erin` to `Erin Lowry` (but
leaves `Grant Morrison, Frank Quitely` alone — that's two authors, not an
inversion), and splits `Literary Fiction/Comedy` into two genres.

Visitors can request any book. Requests go to [Formspree](https://formspree.io):
create a form, then put its ID in `FORMSPREE_ID` in `src/consts.ts`. Until you
do, the request button falls back to a prefilled `mailto:` link, so the feature
works either way.

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
