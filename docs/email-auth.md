# Email authentication — audit and what to change

Audited 2026-08-20 against live DNS. **Nothing was changed**, for two reasons: this
session has no Cloudflare credentials (there is no API token in `.env`, no `wrangler`,
and DNS is not in this repo), and — more importantly — **the change as briefed would have
made deliverability worse.** The exact records to paste are below.

## What is already there

| | austingymprices.com | atxgymprices.com |
|---|---|---|
| MX | Cloudflare Email Routing (`route1/2/3.mx.cloudflare.net`) | none |
| **SPF** | **present** — `v=spf1 include:_spf.mx.cloudflare.net ~all` | **none** |
| **DKIM** | **present** — `cf2024-1._domainkey`, valid `v=DKIM1`, RSA-2048 | none |
| **DMARC** | **MISSING** | **MISSING** |

Nameservers are Cloudflare (`katja`/`merlin.ns.cloudflare.com`), so every record below is
added in the Cloudflare dashboard under DNS.

## Do NOT add a second SPF record

The brief was "add SPF". **SPF already exists.** A domain with two SPF records is a
**permerror** under RFC 7208 — receivers do not merge them, they fail the check outright.
Adding one would have taken SPF from passing to broken, which is the opposite of the
goal. If a domain needs more senders, the existing record is *edited* to add another
`include:`; a second record is never the answer.

The record that is there is correct for Cloudflare Email Routing: one DNS lookup against
a limit of ten, and `~all` (softfail), which is the right posture while DMARC is still
absent.

**DKIM is present too** — `cf2024-1` is Cloudflare's Email Routing signing key, and it
parses as a valid 2048-bit RSA DKIM1 record. So the two things the brief asked about are
both already done.

## The actual gap: no DMARC, on either domain

Without DMARC, SPF and DKIM produce a *result* that nothing acts on, no alignment is
required between them and the visible `From:` domain, and **no report ever comes back** —
so a deliverability problem is invisible until someone mentions their reply never
arrived. This is the change worth making.

Start at `p=none`. It enforces nothing and breaks nothing; it turns on the reports, and
you read them for a fortnight before tightening.

```
Type: TXT   Name: _dmarc   TTL: Auto
Value: v=DMARC1; p=none; rua=mailto:hello@austingymprices.com; fo=1; adkim=r; aspf=r
```

Then, once the reports show only your own senders passing, tighten to `p=quarantine` and
later `p=reject`.

## And lock down atxgymprices.com

It is a 301 redirect domain (§2). It sends no mail and receives none — which makes it a
free identity to forge, and forged mail from a lookalike of your own domain is worth
preventing before launch rather than after. Two records state that it never sends:

```
Type: TXT   Name: @        Value: v=spf1 -all
Type: TXT   Name: _dmarc   Value: v=DMARC1; p=reject; rua=mailto:hello@austingymprices.com
```

`-all` (hardfail) is correct here precisely because it is wrong on a sending domain.

## The thing that actually decides whether outreach lands

**Cloudflare Email Routing forwards; it does not send.** The SPF and DKIM records above
authorise mail on the way *in* to `hello@`. They say nothing about mail going *out*, and
outreach is outbound.

`docs/outreach.html` builds `mailto:` links, so the message is composed and sent by
whatever mail client opens — in practice a Gmail account. That splits into two cases and
they behave very differently:

1. **Sending as the personal Gmail address.** Google's own SPF and DKIM apply, the
   `From:` domain is `gmail.com`, everything aligns, and it lands. `austingymprices.com`
   is irrelevant to it. The cost is that outreach does not come from the brand — and a
   gym owner receiving a note about a listing on austingymprices.com from an unrelated
   personal address is exactly the mail that gets deleted.

2. **Sending as `hello@austingymprices.com` via Gmail "send mail as".** The `From:`
   domain is now ours, and **neither SPF nor DKIM aligns with it**: the current SPF
   authorises Cloudflare's forwarders, not Google's senders, and the message is signed for
   `gmail.com`, not for us. Under a future `p=reject` this mail **fails DMARC outright**.
   Today, with no DMARC published, receivers fall back to their own heuristics — which is
   precisely the "lands in spam" symptom you are trying to prevent.

**DECIDED 2026-08-20: case 1. No Workspace, no external sender.** Outreach sends from the
project Gmail as itself. That removes the alignment problem by removing the claim — there
is no branded `From:` to fail DMARC — and it means **no sending-domain work is needed at
all**. The SPF and DKIM records already in place cover inbound routing to `hello@`, which
is the only thing this domain does with mail.

The consequence to accept knowingly: outreach arrives from a Gmail address rather than
from `hello@austingymprices.com`. For the Founder Campaign (§10) that is arguably the
right register anyway — it is a personal note from the owner, sent by hand, and §10 is
explicit that no AI writes it. A personal address is what a personal note comes from.

If that is ever revisited, the route is Google Workspace: **edit** the existing SPF record
to add `include:_spf.google.com` — never add a second record — and publish the
`google._domainkey` record Workspace generates.

## Summary

| Action | Status |
|---|---|
| Add SPF to austingymprices.com | **Not done — already present.** Adding a second record would cause a permerror and break SPF. |
| Confirm DKIM | **Confirmed present and valid** — `cf2024-1`, RSA-2048. |
| Add DMARC to austingymprices.com | **Recommended, not applied** — no credentials. Record above. |
| Lock down atxgymprices.com | **Recommended, not applied.** Records above. |
| Outbound alignment for outreach | **Decided — send from the project Gmail.** No sending-domain work needed. |
