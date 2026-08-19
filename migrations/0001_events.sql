-- Anonymous, aggregate event counters (CLAUDE.md §8).
--
-- Three columns of fact and one of arithmetic. There is deliberately no
-- visitor column, no session column and no IP column: the table cannot be
-- joined back to a person because nothing about a person is written to it.
--
-- Apply with:
--   npx wrangler d1 execute austingymprices --remote --file=migrations/0001_events.sql
CREATE TABLE IF NOT EXISTS events (
  day     TEXT    NOT NULL,   -- UTC date, server-assigned
  event   TEXT    NOT NULL,   -- whitelisted event name
  subject TEXT    NOT NULL,   -- gym slug, control value, or sorted slug set
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event, subject)
);

CREATE INDEX IF NOT EXISTS events_by_event_day ON events (event, day);
