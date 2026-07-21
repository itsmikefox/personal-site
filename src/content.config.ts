import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// ── Obsidian-friendly field helpers ─────────────────────────────────────────
// Obsidian's Properties panel writes a cleared property as a bare key
// ("note:" → YAML null) and empty text as "". Treat both as "not set" so a
// file that looks fine in Obsidian never fails the build on a technicality.
const blank = (v: unknown) => (v === null || v === "" ? undefined : v);

const optionalString = z.preprocess(blank, z.string().optional());
const optionalDate = z.preprocess(blank, z.coerce.date().optional());
// Required date — preprocessing means an empty "pubDate:" fails with a clear
// "required" error instead of silently coercing null to Jan 1 1970.
const requiredDate = z.preprocess(blank, z.coerce.date());
const tagList = z.preprocess(blank, z.array(z.string()).default([]));
// Press quotes — a list of coverage. Each entry needs an outlet + link; the
// quote and author are optional (a link-only "featured in" entry is fine).
// Edit in Obsidian's source view (YAML list), not the Properties panel.
const pressList = z.preprocess(
  blank,
  z
    .array(
      z.object({
        outlet: z.string(),
        href: z.string(),
        quote: optionalString,
        author: optionalString,
        // Kind of coverage for link-only items: "Interview", "Feature", "Review"…
        label: optionalString,
      })
    )
    .default([])
);
// Fan reviews pulled from a release's Bandcamp page ("From listeners").
// Distinct from `press`: these are listeners' own words, credited by name
// with a link back to their Bandcamp profile.
const reviewList = z.preprocess(
  blank,
  z
    .array(
      z.object({
        name: z.string(),
        url: optionalString,
        text: z.string(),
        // The reviewer's favorite track, if Bandcamp recorded one.
        favTrack: optionalString,
      })
    )
    .default([])
);
const draftFlag = z.preprocess(blank, z.boolean().default(false));
const sortOrder = z.preprocess(blank, z.number().default(0));
// Obsidian stores "2025" as a bare number — accept both and normalize.
const yearField = z.preprocess(blank, z.coerce.string().optional());

// ── Collections ─────────────────────────────────────────────────────────────

// Blog / long-form writing. Files live in src/content/writing/*.md(x)
const writing = defineCollection({
  loader: glob({ base: "./src/content/writing", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: optionalString,
    pubDate: requiredDate,
    updatedDate: optionalDate,
    draft: draftFlag,
    tags: tagList,
    // Social share image — root-relative path under public/ (e.g. "/images/post.png").
    ogImage: optionalString,
  }),
});

// Poetry. Kept separate from writing so it can have its own layout and feel.
const poetry = defineCollection({
  loader: glob({ base: "./src/content/poetry", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    pubDate: requiredDate,
    draft: draftFlag,
    // Optional note shown beneath a poem (e.g. dedication, form, year written).
    note: optionalString,
    // One-line summary for search snippets and link previews — never shown on
    // the page itself. Without it, poems fall back to the site description.
    description: optionalString,
    // When the poem was composed (vs. pubDate = when it went on the site).
    // Freeform — "2019" or "2019-03" both work. Cited as dateCreated.
    written: yearField,
  }),
});

// Portfolio entries. One file per project; the body is unused (keep private
// notes there if you like) — the card pulls everything from frontmatter.
const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Omit href for things without a public link — the card won't be clickable.
    href: optionalString,
    tags: tagList,
    // Precise ship date — used for sorting. The year chip derives from it,
    // so only set `year` to override the displayed year (e.g. "2023–2024").
    date: optionalDate,
    year: yearField,
    draft: draftFlag,
  }),
});

// Music. One file per release (album, EP, single…). Each gets its own page at
// /music/<slug>; the markdown body is the liner notes / story of the record.
const music = defineCollection({
  loader: glob({ base: "./src/content/music", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    // The act it was released as (e.g. "Flesh Of The Stars", "Arthhur", "mfox").
    artist: optionalString,
    // Precise release date if known — sorts newest first...
    releaseDate: optionalDate,
    // ...or just the year, when that's all you've got (albums sort by it too).
    year: yearField,
    // One-line summary for search snippets and link previews.
    description: optionalString,
    // Small line under the title. Defaults to "artist · year".
    meta: optionalString,
    // Cover art — root-relative path under public/ ("/images/albums/….jpg").
    cover: optionalString,
    // Bandcamp album ID (the number in the embed code) — renders an embedded
    // player on the album page.
    bandcampId: optionalString,
    // Platform links — each shows as a small labeled link.
    // Kept flat (not nested) so Obsidian's Properties panel can edit them.
    bandcamp: optionalString,
    spotify: optionalString,
    soundcloud: optionalString,
    youtube: optionalString,
    // Genres/moods, shown as tag chips (e.g. ["Doom Metal", "Sludge"]).
    genre: tagList,
    // Personnel / recording credits — multi-line, shown at the foot of the
    // album page exactly as written.
    credits: optionalString,
    // Press coverage — pull-quotes and links, shown in a "Press" section.
    press: pressList,
    // Fan reviews from Bandcamp, shown in a "From listeners" section.
    reviews: reviewList,
    // Tiebreak for same-year/undated releases. Lower numbers sort first.
    order: sortOrder,
    draft: draftFlag,
  }),
});

export const collections = { writing, poetry, projects, music };
