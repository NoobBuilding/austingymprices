# Parser test fixtures

Real markdown returned by Firecrawl for each target's pricing page, captured
during the one-time seed harvest and committed deliberately.

**Why these are in git when `scrapers/harvest_output/` is not.** That directory
is scratch: raw pages fetched, read once by a human, then thrown away. These
are different in kind — they are the inputs a parser must keep handling
correctly, and a regression test that cannot run in CI is not a test. Without
them the suite passed on a developer machine and skipped silently on CI, which
is exactly the failure it exists to prevent.

They are inert markdown, never rendered and never served. Refresh a fixture
only when its parser is being updated for a genuine page change, and say so in
the commit — a fixture edited to make a test pass is a test deleted.

## Credentials are redacted

These are other people's web pages, and web pages embed keys. The YMCA's page
carried a live Mapbox token; it reached a fixture and was stopped by GitHub
push protection on the way into a **public** repo. Someone else's working
credential is not ours to publish.

Redacted values are replaced with a visible `REDACTED-*-TOKEN` marker rather
than deleted, so the redaction is obvious in a diff. `test_fixture_hygiene()`
scans every fixture on each run — do not rely on the server-side backstop.
