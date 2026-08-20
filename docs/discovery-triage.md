# Discovery triage — for owner review

The raw report is `docs/discovery-report.md` (294 candidates). This is the same
data split three ways so category (b) is the only pile that needs reading.

**Nothing here is written to `/data`.** Paired by URL, never by index — the probe cache
and the candidate list drift apart as gyms get listed, and an index pairing silently
attaches the wrong result to the wrong gym.

Counts below are of **distinct business names**, so a chain that surfaced once per
location appears once. That is why they total less than the 294 raw candidates.

| | count |
|---|---|
| (a) obvious keeps | 92 |
| (b) needs your judgment | 21 |
| (c) obvious excludes | 144 |

## (a) Obvious keeps — in scope, price sourceable

| Gym | Region | Source type | Sample prices |
|---|---|---|---|
| 10th Planet Austin | downtown | HUMAN-READABLE | — |
| AKT | downtown | HUMAN-READABLE | $59 |
| ALIGN Pilates Studios West | downtown | HUMAN-READABLE | — |
| ATX PILATES | downtown | HUMAN-READABLE | — |
| Austin Fight Team | downtown | SCRAPEABLE | $1 $120 $750 $85 |
| BE Fit Modern Pilates | downtown | HUMAN-READABLE | — |
| CrossFit 2024 | downtown | SCRAPEABLE | $25 $60 |
| CrossFit Uncommon | downtown | HUMAN-READABLE | — |
| Easley Boxing and Fitness | downtown | HUMAN-READABLE | — |
| Evolution Pilates & Flow | downtown | SCRAPEABLE | $10 $15 $20 $25 |
| Forge Strength Austin | downtown | SCRAPEABLE | $129.99 $1498 $999 |
| Generator Athlete Lab | downtown | SCRAPEABLE | $65 $99 |
| Gracie Barra South Austin | downtown | HUMAN-READABLE | — |
| Gracie Humaitá Austin | downtown | SCRAPEABLE | $10 $30 |
| Haus of B. Pilates | downtown | HUMAN-READABLE | — |
| Inner Diva Studios | downtown | HUMAN-READABLE | $10 |
| Mesa Rim Climbing Center | downtown | SCRAPEABLE | $10 $20 $25 $50 $6 |
| Mōtiv Fitness | downtown | SCRAPEABLE | $10 $15 $3 |
| Olga Roberts Studio - Body Intelligence Pilate | downtown | HUMAN-READABLE | — |
| Pure Pilates Austin | downtown | HUMAN-READABLE | — |
| Renzo Gracie Austin | downtown | HUMAN-READABLE | — |
| Ritual Moves Pilates (Austin) | downtown | HUMAN-READABLE | — |
| STRONG Pilates | downtown | HUMAN-READABLE | $39 |
| Shine Hot Pilates + Sculpt Downtown Austin | downtown | SCRAPEABLE | $19.99 $199.99 $20 |
| SoLa CrossFit | downtown | HUMAN-READABLE | — |
| Urban Lagree - East Austin | downtown | HUMAN-READABLE | — |
| VITA Well Pilates Studio | downtown | SCRAPEABLE | $15 $5 |
| sharpbody Pilates | downtown | HUMAN-READABLE | — |
| soFly Social | downtown | SCRAPEABLE | $100 $15 $150 $158 $16 |
| Activate HER FiT | east-austin | SCRAPEABLE | $1200 $140 $195 $330 $360 |
| Aer Pilates | east-austin | HUMAN-READABLE | $99 |
| Athletic Outcomes | east-austin | SCRAPEABLE | $49 $99 |
| BASE | east-austin | HUMAN-READABLE | — |
| CrossFit Jääkarhu | east-austin | HUMAN-READABLE | — |
| Dane's Body Shop - Manor Road | east-austin | HUMAN-READABLE | — |
| Grit ATX | east-austin | HUMAN-READABLE | — |
| Kore Kollective Modern Pilates | east-austin | SCRAPEABLE | $149 $39 $99 |
| Squatch Frontier Fitness | east-austin | SCRAPEABLE | $115 $225 |
| Studio KINA | east-austin | HUMAN-READABLE | — |
| The Colosseum | east-austin | SCRAPEABLE | $115 $225 |
| CrossFit REP | hyde-park | SCRAPEABLE | $ 149 $ 189 $ 219 $ 25 |
| CrossFit Renew | hyde-park | HUMAN-READABLE | — |
| CrossFit Strength Haven | hyde-park | HUMAN-READABLE | — |
| Danzversity | hyde-park | SCRAPEABLE | $100 $150 $20 $360 $69 |
| Dell JCC | hyde-park | SCRAPEABLE | $15 $18 $20 |
| HIT Athletic | hyde-park | HUMAN-READABLE | $160 |
| Hive and Honey ATX | hyde-park | SCRAPEABLE | $100 $150 $260 $375 $40 |
| Homebody Studios - Austin | hyde-park | SCRAPEABLE | $35.00 $55.00 $75.00 $85.00 |
| Laché Movement Co. | hyde-park | SCRAPEABLE | $100 $110 $115 $125 $135 |
| MOD FITNESS | hyde-park | HUMAN-READABLE | $59 |
| Moogie Pilates | hyde-park | SCRAPEABLE | $255 $99 |
| Moontower Pilates | hyde-park | HUMAN-READABLE | — |
| Novi Pilates ATX | hyde-park | SCRAPEABLE | $312 $400 $444 $47 $600 |
| Shape Method | hyde-park | HUMAN-READABLE | — |
| Shed Pilates + Fitness | hyde-park | SCRAPEABLE | $120 $125 $170 $190 $220 |
| Sheine Pilates | hyde-park | SCRAPEABLE | $35 $60 |
| AMLI Branch Park | mueller | SCRAPEABLE | $1 $2 $3 |
| ATX Tactics | mueller | SCRAPEABLE | $100 $116 $129 $1400 $150 |
| Brass Ovaries | mueller | HUMAN-READABLE | — |
| Solomon | mueller | SCRAPEABLE | $25 $30 $300 |
| StretchLab Mueller | mueller | HUMAN-READABLE | $5 |
| Texas Barbell Club | mueller | SCRAPEABLE | $549.00 $65.00 |
| Thinkery | mueller | SCRAPEABLE | $125 $160 $195 $230 $265 |
| Yoga East Austin | mueller | HUMAN-READABLE | $59 |
| B Pilates | south-soco | HUMAN-READABLE | — |
| BFT South Congress | south-soco | HUMAN-READABLE | $33 |
| El Studio Pilates | south-soco | HUMAN-READABLE | — |
| FOGO CrossFit | south-soco | HUMAN-READABLE | — |
| FS8 SoCo | south-soco | HUMAN-READABLE | $39 |
| Forma Fitness | south-soco | HUMAN-READABLE | — |
| Integral Pilates ATX | south-soco | HUMAN-READABLE | $5 |
| Lion's Den Fitness | south-soco | HUMAN-READABLE | — |
| Method Pilates | Bouldin Creek | south-soco | SCRAPEABLE | $255 $55 |
| Muvmet Studio | south-soco | SCRAPEABLE | $100 $139 $169 $185 $199 |
| Neighborhood Pilates | south-soco | HUMAN-READABLE | — |
| New Era Martial Arts | south-soco | SCRAPEABLE | $100 $40 $70 |
| Persona Pilates | south-soco | SCRAPEABLE | $10 $179 |
| Rhythm House ATX | south-soco | SCRAPEABLE | $1 $125 $15 $169 $170 |
| ToddPilates Fitness | south-soco | SCRAPEABLE | $164 $169 $19 $319 $329 |
| Austin Barbell Club (North) | the-domain | HUMAN-READABLE | — |
| Austin Gymnastics Club | the-domain | SCRAPEABLE | $10 $140 $170 $20 $75 |
| Grounded Performance ATX | the-domain | SCRAPEABLE | $ 10 $1 $180 |
| MACA Martial Arts | the-domain | HUMAN-READABLE | — |
| North Austin Strong | the-domain | HUMAN-READABLE | $10 |
| OTL Fitness | the-domain | SCRAPEABLE | $195 $20 $235 $275 $30 |
| PURE Yoga Texas | North Austin | the-domain | HUMAN-READABLE | — |
| Pronto Pilates Arboretum | the-domain | SCRAPEABLE | $25 $5 $50 $99 |
| UpReach CrossFit | the-domain | HUMAN-READABLE | — |
| Vigor Pilates | the-domain | HUMAN-READABLE | — |
| We Rock The Spectrum - North Austin | the-domain | HUMAN-READABLE | — |
| Ying Yoga Pilates - Austin | the-domain | SCRAPEABLE | $100 $1030 $108 $136 $138 |
| Yoga Pod Austin | the-domain | HUMAN-READABLE | $40 |

## (b) Needs your judgment — one line each on what the call is

| Gym | Region | Source type | The judgment call |
|---|---|---|---|
| Austin Ecstatic Dance Center | south-soco | SCRAPEABLE | Dance-led — is it "a place you work out" or a dance school? |
| Austin Uptown Dance | east-austin | HUMAN-READABLE | Dance-led — is it "a place you work out" or a dance school? |
| BB Dance Collective | hyde-park | HUMAN-READABLE | Dance-led — is it "a place you work out" or a dance school? |
| Ballet Austin | downtown | HUMAN-READABLE | Dance-led — is it "a place you work out" or a dance school? |
| Dance Austin Studio | downtown | SCRAPEABLE | Dance-led — is it "a place you work out" or a dance school? |
| Dance With Me Austin | hyde-park | HUMAN-READABLE | Dance-led — is it "a place you work out" or a dance school? |
| Esquina Tango | downtown | SCRAPEABLE | Dance-led — is it "a place you work out" or a dance school? |
| Evenground Dance Studio | east-austin | SCRAPEABLE | Dance-led — is it "a place you work out" or a dance school? |
| Go Dance Studio | east-austin | HUMAN-READABLE | Dance-led — is it "a place you work out" or a dance school? |
| Jazzercise | downtown | HUMAN-READABLE | Dance-led — is it "a place you work out" or a dance school? |
| Shuffle HQ Dance and Fitness Studio | downtown | HUMAN-READABLE | Dance-led — is it "a place you work out" or a dance school? |
| AMP BJJ Northwest Hills | hyde-park | SCRAPEABLE | Martial-arts school — in scope as classes, but confirm adult drop-in exists. |
| Analog Jiu Jitsu | hyde-park | SCRAPEABLE | Martial-arts school — in scope as classes, but confirm adult drop-in exists. |
| Austin Women's Boxing Club | downtown | SCRAPEABLE | Martial-arts school — in scope as classes, but confirm adult drop-in exists. |
| Barbells & BJJ | the-domain | SCRAPEABLE | Martial-arts school — in scope as classes, but confirm adult drop-in exists. |
| Black Widow MMA | downtown | SCRAPEABLE | Martial-arts school — in scope as classes, but confirm adult drop-in exists. |
| East Austin Jiujitsu Parlor | downtown | SCRAPEABLE | Martial-arts school — in scope as classes, but confirm adult drop-in exists. |
| Fighting Fit Kickboxing & Jiu Jitsu | the-domain | SCRAPEABLE | Martial-arts school — in scope as classes, but confirm adult drop-in exists. |
| Shield Brazilian Jiu-Jitsu | hyde-park | SCRAPEABLE | Martial-arts school — in scope as classes, but confirm adult drop-in exists. |
| TITLE Boxing Club Austin North | hyde-park | HUMAN-READABLE | Martial-arts school — in scope as classes, but confirm adult drop-in exists. |
| YTX Yoga, Strength, Pilates, & Recovery | downtown | HUMAN-READABLE | Recovery/wellness — not a place you train. |

## (c) Obvious excludes — count and category only

| Category | Count |
|---|---|
| site reads fine, publishes no price | 118 |
| already listed | 9 |
| bot wall | 3 |
| no website on record | 14 |

No detail given by design: none of these can produce a price without a change of
circumstance (a site appearing, a paywall lifting, a price being published).
