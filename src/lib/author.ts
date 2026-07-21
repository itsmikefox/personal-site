import { AUTHOR } from "../consts";

/**
 * Build the Person JSON-LD for the site's author.
 *
 * @param siteHref  Absolute site URL (Astro.site?.href) — used as the person's canonical url.
 * @param mainEntityOfPage  Absolute URL of the page this markup primarily describes
 *   (e.g. the About page). Omit on pages where the person is a secondary entity.
 */
export function personSchema(siteHref?: string, mainEntityOfPage?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: AUTHOR.name,
    alternateName: AUTHOR.alternateName,
    url: siteHref,
    jobTitle: AUTHOR.jobTitle,
    worksFor: { "@type": "Organization", name: AUTHOR.worksFor },
    homeLocation: { "@type": "Place", name: AUTHOR.location },
    description: AUTHOR.description,
    email: `mailto:${AUTHOR.email}`,
    knowsAbout: AUTHOR.knowsAbout,
    sameAs: AUTHOR.sameAs,
    ...(mainEntityOfPage && { mainEntityOfPage }),
  };
}
