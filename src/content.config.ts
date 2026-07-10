import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Blog / long-form writing. Files live in src/content/writing/*.md(x)
const writing = defineCollection({
  loader: glob({ base: "./src/content/writing", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

// Poetry. Kept separate from writing so it can have its own layout and feel.
const poetry = defineCollection({
  loader: glob({ base: "./src/content/poetry", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
    // Optional note shown beneath a poem (e.g. dedication, form, year written).
    note: z.string().optional(),
  }),
});

export const collections = { writing, poetry };
