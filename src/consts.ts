// Central site configuration. Edit these and the whole site updates.

export const SITE_TITLE = "Mike Fox";
export const SITE_DESCRIPTION =
  "Mike Fox - Chicago creative, Professional weirdo, music as BigBluestem.";

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
    "Chicago maker who learns by building! Music as BigBluestem, electronics, writing, art and design, ecology. Technical lead at PrintNinja.",
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

// Last.fm — powers the homepage "Now spinning" element. The key is a public,
// read-only API key, so it's safe to ship in client JS (that's the normal
// pattern for these widgets). Register one at
// https://www.last.fm/api/account/create. Leave LASTFM_API_KEY empty to hide
// the element entirely.
export const LASTFM_USER = "Mod-man";
export const LASTFM_API_KEY = "2fb18a8443318d71021bb49fcf47389e";

// Formspree endpoint for the library's "request this book" form. Create a form
// at https://formspree.io, then paste just the ID from its endpoint URL
// (https://formspree.io/f/XXXXXXXX → "XXXXXXXX"). Left empty, the request
// button degrades to a prefilled mailto: link to AUTHOR.email instead — the
// feature still works, it just routes through the visitor's mail client.
export const FORMSPREE_ID = "";

// Footer / about links. Leave a value empty ("") to hide that item.
export const SOCIALS: { label: string; href: string }[] = [
  { label: "Email", href: "mailto:itismikefox@gmail.com" },
  { label: "Bandcamp", href: "https://bigbluestem.bandcamp.com" },
  { label: "GitHub", href: "https://github.com/itsmikefox" },
  { label: "RSS", href: "/rss.xml" },
];
