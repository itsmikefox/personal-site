#!/usr/bin/env node
/**
 * Import the Obsidian `Books.base` library into the site.
 *
 * Source of truth is the vault: this reads E01_Books/*.md, normalizes the
 * frontmatter, caches every cover locally, and writes a single snapshot at
 * src/data/books.json that the `books` collection loads. Note *bodies* are
 * never read — the public catalog is frontmatter only, so private reading
 * notes and [[wikilinks]] to personal notes can't leak.
 *
 *   pnpm books              # parse + fetch any covers not already cached
 *   pnpm books --no-fetch   # parse only, reuse whatever covers are cached
 *
 * Set BOOKS_VAULT to point at a different E01_Books folder.
 */
import { readFile, writeFile, readdir, copyFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VAULT =
  process.env.BOOKS_VAULT ||
  "/Users/mikefox/Documents/MDF 305 Storage Disk Unit/E01_Books";
const OUT_JSON = path.join(ROOT, "src/data/books.json");
const COVER_DIR = path.join(ROOT, "public/images/books");
const NO_FETCH = process.argv.includes("--no-fetch");

// Obsidian scaffolding that lives in the folder but isn't a book.
const SKIP = /^(MAP_|Authors$|Covers$|_Genres$)/;

// ── Frontmatter ─────────────────────────────────────────────────────────────
// A deliberately small YAML reader: these notes are flat `key: value` pairs
// written by Obsidian's Properties panel. Anything fancier isn't in the data.
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    out[kv[1]] = kv[2];
  }
  return out;
}

/** Unwrap a YAML scalar, then strip the trailing `# physical / digital / both`
 *  template comment that ~400 of these notes still carry. */
function scalar(raw) {
  if (raw == null) return "";
  let v = String(raw).trim();
  const quoted = /^"([\s\S]*)"$/.exec(v) || /^'([\s\S]*)'$/.exec(v);
  if (quoted) v = quoted[1];
  v = v.replace(/\s*#.*$/, ""); // template comment, inside or outside the quotes
  v = v.replace(/^"|"$/g, "").trim();
  return v;
}

/** `[[John Kennedy Toole]]` / `[[Name|Display]]` → `John Kennedy Toole`. */
const unlink = (v) =>
  scalar(v)
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    // A few notes have an unclosed "[[" — drop stray brackets so the name reads.
    .replace(/[[\]]/g, "")
    .trim();

// Two conventions live in the vault: "Aldo Leopold" and "Lowry, Erin". Flip the
// inverted ones so the catalog reads one way. Only when the part before the
// comma is a single surname (optionally with a "van der"-style particle) — a
// comma after *two* words is a second author ("Grant Morrison, Frank Quitely"),
// not an inversion, and flipping those would scramble the credit.
const PARTICLES = /^((?:van|von|de|del|della|di|du|da|la|le|den|der|ten|ter|st\.?)\s+)*\S+$/i;
const SUFFIXES = /^(jr|sr|ii|iii|iv|phd|md|ed|eds)\.?$/i;
function uninvert(name) {
  const parts = name.split(",");
  if (parts.length !== 2) return name;
  const [last, first] = parts.map((x) => x.trim());
  if (!last || !first) return name;
  if (!PARTICLES.test(last)) return name; // two authors, not an inversion
  if (SUFFIXES.test(first)) return name; // "King, Jr." stays put
  return `${first} ${last}`;
}

const FORMATS = new Set(["physical", "digital", "both"]);
const format = (v) => {
  const f = scalar(v).toLowerCase();
  return FORMATS.has(f) ? f : "";
};

/** "Literary Fiction/Comedy" → ["Literary Fiction", "Comedy"]. */
const genres = (v) =>
  scalar(v)
    .split(/[/,;]/)
    .map((g) => g.trim())
    .filter(Boolean);

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "book";

// ── Covers ──────────────────────────────────────────────────────────────────
// Bigger variants where the host offers one; the original is the fallback.
function coverCandidates(url) {
  const out = [];
  if (url.includes("covers.openlibrary.org")) out.push(url.replace(/-M\.jpg/, "-L.jpg"));
  if (url.includes("books.google.com")) out.push(url.replace(/([?&]zoom=)\d/, "$12"));
  out.push(url);
  return [...new Set(out)];
}

/** Pixel dimensions for the formats these cover hosts actually serve, or null
 *  if the bytes aren't an image at all. */
function imageSize(buf) {
  if (buf.length < 24) return null;
  // PNG
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG")
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  // GIF
  if (buf.toString("ascii", 0, 3) === "GIF")
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  // WebP
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
    return null;
  }
  // JPEG — walk the segment chain to the start-of-frame header.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

/** Is this actually a book cover? Catches the three kinds of junk these
 *  sources hand back: OpenLibrary's 1x1 "no cover" GIF, Amazon/Google
 *  "image not available" banners (wide, short), and HTML error pages saved
 *  with a .jpg name — several of which are already sitting in the vault's own
 *  Covers/ folder, so this runs on local files too, not just downloads. */
function isCover(buf) {
  const size = imageSize(buf);
  if (!size) return false;
  const { w, h } = size;
  if (w < 100 || h < 100) return false;
  const ratio = w / h;
  return ratio >= 0.3 && ratio <= 2;
}

async function download(url, dest) {
  for (const candidate of coverCandidates(url)) {
    try {
      const res = await fetch(candidate, {
        headers: {
          // OpenLibrary asks that bulk cover users identify themselves.
          "User-Agent": "mikefox.com library importer (itismikefox@gmail.com)",
        },
        redirect: "follow",
      });
      if (!res.ok) continue;
      if (!(res.headers.get("content-type") || "").startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isCover(buf)) continue; // placeholder or error page — try the next
      await writeFile(dest, buf);
      return true;
    } catch {
      /* try the next candidate */
    }
  }
  return false;
}

/** Vault cover paths are written with inconsistent case ("Covers/" vs
 *  "covers/"), which only works because macOS is case-insensitive. Resolve
 *  them properly so the import also runs on the Linux CI box. */
async function resolveLocal(rel) {
  const parts = rel.split("/").filter(Boolean);
  let dir = VAULT;
  for (let i = 0; i < parts.length; i++) {
    const entries = await readdir(dir).catch(() => []);
    const hit = entries.find((e) => e.toLowerCase() === parts[i].toLowerCase());
    if (!hit) return null;
    dir = path.join(dir, hit);
  }
  return existsSync(dir) ? dir : null;
}

// Run `jobs` with a small concurrency cap — polite to the cover hosts, and
// fast enough for a few hundred images.
async function pool(jobs, limit = 4) {
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < jobs.length) await jobs[i++]();
  });
  await Promise.all(workers);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(VAULT)) {
    console.error(`No such folder: ${VAULT}\nSet BOOKS_VAULT to your E01_Books path.`);
    process.exit(1);
  }
  await mkdir(COVER_DIR, { recursive: true });

  const files = (await readdir(VAULT))
    .filter((f) => f.endsWith(".md") && !SKIP.test(f))
    .sort();

  const books = [];
  const seen = new Map();
  const skipped = [];

  for (const file of files) {
    const text = await readFile(path.join(VAULT, file), "utf8");
    const fm = frontmatter(text);
    if (!fm || !fm.title) {
      skipped.push(file);
      continue;
    }
    const title = scalar(fm.title) || file.replace(/\.md$/, "");
    let id = slugify(title);
    // Two different books can share a title; keep both, distinctly addressable.
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;

    const yearRaw = scalar(fm.year);
    books.push({
      id,
      title,
      author: uninvert(unlink(fm.author)),
      year: /^\d{1,4}$/.test(yearRaw) ? Number(yearRaw) : null,
      publisher: scalar(fm.publisher),
      genre: genres(fm.genre),
      format: format(fm.format),
      cover: "", // filled in below
      coverSource: scalar(fm.cover),
      source: file,
    });
  }

  // Covers: local files are copied, remote ones fetched once and cached. Every
  // path — cache hit, vault copy, fresh download — goes through isCover(), so a
  // placeholder can never reach the site; a book without a usable cover falls
  // back to the typographic fold in the grid, which is a fine thing to be.
  let copied = 0;
  let fetched = 0;
  let missing = 0;
  const rejected = [];
  const jobs = [];

  for (const b of books) {
    const src = b.coverSource;
    if (!src) {
      missing++;
      continue;
    }
    const ext = (path.extname(src.split("?")[0]) || ".jpg").toLowerCase();
    const local = /^https?:/i.test(src) ? `${b.id}.jpg` : `${b.id}${ext.match(/^\.(jpe?g|png|webp|gif)$/) ? ext : ".jpg"}`;
    const dest = path.join(COVER_DIR, local);
    const url = `/images/books/${local}`;

    // A cached file is reused only if it still passes; otherwise it's dropped
    // and re-fetched, so fixing the rules here is enough to heal the cache.
    if (existsSync(dest)) {
      if (isCover(await readFile(dest))) {
        b.cover = url;
        continue;
      }
      await rm(dest, { force: true });
    }

    if (/^https?:/i.test(src)) {
      if (NO_FETCH) {
        missing++;
        continue;
      }
      jobs.push(async () => {
        if (await download(src, dest)) {
          b.cover = url;
          fetched++;
        } else {
          missing++;
          rejected.push(`${b.title} (${src})`);
        }
      });
    } else {
      const abs = await resolveLocal(src);
      if (abs && isCover(await readFile(abs))) {
        await copyFile(abs, dest);
        b.cover = url;
        copied++;
      } else {
        missing++;
        rejected.push(`${b.title} (vault: ${src})`);
      }
    }
  }

  if (jobs.length) {
    console.log(`Fetching ${jobs.length} covers…`);
    await pool(jobs);
  }

  // Drop the working field — the site only needs the local path.
  for (const b of books) delete b.coverSource;
  books.sort((a, b) => a.title.localeCompare(b.title));

  await writeFile(OUT_JSON, JSON.stringify(books, null, 2) + "\n");

  console.log(`\n${books.length} books → src/data/books.json`);
  console.log(`covers: ${copied} copied, ${fetched} fetched, ${books.filter((b) => b.cover).length} total, ${missing} without`);
  if (skipped.length) console.log(`skipped (no frontmatter): ${skipped.join(", ")}`);
  if (rejected.length) {
    console.log(`\nNo usable cover — worth fixing in Obsidian:`);
    for (const r of rejected.sort()) console.log(`  · ${r}`);
  }
}

main();
