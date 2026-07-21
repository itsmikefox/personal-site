import type { CollectionEntry } from "astro:content";

// ── Bases: many views over one collection ───────────────────────────────────
// A "Base" renders a content collection as switchable views (Gallery, Ledger,
// Table) with spreadsheet-style facet filters and search. Everything a view or
// the client script needs is precomputed here at build time, so the runtime
// enhancement is pure DOM behaviour (no re-rendering, works filtered on the
// static HTML). See src/components/base/ for the markup and script.

export type ViewKey = "gallery" | "ledger" | "table" | "cards";
export type ColumnType = "title" | "text" | "num" | "tags" | "open";

export interface Column {
  key: string;
  label: string;
  type: ColumnType;
}
export interface FacetValue {
  value: string;
  count: number;
}
export interface Facet {
  key: string;
  label: string;
  values: FacetValue[];
}

export interface BaseItem {
  // Internal page URL, external link (projects), or undefined (nothing to link to).
  url?: string;
  external?: boolean;
  title: string;
  // Display fields (a view reads whichever it needs)
  cover?: string;
  artist?: string;
  year?: number | null;
  date?: string;
  genre?: string[];
  tags?: string[];
  open?: string;
  lines?: number;
  desc?: string;
  // Filter attributes → emitted as data-<key> on every item element, so the
  // client can filter the rendered DOM without knowing the schema. Multi-value
  // fields are pipe-joined (e.g. "Doom Metal|Sludge").
  attrs: Record<string, string>;
  // Lowercased haystack for search.
  search: string;
  // Per-column sort keys → emitted as data-s-<key>. Numbers stay numeric.
  sort: Record<string, string | number>;
}

export interface BaseConfig {
  kind: string;
  items: BaseItem[];
  facets: Facet[];
  columns: Column[];
  views: ViewKey[];
  defaultView: ViewKey;
}

// Sentinel for undated items — sorts below any real year, stays numeric so the
// client's numeric-sort branch handles it.
const NO_YEAR = -9999;

const decadeLabel = (year: number | null): string =>
  year && year > 0 ? `${Math.floor(year / 10) * 10}s` : "Undated";

/** Spread onto an item's root element in any view: data-item, data-search,
 *  every facet attribute, and every sort key. One source of truth so filtering
 *  and sorting behave identically across Gallery, Ledger, and Table. */
export function itemAttrs(it: BaseItem): Record<string, string | boolean> {
  const a: Record<string, string | boolean> = {
    "data-item": true,
    "data-search": it.search,
  };
  for (const [k, v] of Object.entries(it.attrs)) a[`data-${k}`] = v;
  for (const [k, v] of Object.entries(it.sort)) a[`data-s-${k}`] = String(v);
  return a;
}

/** Anchor attributes for an item, or null when it has nothing to link to (so
 *  the caller renders a plain element instead of an <a>). External links open
 *  in a new tab. */
export function linkAttrs(it: BaseItem): Record<string, string> | null {
  if (!it.url) return null;
  return it.external ? { href: it.url, target: "_blank", rel: "noopener" } : { href: it.url };
}

// Build a facet (with per-value counts) from the items' data attributes.
function buildFacet(
  items: BaseItem[],
  key: string,
  label: string,
  order: "alpha" | "num" = "alpha"
): Facet {
  const counts = new Map<string, number>();
  for (const it of items) {
    const raw = it.attrs[key] ?? "";
    for (const v of raw.split("|").filter(Boolean)) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  const values = [...counts.entries()].map(([value, count]) => ({ value, count }));
  if (order === "num") {
    // Highest number first (decades, years); non-numeric ("Undated") last.
    values.sort((a, b) => {
      if (a.value === "Undated") return 1;
      if (b.value === "Undated") return -1;
      return parseInt(b.value) - parseInt(a.value);
    });
  } else {
    values.sort((a, b) => a.value.localeCompare(b.value));
  }
  return { key, label, values };
}

// ── Music ────────────────────────────────────────────────────────────────────
// Newest first — a precise releaseDate beats a bare year (treated as Dec 31);
// undated releases sort last, then `order`, then title. (Mirrors the old
// music/index sort so nothing reorders under people.)
export function buildMusic(entries: CollectionEntry<"music">[]): BaseConfig {
  const when = (e: CollectionEntry<"music">) =>
    e.data.releaseDate?.valueOf() ??
    (e.data.year ? Date.UTC(Number(e.data.year.slice(0, 4)), 11, 31) : -Infinity);

  const sorted = [...entries].sort(
    (a, b) =>
      when(b) - when(a) ||
      (a.data.order ?? 0) - (b.data.order ?? 0) ||
      a.data.title.localeCompare(b.data.title)
  );

  const items: BaseItem[] = sorted.map((e) => {
    const d = e.data;
    const year = d.year
      ? Number(d.year.slice(0, 4))
      : d.releaseDate
        ? d.releaseDate.getUTCFullYear()
        : null;
    const genre = d.genre ?? [];
    const artist = d.artist ?? "";
    return {
      url: `/music/${e.id}/`,
      title: d.title,
      cover: d.cover,
      artist: d.artist,
      year,
      genre,
      attrs: {
        genre: genre.join("|"),
        artist,
        decade: decadeLabel(year),
        year: year != null ? String(year) : "",
      },
      search: [d.title, artist, genre.join(" "), year ?? ""]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      sort: {
        title: d.title.toLowerCase(),
        artist: artist.toLowerCase(),
        year: year ?? NO_YEAR,
        genre: genre.join(", ").toLowerCase(),
      },
    };
  });

  return {
    kind: "music",
    items,
    facets: [
      buildFacet(items, "genre", "Genre"),
      buildFacet(items, "artist", "Artist"),
      buildFacet(items, "decade", "Decade", "num"),
    ],
    columns: [
      { key: "title", label: "Title", type: "title" },
      { key: "artist", label: "Artist", type: "text" },
      { key: "year", label: "Year", type: "num" },
      { key: "genre", label: "Genre", type: "tags" },
    ],
    views: ["gallery", "table"],
    defaultView: "gallery",
  };
}

// ── Poetry ───────────────────────────────────────────────────────────────────
// The opening line and length are derived from the poem body, so a Base gives
// sparse frontmatter something to show. Newest pubDate first.
const cleanLine = (raw: string): string =>
  raw
    .replace(/^>\s?/, "") // strip a leading blockquote marker
    .replace(/\\$/, "") // strip a trailing hard-break backslash
    .replace(/[*_`]/g, "") // strip inline markdown emphasis
    .trim();

export function buildPoetry(entries: CollectionEntry<"poetry">[]): BaseConfig {
  const sorted = [...entries].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  const items: BaseItem[] = sorted.map((e) => {
    const body = e.body ?? "";
    const linesArr = body
      .split("\n")
      .map((s) => s.replace(/\s+$/, ""))
      .filter((s) => s.trim().length > 0);
    const open = cleanLine(linesArr[0] ?? "");
    const lines = linesArr.length;
    const year = e.data.written
      ? parseInt(e.data.written)
      : e.data.pubDate.getUTCFullYear();

    return {
      url: `/poetry/${e.id}/`,
      title: e.data.title,
      open,
      lines,
      year,
      attrs: { year: String(year), decade: decadeLabel(year) },
      search: [e.data.title, open, year].join(" ").toLowerCase(),
      sort: {
        title: e.data.title.toLowerCase(),
        open: open.toLowerCase(),
        lines,
        year,
      },
    };
  });

  return {
    kind: "poetry",
    items,
    facets: [], // no filterable frontmatter yet
    columns: [
      { key: "title", label: "Title", type: "title" },
      { key: "open", label: "Opening line", type: "open" },
      { key: "lines", label: "Lines", type: "num" },
      { key: "year", label: "Year", type: "num" },
    ],
    views: ["ledger", "table"],
    defaultView: "ledger",
  };
}

// Frontmatter dates parse as UTC midnight — format in UTC so they don't slip
// back a day in western timezones.
const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

// ── Writing ──────────────────────────────────────────────────────────────────
// Text-forward like poetry: Ledger index (leading with the description) by
// default, plus a Table. Filterable by tag. Newest pubDate first.
export function buildWriting(entries: CollectionEntry<"writing">[]): BaseConfig {
  const sorted = [...entries].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  const items: BaseItem[] = sorted.map((e) => {
    const d = e.data;
    const year = d.pubDate.getUTCFullYear();
    const tags = d.tags ?? [];
    return {
      url: `/writing/${e.id}/`,
      title: d.title,
      desc: d.description,
      date: fmtDate(d.pubDate),
      year,
      tags,
      attrs: { tags: tags.join("|"), year: String(year), decade: decadeLabel(year) },
      search: [d.title, d.description ?? "", tags.join(" "), year]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      sort: {
        title: d.title.toLowerCase(),
        date: d.pubDate.valueOf(),
        year,
        tags: tags.join(", ").toLowerCase(),
      },
    };
  });

  return {
    kind: "writing",
    items,
    facets: [buildFacet(items, "tags", "Tag")],
    columns: [
      { key: "title", label: "Title", type: "title" },
      { key: "date", label: "Published", type: "text" },
      { key: "tags", label: "Tags", type: "tags" },
    ],
    views: ["ledger", "table"],
    defaultView: "ledger",
  };
}

// ── Projects ─────────────────────────────────────────────────────────────────
// Metadata records: a sortable Table by default, plus a card grid. Each item
// links out to its `href` (new tab) or, lacking one, renders as a static card.
// Filterable by tag and year. Newest first (precise date beats a bare year).
export function buildProjects(entries: CollectionEntry<"projects">[]): BaseConfig {
  const when = (e: CollectionEntry<"projects">) =>
    e.data.date?.valueOf() ??
    (e.data.year ? Date.UTC(Number(e.data.year.slice(0, 4)), 11, 31) : -Infinity);

  const sorted = [...entries].sort(
    (a, b) => when(b) - when(a) || a.data.title.localeCompare(b.data.title)
  );

  const items: BaseItem[] = sorted.map((e) => {
    const d = e.data;
    const year = d.year
      ? Number(d.year.slice(0, 4))
      : d.date
        ? d.date.getUTCFullYear()
        : null;
    const tags = d.tags ?? [];
    return {
      url: d.href,
      external: !!d.href,
      title: d.title,
      desc: d.description,
      year,
      tags,
      attrs: { tags: tags.join("|"), year: year != null ? String(year) : "" },
      search: [d.title, d.description, tags.join(" "), year ?? ""]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      sort: {
        title: d.title.toLowerCase(),
        year: year ?? NO_YEAR,
        tags: tags.join(", ").toLowerCase(),
      },
    };
  });

  return {
    kind: "projects",
    items,
    facets: [buildFacet(items, "tags", "Tag"), buildFacet(items, "year", "Year", "num")],
    columns: [
      { key: "title", label: "Title", type: "title" },
      { key: "year", label: "Year", type: "num" },
      { key: "tags", label: "Tags", type: "tags" },
    ],
    views: ["table", "cards"],
    defaultView: "table",
  };
}
