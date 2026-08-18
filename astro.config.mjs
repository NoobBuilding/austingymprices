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
  },

  // Keep the client bundle minimal — no framework runtime in v1.
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
