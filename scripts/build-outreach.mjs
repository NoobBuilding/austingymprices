/**
 * Generates docs/outreach.html — a local page listing every gym that still
 * needs a price, an address, or both, with a pre-filled mailto: per gym.
 *
 * Not served, not part of the site build. A working tool for the owner.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FIRST_NAME = 'Kerushan';

// Contacts recovered free from the existing harvest markdown — no extra
// credits spent. Everything else links to the gym's own site.
const EMAILS = {
  'austin-bouldering-project': 'luke.early@boulderingproject.com',
  'castle-hill-fitness': 'hello@castlehillfitness.com',
  'crunch-south-austin': 'manager@crunchsouthaustin.com',
  'crux-climbing-center-south': 'memberships@cruxcc.com',
};
const PHONES = {
  'castle-hill-fitness': '512-478-4567',
  'crunch-south-austin': '512-500-0828',
  'east-austin-athletic-club': '(512) 382-7877',
  'golds-gym-burnet': '512-222-6131',
  'los-campeones-north': '512-276-2754',
  'los-campeones-south': '512-436-8000',
  'la-fitness-anderson-lane': '(512) 831-3393',
  'la-fitness-s-lamar': '(512) 652-5779',
  'life-time-downtown': '737-218-7230',
  'life-time-north': '512-634-4730',
  'life-time-south': '512-891-4530',
  '24-hour-fitness-hancock': '(512) 458-2424',
  '24-hour-fitness-research-blvd': '(512) 794-9151',
};

const gyms = readdirSync('data/gyms')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join('data/gyms', f), 'utf8')));

const hasStandingPrice = (g) => {
  const d = (g.plans ?? []).find((p) => p.is_default);
  return Boolean(d && d.monthly !== null && d.monthly !== undefined);
};

const rows = gyms
  .map((g) => ({
    gym: g,
    needPrice: !hasStandingPrice(g),
    needAddress: !g.address,
  }))
  .filter((r) => r.needPrice || r.needAddress)
  .sort((a, b) => a.gym.name.localeCompare(b.gym.name));

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function body(needAddress) {
  const lines = [
    'Hi — I’m comparing gyms in the area before joining. Could you tell me:',
    '',
    '- Current monthly rate for a standard adult membership',
    '- Any enrollment/initiation fee and annual fee',
    '- Contract length or month-to-month',
    '- Day pass price, if you offer one',
  ];
  if (needAddress) lines.push('- And your street address for my notes');
  lines.push('', 'Thanks!', FIRST_NAME);
  return lines.join('\n');
}

const SUBJECT = 'Membership pricing question';

const cards = rows
  .map((r) => {
    const g = r.gym;
    const need =
      r.needPrice && r.needAddress ? 'price + address' : r.needPrice ? 'price' : 'address';
    const text = body(r.needAddress);
    const email = EMAILS[g.slug];
    const href = email
      ? `mailto:${email}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(text)}`
      : null;
    const phone = PHONES[g.slug];

    return `
<article class="row" data-need="${need}">
  <header>
    <h2>${esc(g.name)}</h2>
    <span class="need need-${need.replace(/[^a-z]/g, '')}">${esc(need)}</span>
  </header>
  <p class="meta">${esc(g.sub_locality ?? '')} · ${esc(g.region)} · ${esc(g.category)}</p>
  ${g.pricing_note ? `<p class="prior"><b>What we already know:</b> ${esc(g.pricing_note)}</p>` : ''}
  ${g.address ? `<p class="prior"><b>Address on file:</b> ${esc(g.address)}</p>` : ''}
  <p class="links">
    ${href ? `<a class="btn" href="${href}">Email ${esc(email)}</a>` : ''}
    <a class="btn ghost" href="${esc(g.website)}" target="_blank" rel="noopener noreferrer">Open website ↗</a>
    ${phone ? `<span class="phone">${esc(phone)}</span>` : ''}
  </p>
  ${
    href
      ? ''
      : `<details class="paste"><summary>No public email found — paste this into their contact form</summary>
    <p class="sub">Subject: ${esc(SUBJECT)}</p>
    <textarea readonly rows="11">${esc(text)}</textarea></details>`
  }
</article>`;
  })
  .join('\n');

const needPrice = rows.filter((r) => r.needPrice).length;
const needAddress = rows.filter((r) => r.needAddress).length;
const needBoth = rows.filter((r) => r.needPrice && r.needAddress).length;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Outreach kit — austingymprices</title>
<style>
  :root{--orange:#BF5700;--orange-dark:#9E4800;--orange-tint:#FBF1E9;--ink:#211D19;
        --ink-soft:#6B635B;--line:#ECE7E1;--green:#1E7A46;--green-tint:#E9F5EE}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font:15px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
       background:#fff;max-width:880px;margin:0 auto;padding:36px 22px 80px}
  h1{font-size:1.7rem;letter-spacing:-.01em}
  .lede{color:var(--ink-soft);margin-top:8px}
  .counts{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0 8px}
  .counts span{background:var(--orange-tint);color:var(--orange-dark);border-radius:8px;
       padding:6px 12px;font-size:.84rem;font-weight:600}
  .filters{display:flex;gap:8px;margin:14px 0 26px;flex-wrap:wrap}
  .filters button{border:1.5px solid var(--line);background:#fff;border-radius:999px;
       padding:7px 15px;font:inherit;font-size:.84rem;font-weight:600;color:var(--ink-soft);cursor:pointer}
  .filters button.on{background:var(--orange);border-color:var(--orange);color:#fff}
  .row{border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-bottom:12px}
  .row header{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
  h2{font-size:1.05rem}
  .need{font-size:.68rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
        border-radius:5px;padding:3px 8px;background:var(--orange-tint);color:var(--orange-dark);white-space:nowrap}
  .needaddress{background:var(--green-tint);color:var(--green)}
  .meta{font-size:.8rem;color:var(--ink-soft);margin-top:4px}
  .prior{font-size:.85rem;color:var(--ink-soft);background:#FCFAF8;border:1px solid var(--line);
         border-radius:8px;padding:9px 12px;margin-top:10px}
  .links{margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .btn{display:inline-block;background:var(--ink);color:#fff;text-decoration:none;
       border-radius:999px;padding:9px 16px;font-size:.85rem;font-weight:600}
  .btn.ghost{background:#fff;color:var(--ink-soft);border:1.5px solid var(--line)}
  .phone{font-size:.85rem;color:var(--ink-soft)}
  .paste{margin-top:12px}
  .paste summary{font-size:.85rem;color:var(--orange-dark);cursor:pointer;font-weight:600}
  .paste .sub{font-size:.8rem;color:var(--ink-soft);margin:8px 0 4px}
  textarea{width:100%;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
       border:1px solid var(--line);border-radius:8px;padding:10px;background:#FCFAF8;color:var(--ink)}
  .note{margin-top:28px;font-size:.85rem;color:var(--ink-soft);border-top:1px solid var(--line);padding-top:16px}
</style>
</head>
<body>
<h1>Outreach kit</h1>
<p class="lede">Every gym still missing a confirmed price, a street address, or both.
Each row has a pre-filled email; where no public address was found, there is a
paste-ready block for the gym's contact form.</p>

<div class="counts">
  <span>${rows.length} gyms to contact</span>
  <span>${needPrice} need a price</span>
  <span>${needAddress} need an address</span>
  <span>${needBoth} need both</span>
</div>

<div class="filters">
  <button class="on" data-f="all">All</button>
  <button data-f="price">Price only</button>
  <button data-f="address">Address only</button>
  <button data-f="price + address">Both</button>
</div>

${cards}

<p class="note">The email is written as what you are — someone comparing gyms before
joining. Every question is one any prospective member asks, and the answers are
public-facing rates. If a gym asks directly what it is for, tell them about the site;
there is nothing here that needs hiding.</p>

<script>
  document.querySelectorAll('.filters button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.filters button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var f = b.dataset.f;
      document.querySelectorAll('.row').forEach(function (r) {
        r.style.display = (f === 'all' || r.dataset.need === f) ? '' : 'none';
      });
    });
  });
</script>
</body>
</html>
`;

writeFileSync('docs/outreach.html', html);
console.log(`docs/outreach.html — ${rows.length} gyms (${needPrice} price, ${needAddress} address, ${needBoth} both)`);
