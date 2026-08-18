// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Canonical URLs, sitemap and JSON-LD all derive from this. The domain is
  // not wired up until §9 step 9 — until then the build deploys to a
  // .pages.dev preview, but the emitted URLs are already correct.
  site: 'https://austingymprices.com',

  // Static output. No SSR, no adapter, no server runtime (CLAUDE.md §2).
  output: 'static',

  build: {
    // Emit /about/index.html rather than /about.html so Cloudflare Pages
    // serves clean URLs without redirect hops.
    format: 'directory',

    // NEVER inline stylesheets. Our CSP is style-src 'self' with no
    // 'unsafe-inline', so an inlined <style> block would be refused by the
    // browser and the page would render unstyled in production. Astro's
    // default here is 'auto', which inlines anything under ~4KB — a small
    // page would silently start failing. See scripts/check-csp.mjs.
    inlineStylesheets: 'never',
  },

  // Keep the client bundle minimal — no framework runtime in v1.
  vite: {
    build: {
      cssMinify: true,

      // NEVER inline assets, which for Astro includes bundled <script>
      // blocks. With the default limit Astro emitted the filter script as
      // an inline <script type="module">, which our CSP (script-src 'self',
      // no 'unsafe-inline') refuses to execute — the production bug that
      // killed every filter. Forcing 0 emits a real file under /_astro/.
      assetsInlineLimit: 0,
    },
  },
});
