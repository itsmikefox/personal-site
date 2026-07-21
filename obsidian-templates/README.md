# Obsidian templates for mikefox.com

One template per content category. Draft in Obsidian, then drop the finished
file into the matching folder in this repo.

| Template     | Repo destination        | Shows up on |
| ------------ | ----------------------- | ----------- |
| `poem.md`    | `src/content/poetry/`   | /poetry     |
| `writing.md` | `src/content/writing/`  | /writing    |
| `project.md` | `src/content/projects/` | /projects   |
| `music.md`   | `src/content/music/`    | /music      |

## Setup (one time)

1. Copy the four templates into your vault's templates folder
   (Settings → Templates → Template folder location). **Copy, don't move** —
   this folder is the source of truth and templates get updated here.
2. Make sure the core **Templates** plugin is enabled.

`{{title}}` fills in from the note's filename and `{{date:YYYY-MM-DD}}`
stamps today's date when you insert the template. All frontmatter is plain
properties — no comments — so Obsidian's Properties panel edits it directly.

## Field notes

### Poems (`poem.md`)

- End every line with a backslash (`\`) *except* the last line of each
  stanza — that's how the site renders hard line breaks. Blank line between
  stanzas.
- `pubDate` — when it goes on the site (drives sorting).
- `written` — when the poem was composed, if different: `"2019"` or
  `"2019-03"`. Stored and cited in the structured data, not shown on page.
- `note` — optional line shown beneath the poem (dedication, form).
- `description` — SEO-only one-liner for search snippets and link previews.

### Posts (`writing.md`)

- `description` doubles as the archive excerpt *and* the meta description —
  one sentence, ~150 chars.
- `tags` — a list like `["essays", "notes"]`.
- `ogImage` — optional social share image. Put the file in `public/images/`
  and reference it root-relative (`/images/my-post.png`); links then unfurl
  as a large card on social.
- Add `updatedDate` when you revise a published post (feeds
  `article:modified_time` and the structured data).

### Projects (`project.md`)

- Everything lives in frontmatter — the body isn't rendered.
- `date` — ship date; drives newest-first sorting and the year chip.
- `year` — only set to *override* the displayed year (e.g. `"2023–2024"`).
- Leave `href` as `""` for things without a public link.

### Music (`music.md`)

Each release gets its own page at `/music/<slug>` — the body is the liner
notes / story of the record.

- `artist` — the act it was released as (`"Flesh Of The Stars"`, `"mfox"`).
  Also powers the automatic "More from {artist}" links on album pages.
- `releaseDate` (precise) or `year` (when that's all you know) — drives
  newest-first sorting. The line under the title defaults to
  "artist · year"; set `meta` to override it.
- `genre` — list, shown as tag chips (`["Doom Metal", "Sludge"]`).
- `cover` — cover art; put the file in `public/images/albums/` and reference
  it root-relative. Doubles as the social share image.
- `bandcampId` — the album ID from a Bandcamp embed code; renders an
  embedded player on the album page.
- `bandcamp` / `spotify` / `soundcloud` / `youtube` — paste URLs; each shows
  as a labeled link.
- `credits` — personnel/recording credits, shown at the foot of the album
  page exactly as written. Multi-line: edit this one in source mode, not the
  Properties panel (the panel flattens newlines).
- `description` — SEO-only one-liner for search snippets.
- `order` — tiebreak for same-year releases; lower sorts first (use it to
  put the later release of a year above the earlier one).

## Frontmatter conventions

The schemas are hardened against everything Obsidian's Properties panel
writes, so edit properties in the UI freely:

- **Cleared properties are fine.** Obsidian leaves a bare key (`note:`) when
  you clear a value; the build treats that — and empty strings — as "not set."
- **Dates:** keep `YYYY-MM-DD` (what the templates stamp). Obsidian will
  recognize the property as a date and give you a date picker.
- **`year`/`written` can be numbers.** Obsidian strips quotes (`year: 2025`);
  the build normalizes either way.
- **Let Obsidian reformat.** It may unquote strings or turn `tags: []` into
  a block list (`- essays` on its own line) — all valid, don't fight it.
- **`tags` is special in Obsidian:** values feed its native tag system, so
  no spaces inside a tag (`deep-dives`, not `deep dives`). The site doesn't
  care, but Obsidian will flag them.

## Publishing

1. Set `draft: false` (or delete the property — false is the default).
2. Name the file in kebab-case (`late-november.md`) and copy it into the
   destination folder from the table above.
3. Commit. The build validates frontmatter — a missing required field fails
   loudly, not silently.

Obsidian-specific syntax (`[[wikilinks]]`, embeds, callouts) won't render on
the site — stick to plain markdown links: `[text](https://…)`.
