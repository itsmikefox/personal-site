// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// Update `site` to your real domain before deploying — it powers the sitemap,
// RSS feed, and any absolute URLs.
export default defineConfig({
  site: "https://mikefox.com",
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      // Light/dark code themes; the site toggles between them via CSS.
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
});
