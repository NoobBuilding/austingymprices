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
