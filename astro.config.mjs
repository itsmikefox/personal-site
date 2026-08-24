// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// `site` powers the sitemap, RSS feed, and any absolute URLs.
export default defineConfig({
  site: "https://alittlewhileaftertheendcame.com",
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      // Light/dark code themes; the site toggles between them via CSS.
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
});
