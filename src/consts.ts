// Central site configuration. Edit these and the whole site updates.

export const SITE_TITLE = "Mike Fox";
export const SITE_DESCRIPTION =
  "Mike Fox — a Chicago maker who cross-pollinates his interests and learns by building. Music as BigBluestem, plus software, electronics, writing, art, ecology, and gardening.";

// Canonical identity for the site's author. Powers the Person JSON-LD on the
// homepage and About page — the entity that ties "Mike Fox", "BigBluestem",
// and the linked profiles together for search engines. `sameAs` should list
// pages that are *about this person* (personal profiles), not band pages.
export const AUTHOR = {
  name: "Mike Fox",
  alternateName: "BigBluestem",
  jobTitle: "Technical Lead",
  worksFor: "PrintNinja",
  location: "Chicago, IL",
  description:
    "A Chicago maker who cross-pollinates his interests and learns by building with them — music as BigBluestem, plus software, electronics, writing, art and design, ecology, and gardening. Technical lead at PrintNinja.",
  email: "itismikefox@gmail.com",
  sameAs: [
    "https://github.com/itsmikefox",
    "https://bigbluestem.bandcamp.com",
  ],
  // Domains of practice — enumerated for the Person schema's knowsAbout, so the
  // breadth reads as machine-legible topical expertise rather than a bare claim.
  knowsAbout: [
    "Music",
    "Songwriting",
    "Software engineering",
    "Electronics",
    "Writing",
    "Poetry",
    "Visual art",
    "Design",
    "Ecology",
    "Gardening",
    "Physics",
  ],
};

// The main navigation. Order here is the order in the header.
export const NAV: { label: string; href: string }[] = [
  { label: "Projects", href: "/projects" },
  { label: "Writing", href: "/writing" },
  { label: "Poetry", href: "/poetry" },
  { label: "Music", href: "/music" },
  { label: "Links", href: "/links" },
  { label: "Experience", href: "/experience" },
  { label: "About", href: "/about" },
];

// Footer / about links. Leave a value empty ("") to hide that item.
export const SOCIALS: { label: string; href: string }[] = [
  { label: "Email", href: "mailto:itismikefox@gmail.com" },
  { label: "Bandcamp", href: "https://bigbluestem.bandcamp.com" },
  { label: "GitHub", href: "https://github.com/itsmikefox" },
  { label: "RSS", href: "/rss.xml" },
];
