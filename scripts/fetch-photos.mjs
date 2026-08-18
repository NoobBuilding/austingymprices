/**
 * Build-time photo fetch (CLAUDE.md §7).
 *
 * Gym photos come from Google Places and are downloaded at BUILD time into
 * public/photos, so the API key never reaches the browser (§8). Owner-supplied
 * photos live in public/photos already and are never overwritten.
 *
 *   node scripts/fetch-photos.mjs          # fetch what is missing
 *   node scripts/fetch-photos.mjs --check  # report coverage, fetch nothing
 *
 * With no GOOGLE_PLACES_API_KEY set this is a clean no-op: it reports what it
 * would fetch and exits 0, so the build works identically without it. Gyms
 * whose `photo` is null render no photo block at all — the same rule as
 * known_for. A missing photo is never a broken image.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GYM_DIR = 'data/gyms';
const PHOTO_DIR = 'public/photos';
const KEY = (process.env.GOOGLE_PLACES_API_KEY ?? '').trim();
const CHECK_ONLY = process.argv.includes('--check');

const gyms = readdirSync(GYM_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(GYM_DIR, f), 'utf8')));

/** Gyms asking for a Places photo, that do not already have a file on disk. */
const wanted = gyms.filter(
  (g) => g.photo === 'google-places' && !existsSync(join(PHOTO_DIR, `${g.slug}.jpg`)),
);
const ownerSupplied = gyms.filter((g) => g.photo && g.photo !== 'google-places');
const none = gyms.filter((g) => !g.photo);

console.log(`photos: ${gyms.length} gyms`);
console.log(`  owner-supplied      : ${ownerSupplied.length}`);
console.log(`  want Google Places  : ${wanted.length}`);
console.log(`  no photo (renders nothing): ${none.length}`);

if (CHECK_ONLY) process.exit(0);

if (wanted.length === 0) {
  console.log('\nNothing to fetch.');
  process.exit(0);
}

if (!KEY) {
  console.log(
    `\nGOOGLE_PLACES_API_KEY is not set, so ${wanted.length} photo(s) were not fetched.\n` +
      'This is not an error: the build is identical without them, and a gym with\n' +
      'no photo renders no photo block. Set the key as a CI secret to enable this.',
  );
  process.exit(0);
}

mkdirSync(PHOTO_DIR, { recursive: true });

/** Find the Place for a gym, preferring its confirmed address over its name. */
async function findPlace(gym) {
  const query = gym.address ? `${gym.name}, ${gym.address}` : `${gym.name}, Austin, TX`;
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!res.ok) throw new Error(`Places search returned ${res.status}`);
  const body = await res.json();
  return body.places?.[0] ?? null;
}

let fetched = 0;
const failures = [];

for (const gym of wanted) {
  try {
    const place = await findPlace(gym);
    const photoName = place?.photos?.[0]?.name;
    if (!photoName) {
      console.log(`  --   ${gym.slug} — no photo available`);
      continue;
    }
    const media = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&key=${KEY}`,
    );
    if (!media.ok) throw new Error(`photo media returned ${media.status}`);
    const bytes = Buffer.from(await media.arrayBuffer());
    writeFileSync(join(PHOTO_DIR, `${gym.slug}.jpg`), bytes);
    console.log(`  OK   ${gym.slug} — ${Math.round(bytes.length / 1024)}KB`);
    fetched += 1;
  } catch (err) {
    console.error(`  FAIL ${gym.slug} — ${err.message}`);
    failures.push(gym.slug);
  }
  // Be a polite client.
  await new Promise((r) => setTimeout(r, 300));
}

console.log(`\n${fetched} fetched, ${failures.length} failed`);
// A missing photo must never fail a build: the page renders without it.
process.exit(0);
