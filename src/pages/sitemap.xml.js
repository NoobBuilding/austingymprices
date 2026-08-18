/**
 * Sitemap. Hand-rolled rather than pulling in @astrojs/sitemap: the site is
 * 48 URLs from data we already have in memory, and every dependency is one
 * more thing to audit (CLAUDE.md §2, §8).
 */
import { getAllGyms, getRegions } from '../lib/gyms.js';

export function GET({ site }) {
  const urls = [
    { loc: new URL('/', site).href, priority: '1.0' },
    ...getRegions().map((r) => ({ loc: new URL(`/regions/${r.id}`, site).href, priority: '0.8' })),
    ...getAllGyms().map((g) => ({
      loc: new URL(`/gyms/${g.slug}`, site).href,
      priority: '0.7',
      lastmod: g.verified_date ?? undefined,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
