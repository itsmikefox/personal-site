// Compress build photos and videos for the web.
//
// The originals live in the old 11ty site (and, further back, as HEIC/MOV in
// `Photo Exports/`). They're full phone resolution — 4032px stills at 2-4 MB,
// HEVC video at up to 4K — which is fine as an archive and impossible to ship.
// This walks a category's old project entries, reads the media each one
// declares, and writes web-sized copies into public/ following the same
// `<name>-<width>.jpg` convention the site already uses for its portraits.
//
//   node scripts/optimize-media.mjs pedals
//   node scripts/optimize-media.mjs pedals --force   (re-encode existing)
//
// Set SOURCE_ROOT if the old site ever moves. Needs `sips` (macOS built-in)
// and `ffmpeg` (brew install ffmpeg).
//
// The entries' frontmatter is the manifest rather than the asset folders,
// because some builds are video-only (Stage Kiss, the Eruptor clone) and
// wouldn't be found by scanning for stills.
//
// Videos are HEVC, which Chrome won't reliably play, so they're re-encoded to
// H.264. They also carry -90 rotation metadata: every clip was shot on a phone
// held upright, so the *coded* frame is landscape while the *displayed* frame
// is portrait. ffmpeg's scale filter sees post-rotation dimensions, which is
// why the size below is a bounding box rather than a target width — asking for
// "1280 wide" would upscale a portrait clip into a bigger file than its source.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const run = promisify(execFile);

const SOURCE_ROOT =
  process.env.SOURCE_ROOT ??
  "/Users/mikefox/Documents/Digital Projects/alittlewhileaftertheendcame";

const ROOT = path.resolve(import.meta.dirname, "..");

// Still widths. 480 for grid thumbnails, 1080 for the inline column, 1600 for
// a full-bleed or opened view. A variant wider than its original is skipped
// rather than upscaled, so a small source just yields fewer files.
const WIDTHS = [480, 1080, 1600];
const JPEG_QUALITY = 80;

// Long-edge cap for video. 1280 keeps a portrait clip at 720x1280.
const VIDEO_MAX_EDGE = 1280;
// Visually indistinguishable from the source on handheld phone footage, and
// roughly a tenth the size. Verified against frame grabs before settling here.
const VIDEO_CRF = 30;

const category = process.argv[2];
const force = process.argv.includes("--force");

if (!category) {
  console.error("usage: node scripts/optimize-media.mjs <category> [--force]");
  console.error("  e.g. node scripts/optimize-media.mjs pedals");
  process.exit(1);
}

const exists = (p) => stat(p).then(() => true, () => false);
const sizeOf = (p) => stat(p).then((s) => s.size, () => 0);
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}M`;

// Pull the `images:` list out of an old entry's frontmatter. The shape is
// fixed and machine-written, so a few lines beat pulling in a YAML parser:
//   images:
//     - src: /assets/images/builds/pedals/eleanor-1.jpg
//       alt: Eleanor pedal
//     - src: /assets/videos/builds/meristem-1.mp4
//       type: video
//       alt: Meristem demo
function parseMedia(source) {
  const block = source.match(/^images:\n((?:[ \t]+.*\n|\n)*)/m)?.[1];
  if (!block) return [];

  const media = [];
  for (const line of block.split("\n")) {
    const src = line.match(/^\s*-\s*src:\s*(\S+)/);
    if (src) {
      media.push({ src: src[1], type: "image", alt: "" });
      continue;
    }
    const current = media.at(-1);
    if (!current) continue;
    const type = line.match(/^\s*type:\s*(\S+)/);
    if (type) current.type = type[1];
    const alt = line.match(/^\s*alt:\s*(.+?)\s*$/);
    if (alt) current.alt = alt[1];
  }
  return media;
}

// Every media reference across a category's entries, deduplicated — Meristem
// lists the same clip twice in places, and there's no sense encoding it twice.
async function collectMedia() {
  const dir = path.join(SOURCE_ROOT, "src/content/projects", category);
  if (!(await exists(dir))) {
    console.error(`no such category: ${dir}`);
    process.exit(1);
  }

  const entries = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  const seen = new Map();

  for (const entry of entries) {
    const source = await readFile(path.join(dir, entry), "utf8");
    for (const item of parseMedia(source)) {
      if (!seen.has(item.src)) seen.set(item.src, item);
    }
  }
  return [...seen.values()];
}

async function imageWidth(file) {
  const { stdout } = await run("sips", ["-g", "pixelWidth", file]);
  return Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0);
}

async function optimizeImage(item, totals) {
  // "/assets/images/builds/pedals/eleanor-1.jpg" → the file on disk, and the
  // basename we key the web copies off.
  const src = path.join(SOURCE_ROOT, "src", item.src);
  if (!(await exists(src))) {
    console.log(`  ! missing  ${item.src}`);
    return;
  }

  const outDir = path.join(ROOT, "public/images/builds", category);
  await mkdir(outDir, { recursive: true });

  const name = path.basename(item.src, path.extname(item.src));
  const width = await imageWidth(src);
  totals.before += await sizeOf(src);

  for (const w of WIDTHS) {
    // Never upscale — a 900px original has no business becoming a "-1600".
    if (w > width) continue;
    const out = path.join(outDir, `${name}-${w}.jpg`);
    if (force || !(await exists(out))) {
      await run("sips", [
        "--resampleWidth", String(w),
        "-s", "format", "jpeg",
        "-s", "formatOptions", String(JPEG_QUALITY),
        src,
        "--out", out,
      ]);
    }
    totals.after += await sizeOf(out);
  }
  console.log(`  ${name} (${width}px)`);
}

async function optimizeVideo(item, totals) {
  const src = path.join(SOURCE_ROOT, "src", item.src);
  if (!(await exists(src))) {
    console.log(`  ! missing  ${item.src}`);
    return;
  }

  const outDir = path.join(ROOT, "public/videos/builds");
  const posterDir = path.join(ROOT, "public/images/builds", category);
  await mkdir(outDir, { recursive: true });
  await mkdir(posterDir, { recursive: true });

  const name = path.basename(item.src, path.extname(item.src));
  const out = path.join(outDir, `${name}.mp4`);
  const poster = path.join(posterDir, `${name}-poster.jpg`);
  const scale =
    `scale='min(${VIDEO_MAX_EDGE},iw)':'min(${VIDEO_MAX_EDGE},ih)'` +
    `:force_original_aspect_ratio=decrease:force_divisible_by=2`;

  const sourceSize = await sizeOf(src);
  totals.before += sourceSize;

  if (force || !(await exists(out))) {
    await run("ffmpeg", [
      "-y", "-v", "error",
      "-i", src,
      "-vf", scale,
      "-c:v", "libx264",
      "-crf", String(VIDEO_CRF),
      "-preset", "medium",
      "-profile:v", "high",
      "-pix_fmt", "yuv420p",
      // Puts the index up front so playback can start before the whole file
      // has arrived.
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "128k",
      out,
    ]);
  }

  // A poster means the page can use preload="none": a visitor sees a still and
  // downloads the clip only if they press play.
  if (force || !(await exists(poster))) {
    await run("ffmpeg", [
      "-y", "-v", "error",
      // One second in — the first frame is often a blurred autofocus hunt.
      "-ss", "1",
      "-i", src,
      "-frames:v", "1",
      "-vf", scale,
      "-q:v", "4",
      poster,
    ]);
  }

  totals.after += (await sizeOf(out)) + (await sizeOf(poster));
  console.log(`  ${name}  ${mb(sourceSize)} → ${mb(await sizeOf(out))}`);
}

const media = await collectMedia();
const images = media.filter((m) => m.type !== "video");
const videos = media.filter((m) => m.type === "video");
const totals = { before: 0, after: 0 };

console.log(`\nimages · ${category} (${images.length})`);
for (const item of images) await optimizeImage(item, totals);

console.log(`\nvideos · ${category} (${videos.length})`);
for (const item of videos) await optimizeVideo(item, totals);

console.log(
  `\n${mb(totals.before)} → ${mb(totals.after)}` +
    ` (${Math.round((1 - totals.after / totals.before) * 100)}% smaller)\n`
);
