// Your portfolio lives here. Add/remove entries and the Projects page updates.
// `href` is optional — omit it for things without a public link.

export interface Project {
  title: string;
  description: string;
  href?: string;
  tags: string[];
  year?: string;
}

export const projects: Project[] = [
  {
    title: "Example Project",
    description:
      "A one- or two-sentence description of what it is and why it mattered. Replace this with something you're proud of.",
    href: "https://example.com",
    tags: ["TypeScript", "Design"],
    year: "2025",
  },
  {
    title: "Another Thing You Built",
    description:
      "Projects without a link work too — leave off `href` and the card simply won't be clickable.",
    tags: ["Salesforce", "Automation"],
    year: "2024",
  },
];
