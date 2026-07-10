// Central site configuration. Edit these and the whole site updates.

export const SITE_TITLE = "Mike Fox";
export const SITE_DESCRIPTION =
  "Projects, writing, poetry, and music — a personal corner of the web.";

// The main navigation. Order here is the order in the header.
export const NAV: { label: string; href: string }[] = [
  { label: "Projects", href: "/projects" },
  { label: "Writing", href: "/writing" },
  { label: "Poetry", href: "/poetry" },
  { label: "Music", href: "/music" },
  { label: "Experience", href: "/experience" },
  { label: "About", href: "/about" },
];

// Footer / about links. Leave a value empty ("") to hide that item.
export const SOCIALS: { label: string; href: string }[] = [
  { label: "Email", href: "mailto:you@example.com" },
  { label: "GitHub", href: "https://github.com/" },
  { label: "RSS", href: "/rss.xml" },
];
