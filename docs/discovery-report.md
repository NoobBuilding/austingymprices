# Gym discovery sweep

Enumerated from Google Places inside our region bounds, diffed against the
gyms we already list, then probed for a fetchable price.

**This is a proposal. Nothing here has been written to `/data`.**

Classification: **SCRAPEABLE** = prices in fetchable HTML, a scraper target ·
**HUMAN-READABLE** = prices exist but sit behind a booking widget, so they go on
the transcription list · **NO-PUBLISHED-PRICE** = site reads fine but
publishes no price on any path tried · **GATED** = bot wall ·
**NO-SITE** = no website on record.

| | count |
|---|---|
| SCRAPEABLE | 69 |
| HUMAN-READABLE | 71 |
| NO-PUBLISHED-PRICE | 136 |
| GATED | 4 |
| NO-SITE | 14 |
| already listed | 58 |
| set aside (out of v1 scope) | 29 |

## Candidates

Downtown first — it is the weakest region (1 of 12 priced) and the most
visible, so it is where the first cherry-picking pass should land.


### downtown — 44 candidate(s)

| Name | Category | Website | Class | Sample prices | Note |
|---|---|---|---|---|---|
| **Activate HER FiT**<br><sub>906 E 5th St. Ste 202, Austin, TX 78702, USA</sub> | crossfit-hiit | [link](http://www.activateherfit.com/) | **SCRAPEABLE** | $1200 $140 $195 $330 $360 $600 $650 $70 | prices in fetchable HTML |
| **Ballet Austin's Butler Center for Dance & Fitness**<br><sub>501 W 3rd St, Austin, TX 78701, USA</sub> | gym-classes | [link](https://balletaustin.org/dance-fitness/) | **SCRAPEABLE** | $3.00 $5 | prices in fetchable HTML |
| **Fitcidence**<br><sub>2921 E 17th St Ste 100, Austin, TX 78702, USA</sub> | gym-classes | [link](https://fitcidence.com/) | **SCRAPEABLE** | $119 $139 $26 $69 | prices in fetchable HTML |
| **Flow Pilates ATX**<br><sub>908 E 5th St. Ste 114, Austin, TX 78702, USA</sub> | pilates | [link](https://www.flowpilatesatx.com/) | **SCRAPEABLE** | $30 $34 $34.99 | prices in fetchable HTML |
| **Forge Strength Austin**<br><sub>1107 S 8th St Ste F, Austin, TX 78704, USA</sub> | crossfit-hiit | [link](http://www.forgestrengthaustin.com/) | **SCRAPEABLE** | $129.99 $1498 $999 | prices in fetchable HTML |
| **Generator Athlete Lab**<br><sub>800 W Cesar Chavez St PP120, Austin, TX 78701, USA</sub> | crossfit-hiit | [link](https://www.generatorathletelab.com/?utm_source=LocalSearch&utm_medium=GoogleBusinessProfile&utm_id=Organic) | **SCRAPEABLE** | $65 $99 | prices in fetchable HTML |
| **JETSET Pilates Downtown Austin**<br><sub>1011 W 5th St #140, Austin, TX 78703, USA</sub> | pilates | [link](https://jetsetpilates.com/tx/downtown-austin/) | **SCRAPEABLE** | $145 $169 $17 $219 $269 $279 $289 $35 | prices in fetchable HTML |
| **Moogie Pilates**<br><sub>4300 Speedway Ste 105, Austin, TX 78751, USA</sub> | pilates | [link](https://www.moogiepilates.com/) | **SCRAPEABLE** | $255 $99 | prices in fetchable HTML |
| **Mōtiv Fitness**<br><sub>809 S Lamar Blvd Ste K, Austin, TX 78704, USA</sub> | gym-classes | [link](https://motivfitness.com/austin-location/) | **SCRAPEABLE** | $10 $15 $3 | prices in fetchable HTML |
| **Nocturna**<br><sub>605 W 37th St Ste b, Austin, TX 78705, USA</sub> | gym-classes | [link](http://www.nocturnacoven.com/) | **SCRAPEABLE** | $139 $18 $189 $23 $25 $60 $79 | prices in fetchable HTML |
| **Novi Pilates ATX**<br><sub>1508 W 34th St Second Floor, Austin, TX 78703, USA</sub> | pilates | [link](http://noviatx.com/) | **SCRAPEABLE** | $312 $400 $444 $47 $600 $800 $94 | prices in fetchable HTML |
| **OPTML Performance**<br><sub>410 Pressler St, Austin, TX 78703, USA</sub> | boxing | [link](http://www.optmltraining.com/) | **SCRAPEABLE** | $130 $180 | prices in fetchable HTML |
| **Shine Hot Pilates + Sculpt Downtown Austin**<br><sub>117 Lavaca St, Austin, TX 78701, USA</sub> | pilates | [link](https://shinehotpilates.com/) | **SCRAPEABLE** | $19.99 $199.99 $20 | prices in fetchable HTML |
| **ALIGN Pilates Studios West**<br><sub>1204 W 6th St, Austin, TX 78703, USA</sub> | pilates | [link](https://www.alignpilatesstudios.com/) | **HUMAN-READABLE** | — | Momence widget — prices behind JS |
| **Ballet Austin**<br><sub>501 W 3rd St, Austin, TX 78701, USA</sub> | gym-weights | [link](http://www.balletaustin.org/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **Ballet Austin's Pilates Center**<br><sub>501 W 3rd St, Austin, TX 78701, USA</sub> | pilates | [link](https://balletaustin.org/pilates/) | **HUMAN-READABLE** | $20 | mindbody widget — prices behind JS |
| **Dane's Body Shop - Manor Road**<br><sub>2701 Manor Rd, Austin, TX 78722, USA</sub> | crossfit-hiit | [link](http://danesbodyshop.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **Haus of B. Pilates**<br><sub>1614 W 5th St, Austin, TX 78703, USA</sub> | pilates | [link](https://hausofbpilates.com/) | **HUMAN-READABLE** | — | MarianaTek widget — prices behind JS |
| **Jazzercise**<br><sub>1301 Shoal Creek Blvd, Austin, TX 78701, USA</sub> | gym-classes | [link](https://www.jazzercise.com/location/jazzercise-austin-recreation-center?utm_source=google&utm_medium=organic&utm_campaign=render_gmb) | **HUMAN-READABLE** | — | GloFox widget — prices behind JS |
| **Olga Roberts Studio - Body Intelligence Pilates**<br><sub>Olga Roberts Studio, 401 W 3rd St, Austin, TX 78701, USA</sub> | pilates | [link](https://www.olgarobertsstudio.com/) | **HUMAN-READABLE** | — | walla widget — prices behind JS |
| **Pure Pilates Austin**<br><sub>Corner of 22 1/2 & Pearl, 2222 Rio Grande St #105, Austin, TX 78705, USA</sub> | pilates | [link](http://www.purepilatesaustin.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **Ritual Moves Pilates (Austin)**<br><sub>1211 E 11th St Ste 101, Austin, TX 78702, USA</sub> | pilates | [link](http://ritualmoves.com/) | **HUMAN-READABLE** | — | marianatek widget — prices behind JS |
| **STRONG Pilates**<br><sub>1717 W 6th St Ste. R110, Austin, TX 78703, USA</sub> | pilates | [link](https://strongpilates.co/location/central-austin/) | **HUMAN-READABLE** | $39 | glofox widget — prices behind JS |
| **Urban Lagree - East Austin**<br><sub>1212 Chicon St #104, Austin, TX 78702, USA</sub> | pilates | [link](http://www.urbanlagree.com/) | **HUMAN-READABLE** | — | Mariana Tek widget — prices behind JS |
| **YTX Yoga, Strength, Pilates, & Recovery**<br><sub>200 W 6th St, Austin, TX 78701, USA</sub> | yoga | [link](http://ytxaustin.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **sharpbody Pilates**<br><sub>2823 E Martin Luther King Jr Blvd Ste 115, Austin, TX 78702, USA</sub> | pilates | [link](https://www.sharpbodypilates.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **30 Minute Hit**<br><sub>3016 Guadalupe St Ste B200, Austin, TX 78705, USA</sub> | boxing | [link](https://www.30minutehit.com/locations/austin-kickboxing-boxing-fitness.html) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Austin Pilates Barn**<br><sub>1300 Northwood Rd, Austin, TX 78703, USA</sub> | pilates | [link](http://www.austinpilatesbarn.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Casa de Luz Village**<br><sub>1701 Toomey Rd, Austin, TX 78704, USA</sub> | yoga | [link](https://www.casadeluz.org/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **CrossFit Central Downtown** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>410 Pressler St, Austin, TX 78703, USA</sub> | crossfit-hiit | [link](https://www.crossfitcentraldowntown.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Dos Gym**<br><sub>906 E 5th St. Suite 100, Austin, TX 78702, USA</sub> | boxing | [link](https://sites.google.com/view/dos-gym/home) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Driven Performance Training**<br><sub>515 Congress Ave # N, Austin, TX 78701, USA</sub> | crossfit-hiit | [link](http://www.drivenaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Gregory Gym**<br><sub>Gregory Gymnasium, 2101 Speedway, Austin, TX 78712, USA</sub> | gym-weights | [link](http://www.utrecsports.org/gre) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Holiday Inn Express & Suites Austin Downtown - University by IHG**<br><sub>805 Neches St, Austin, TX 78701, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=EX&regionCode=US&hotelCode=AUSNS&cm_mmc=GoogleMaps-_-EX-_-US-_-AUSNS) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Hotel Indigo Austin Downtown - University by IHG**<br><sub>810 Red River St, Austin, TX 78701, USA</sub> | gym-weights | [link](https://www.ihg.com/hotelindigo/hotels/us/en/austin/ausit/hoteldetail?cm_mmc=GoogleMaps-_-IN-_-US-_-AUSIT) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Joao Crus Brazilian Jiu-Jitsu**<br><sub>1112 N Lamar Blvd, Austin, TX 78703, USA</sub> | bjj-mma | [link](http://www.joaocrusbjj.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Rx Fit**<br><sub>201 Lavaca St, Austin, TX 78701, USA</sub> | crossfit-hiit | [link](https://rxfit.co/?utm_source=gbp&utm_medium=click) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Somaspace — Classical Pilates & the Gyrotonic Method in Austin**<br><sub>1611 W 5th St #140, Austin, TX 78703, USA</sub> | pilates | [link](https://somaspacepilates.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Studs Up Training**<br><sub>410 Pressler St, Austin, TX 78703, USA</sub> | crossfit-hiit | [link](https://www.studsuptraining.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Swift Fit Events**<br><sub>918 Congress Ave Ste 100, Austin, TX 78701, USA</sub> | climbing | [link](https://swiftfitevents.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Texas Taekwondo**<br><sub>2001 San Jacinto Blvd, Austin, TX 78705, USA</sub> | bjj-mma | [link](http://www.utexastaekwondo.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **UT Recreational Sports Center**<br><sub>2001 San Jacinto Blvd, Austin, TX 78712, USA</sub> | gym-weights | [link](https://www.utrecsports.org/facilities/facility/recreational-sports-center) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **barre3**<br><sub>115 Sandra Muraida Way, Austin, TX 78703, USA</sub> | gym-classes | [link](http://barre3.com/studio-locations/austin-downtown) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Outdoor Calisthenics Gym at Auditorium Shores**<br><sub>9307, Austin, TX, Ann and Roy Butler Hike and Bike Trl, Austin, TX 78701, USA</sub> | climbing | — | **NO-SITE** | — | no website in Places |

### east-austin — 52 candidate(s)

| Name | Category | Website | Class | Sample prices | Note |
|---|---|---|---|---|---|
| **Athletic Outcomes**<br><sub>2301-A E Riverside Dr #50, Austin, TX 78741, USA</sub> | crossfit-hiit | [link](https://www.athleticoutcomes.com/) | **SCRAPEABLE** | $49 $99 | prices in fetchable HTML |
| **Austin Fight Team**<br><sub>700 E Live Oak St, Austin, TX 78704, USA</sub> | boxing | [link](http://austinfightteam.com/) | **SCRAPEABLE** | $1 $120 $750 $85 | prices in fetchable HTML |
| **Bouldering Project - Springdale** ⚠︎<br><sub>possibly already listed as *Austin Bouldering Project*</sub><br><sub>979 Springdale Rd, Austin, TX 78702, USA</sub> | yoga | [link](https://boulderingproject.com/location/springdale/) | **SCRAPEABLE** | $55 $8 $85 $95 | prices in fetchable HTML |
| **CrossFit 2024** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>2015 E Riverside Dr #7BB, Austin, TX 78741, USA</sub> | crossfit-hiit | [link](http://www.crossfit2024.com/) | **SCRAPEABLE** | $25 $60 | prices in fetchable HTML |
| **East Austin Jiujitsu Parlor**<br><sub>979 Springdale Rd #111, Austin, TX 78702, USA</sub> | bjj-mma | [link](https://www.eastaustinjiujitsu.com/) | **SCRAPEABLE** | $110 $129 $150 $20 $200 $40 $69 | prices in fetchable HTML |
| **Esquina Tango**<br><sub>209 Pedernales St, Austin, TX 78702, USA</sub> | yoga | [link](http://www.esquinatango.org/) | **SCRAPEABLE** | $1 $10 $100 $100.00 $110.00 $13.00 $16.00 $2 | prices in fetchable HTML |
| **Homebody Studios - Austin**<br><sub>2203 Lake Austin Blvd, Austin, TX 78703, USA</sub> | gym-classes | [link](https://homebodystudios.co/) | **SCRAPEABLE** | $35.00 $55.00 $75.00 $85.00 | prices in fetchable HTML |
| **Kawi Crossfit** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>4812 E 7th St, Austin, TX 78702, USA</sub> | crossfit-hiit | [link](http://bekawi.com/) | **SCRAPEABLE** | $170 $200 $230 | prices in fetchable HTML |
| **Kore Kollective Modern Pilates** ⚠︎<br><sub>possibly already listed as *Kollective*</sub><br><sub>979 Springdale Rd #810, Austin, TX 78702, USA</sub> | pilates | [link](http://korekollective.com/) | **SCRAPEABLE** | $149 $39 $99 | prices in fetchable HTML |
| **Method Pilates | Bouldin Creek**<br><sub>1600 S 1st St #130, Austin, TX 78704, USA</sub> | pilates | [link](https://methodpilates.com/) | **SCRAPEABLE** | $255 $55 | prices in fetchable HTML |
| **Pressure Gym**<br><sub>1923 E 7th St Unit 100, Austin, TX 78702, USA</sub> | boxing | [link](http://pressuregym.com/) | **SCRAPEABLE** | $150 $1530 $17 $30 $65 | prices in fetchable HTML |
| **Squatch Frontier Fitness**<br><sub>701 Tillery St Ste C, Austin, TX 78702, USA</sub> | crossfit-hiit | [link](https://www.squatchfitness.com/) | **SCRAPEABLE** | $115 $225 | prices in fetchable HTML |
| **The Colosseum**<br><sub>701 Tillery St, Austin, TX 78702, USA</sub> | climbing | [link](https://www.colosseumatx.com/) | **SCRAPEABLE** | $115 $225 | prices in fetchable HTML |
| **soFly Social**<br><sub>979 Springdale Rd Ste 112, Austin, TX 78702, USA</sub> | gym-classes | [link](http://sofly.social/) | **SCRAPEABLE** | $100 $15 $150 $158 $16 $18.50 $185 $195 | prices in fetchable HTML |
| **10th Planet Austin** ⚠︎<br><sub>possibly already listed as *10th Planet Jiu Jitsu Austin*</sub><br><sub>4509 Freidrich Ln #210, Austin, TX 78744, USA</sub> | bjj-mma | [link](http://10patx.com/) | **HUMAN-READABLE** | — | zenplanner widget — prices behind JS |
| **AKT**<br><sub>2400 E 6th St, Austin, TX 78702, USA</sub> | gym-classes | [link](https://www.theakt.com/) | **HUMAN-READABLE** | $59 | clubready widget — prices behind JS |
| **ALIGN Pilates Studios East**<br><sub>1023 Springdale Rd Ste 2B, Austin, TX 78721, USA</sub> | pilates | [link](https://www.alignpilatesstudios.com/) | **HUMAN-READABLE** | — | Momence widget — prices behind JS |
| **ATX PILATES**<br><sub>2300 S Lamar Blvd #105, Austin, TX 78704, USA</sub> | pilates | [link](http://www.atxpilates.com/) | **HUMAN-READABLE** | — | momence widget — prices behind JS |
| **BASE**<br><sub>1401 Art Dilly Dr., Austin, TX 78702, USA</sub> | yoga | [link](https://baseatx.com/) | **HUMAN-READABLE** | — | Mariana Tek widget — prices behind JS |
| **BE Fit Modern Pilates**<br><sub>1401 E 6th St Ste 207, Austin, TX 78702, USA</sub> | pilates | [link](https://befitmp.com/tx/atx-east/) | **HUMAN-READABLE** | — | marianatek widget — prices behind JS |
| **Easley Boxing and Fitness**<br><sub>2401 Thornton Rd A1, Austin, TX 78704, USA</sub> | boxing | [link](http://www.easleyboxing.com/) | **HUMAN-READABLE** | — | zenplanner widget — prices behind JS |
| **FS8 SoCo**<br><sub>3601 S Congress Ave Bldg E, Austin, TX 78704, USA</sub> | pilates | [link](https://fs8.com/soco/home) | **HUMAN-READABLE** | $39 | mindbody widget — prices behind JS |
| **Grit ATX**<br><sub>4704B E Cesar Chavez St, Austin, TX 78702, USA</sub> | climbing | [link](https://www.grit-atx.com/) | **HUMAN-READABLE** | — | arketa widget — prices behind JS |
| **Lion's Den Fitness**<br><sub>3500 S Congress Ave, Austin, TX 78704, USA</sub> | boxing | [link](https://ldfatx.com/) | **HUMAN-READABLE** | — | pushpress widget — prices behind JS |
| **SoLa CrossFit** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>2119 Goodrich Ave, Austin, TX 78704, USA</sub> | crossfit-hiit | [link](http://solacrossfit.com/) | **HUMAN-READABLE** | — | wodify widget — prices behind JS |
| **Studio KINA**<br><sub>916 Springdale Rd Bldg 4 Ste 106, Austin, TX 78702, USA</sub> | pilates | [link](https://studiokina.co/) | **HUMAN-READABLE** | — | arketa widget — prices behind JS |
| **ALIGN Pilates Studios Teacher Training**<br><sub>1023 Springdale Rd #9f, Austin, TX 78721, USA</sub> | pilates | [link](https://www.alignpilatesteachertraining.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Austin Bouldering Club**<br><sub>979 Springdale Rd, Austin, TX 78702, USA</sub> | climbing | [link](https://sweatpals.com/austinboulderingclub) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Austin Jiu Jitsu Collective**<br><sub>2032 S Lamar Blvd Unit B, Austin, TX 78704, USA</sub> | bjj-mma | [link](https://www.austinjiujitsuco.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Austin Kickboxing Academy**<br><sub>3906 Warehouse Row, Austin, TX 78704, USA</sub> | boxing | [link](http://www.atxkickboxing.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Barton Springs Pilates**<br><sub>1812 Airole Way, Austin, TX 78704, USA</sub> | pilates | [link](https://bartonspringspilates.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Black Box Creative**<br><sub>2300 S Lamar Blvd Ste 109, Austin, TX 78704, USA</sub> | gym-classes | [link](http://www.blackboxcreativeatx.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Blackbird**<br><sub>701 Tillery St Unit B3, Austin, TX 78702, USA</sub> | crossfit-hiit | [link](http://www.blackbirdfitnessandnutrition.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Central Athlete**<br><sub>1023 Springdale Rd Bldg 9b, Austin, TX 78721, USA</sub> | crossfit-hiit | [link](https://www.centralathlete.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Fit and Fearless**<br><sub>4109 Todd Ln Ste 1600, Austin, TX 78744, USA</sub> | bjj-mma | [link](https://www.fitandfearless.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Hidden Gem Gym**<br><sub>1024 Gardner Rd, Austin, TX 78721, USA</sub> | crossfit-hiit | [link](https://www.hiddengemgym.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Holiday Inn Austin-Town Lake by IHG**<br><sub>20 N Interstate Hwy 35, Austin, TX 78701, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=HI&regionCode=US&hotelCode=AUSTL&cm_mmc=GoogleMaps-_-HI-_-US-_-AUSTL) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Lumos Fitness Collective**<br><sub>2415 Burleson Rd, Austin, TX 78741, USA</sub> | crossfit-hiit | [link](http://www.lumosfitnesscollective.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Millennium Youth Entertainment Complex**<br><sub>1156 Hargrave St, Austin, TX 78702, USA</sub> | climbing | [link](https://www.millenniumaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Prana Wellness Club**<br><sub>1621 E 7th St, Austin, TX 78702, USA</sub> | yoga | [link](http://www.pranawellness.love/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Pure Barre**<br><sub>1401 E 6th St Ste 101, Austin, TX 78702, USA</sub> | gym-classes | [link](https://www.purebarre.com/location/austin-eastside-tx) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Pure Barre**<br><sub>3267 Bee Caves Rd Suite 120, Austin, TX 78746, USA</sub> | gym-classes | [link](https://www.purebarre.com/location/austin-westlake-tx) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Rise Kickbox**<br><sub>1181 Airport Blvd #150, Austin, TX 78702, USA</sub> | boxing | [link](http://www.risekickbox.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **RushTopFish**<br><sub>2611 S 5th St Unit c, Austin, TX 78704, USA</sub> | pilates | [link](https://rushtopfish.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Soma Reform Pilates & Wellness**<br><sub>2058 S Lamar Blvd, Austin, TX 78704, USA</sub> | pilates | [link](https://www.somareform.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Tapestry Dance**<br><sub>2015 E Riverside Dr Bldg 7, Austin, TX 78741, USA</sub> | gym-classes | [link](http://www.tapestry.org/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **The Pilates Apothecary**<br><sub>1101 E 6th St, Austin, TX 78702, USA</sub> | pilates | [link](https://www.pilatesapothecaryatx.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **The Void Martial Arts**<br><sub>701 Tillery St Ste A7B, Austin, TX 78702, USA</sub> | bjj-mma | [link](https://thevoidmma.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Bouldering Rocks**<br><sub>Austin, TX 78744, USA</sub> | climbing | — | **NO-SITE** | — | no website in Places |
| **Calisthenics Park at the Neighborhood Center**<br><sub>2802 Webberville Rd, Austin, TX 78702, USA</sub> | climbing | — | **NO-SITE** | — | no website in Places |
| **Flowhouse Studios**<br><sub>4100 E 51st St Ste 200, Austin, TX 78723, USA</sub> | yoga | — | **NO-SITE** | — | no website in Places |
| **Orozco’s Boxing Gym**<br><sub>8104A Posten Ln, Austin, TX 78744, USA</sub> | boxing | — | **NO-SITE** | — | no website in Places |

### hyde-park — 66 candidate(s)

| Name | Category | Website | Class | Sample prices | Note |
|---|---|---|---|---|---|
| **AMP BJJ Northwest Hills**<br><sub>3808 Spicewood Springs Rd Ste 103, Austin, TX 78759, USA</sub> | bjj-mma | [link](https://ampbjj.com/) | **SCRAPEABLE** | $118 $198 $39 $59 $78 $99 | prices in fetchable HTML |
| **ATX Tactics**<br><sub>7020 E Hwy 290 Ste B, Austin, TX 78723, USA</sub> | bjj-mma | [link](http://www.atxtactics.com/) | **SCRAPEABLE** | $100 $116 $129 $1400 $150 $155 $1550 $160 | prices in fetchable HTML |
| **Analog Jiu Jitsu**<br><sub>8222 N Lamar Blvd Unit-F59, Austin, TX 78753, USA</sub> | bjj-mma | [link](https://analogjiujitsu.com/) | **SCRAPEABLE** | $1 $10 $120 $145 $175 $20 $25.00 $55.00 | prices in fetchable HTML |
| **Body Collective**<br><sub>5501 N Lamar Blvd c111, Austin, TX 78751, USA</sub> | yoga | [link](https://flowyogatx.com/locations/austin/body-collective/) | **SCRAPEABLE** | $100 $30 | prices in fetchable HTML |
| **CrossFit REP** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>10603 Metric Blvd #142, Austin, TX 78758, USA</sub> | crossfit-hiit | [link](https://crossfitrep.com/) | **SCRAPEABLE** | $ 149 $ 189 $ 219 $ 25 | prices in fetchable HTML |
| **Dance Austin Studio**<br><sub>9012 Research Blvd #C-5, Austin, TX 78758, USA</sub> | gym-classes | [link](http://www.danceaustinstudio.com/) | **SCRAPEABLE** | $100 $130 $140 $150 $2 $20 $30 $80 | prices in fetchable HTML |
| **Danzversity**<br><sub>7531 Burnet Rd, Austin, TX 78757, USA</sub> | gym-classes | [link](https://www.danzversity.com/) | **SCRAPEABLE** | $100 $150 $20 $360 $69 | prices in fetchable HTML |
| **Dell JCC**<br><sub>7300 Hart Ln, Austin, TX 78731, USA</sub> | gym-weights | [link](http://shalomaustin.org/) | **SCRAPEABLE** | $15 $18 $20 | prices in fetchable HTML |
| **Evenground Dance Studio**<br><sub>8000 Anderson Square #104, Austin, TX 78757, USA</sub> | gym-classes | [link](http://www.evengroundtx.com/) | **SCRAPEABLE** | $15 $150 $17 $18.33 $20 $55 $85 | prices in fetchable HTML |
| **Hive and Honey ATX**<br><sub>3309 Hancock Dr, Austin, TX 78731, USA</sub> | pilates | [link](http://www.hiveandhoneyatx.com/) | **SCRAPEABLE** | $100 $150 $260 $375 $40 $400 $45 $50 | prices in fetchable HTML |
| **Laché Movement Co.**<br><sub>8868 Research Blvd #701, Austin, TX 78758, USA</sub> | climbing | [link](https://www.lachemove.com/) | **SCRAPEABLE** | $100 $110 $115 $125 $135 $200 $220 $240 | prices in fetchable HTML |
| **Mesa Rim Climbing Center**<br><sub>1205 Sheldon Cove Bldg 3, Austin, TX 78753, USA</sub> | climbing | [link](https://mesarim.com/austin/) | **SCRAPEABLE** | $10 $20 $25 $50 $6 $7 $89 | prices in fetchable HTML |
| **Shed Pilates + Fitness**<br><sub>5555 N Lamar Blvd Unit L-139, Austin, TX 78751, USA</sub> | pilates | [link](https://www.shedpilates.com/) | **SCRAPEABLE** | $120 $125 $170 $190 $220 $315 $35 $40 | prices in fetchable HTML |
| **Sheine Pilates**<br><sub>1813 W Anderson Ln. #1815, Austin, TX 78757, USA</sub> | pilates | [link](http://sheinepilates.com/) | **SCRAPEABLE** | $35 $60 | prices in fetchable HTML |
| **Texas Barbell Club**<br><sub>6448 E Hwy 290 Ste B108, Austin, TX 78723, USA</sub> | crossfit-hiit | [link](https://www.texasbarbellclub.com/) | **SCRAPEABLE** | $549.00 $65.00 | prices in fetchable HTML |
| **The Old Guard Thai Boxing Club**<br><sub>1702 Aldridge Dr A1, Austin, TX 78754, USA</sub> | boxing | [link](http://www.theogthaiboxingclub.com/) | **SCRAPEABLE** | $165 $205 $25 | prices in fetchable HTML |
| **ToddPilates Fitness North Austin**<br><sub>9029 Research Blvd #200, Austin, TX 78758, USA</sub> | yoga | [link](http://www.toddpilates.com/) | **SCRAPEABLE** | $164 $169 $19 $319 $329 $549 $565 | prices in fetchable HTML |
| **ATX PILATES The Village**<br><sub>2700 W Anderson Ln. #119, Austin, TX 78757, USA</sub> | pilates | [link](https://www.atxpilates.com/) | **HUMAN-READABLE** | — | momence widget — prices behind JS |
| **Austin Barbell Club (North)**<br><sub>500 Victor St Ste 600, Austin, TX 78753, USA</sub> | crossfit-hiit | [link](https://www.austinbarbell.com/) | **HUMAN-READABLE** | — | pushpress widget — prices behind JS |
| **Austin Uptown Dance**<br><sub>8868 Research Blvd #706, Austin, TX 78758, USA</sub> | gym-classes | [link](http://www.austinuptowndance.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **BB Dance Collective**<br><sub>1813 W Anderson Ln. #1821, Austin, TX 78757, USA</sub> | gym-classes | [link](https://bbdancecollective.com/) | **HUMAN-READABLE** | — | arketa widget — prices behind JS |
| **Brass Ovaries**<br><sub>6039 N Interstate 35 Frontage Rd, Austin, TX 78723, USA</sub> | gym-classes | [link](https://www.brassovaries.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **CrossFit Renew** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>8120 Research Blvd #103, Austin, TX 78758, USA</sub> | crossfit-hiit | [link](https://www.crossfitrenew.com/) | **HUMAN-READABLE** | — | pushpress widget — prices behind JS |
| **CrossFit Strength Haven** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>10604 Bluff Bend Dr Ste a, Austin, TX 78753, USA</sub> | crossfit-hiit | [link](http://crossfitstrengthhaven.com/) | **HUMAN-READABLE** | — | PushPress widget — prices behind JS |
| **CrossFit Uncommon** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>208 W Powell Ln, Austin, TX 78753, USA</sub> | crossfit-hiit | [link](https://www.crossfituncommon.com/) | **HUMAN-READABLE** | — | pushpress widget — prices behind JS |
| **Dane's Body Shop - Hyde Park** ⚠︎<br><sub>possibly already listed as *Hyde Park Gym*</sub><br><sub>807 Capitol Ct, Austin, TX 78756, USA</sub> | boxing | [link](http://www.danesbodyshop.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **Go Dance Studio**<br><sub>2525 W Anderson Ln. #530, Austin, TX 78757, USA</sub> | gym-classes | [link](https://www.godancestudio.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **HIT Athletic**<br><sub>7797 Burnet Rd, Austin, TX 78757, USA</sub> | yoga | [link](http://hitathletic.com/) | **HUMAN-READABLE** | $160 | mindbody widget — prices behind JS |
| **Jazzercise**<br><sub>2913 Northland Dr, Austin, TX 78757, USA</sub> | gym-classes | [link](https://www.jazzercise.com/location/jazzercise-northwest-recreation-center?utm_source=google&utm_medium=organic&utm_campaign=render_gmb) | **HUMAN-READABLE** | — | GloFox widget — prices behind JS |
| **MOD FITNESS**<br><sub>4406 Burnet Rd, Austin, TX 78756, USA</sub> | gym-classes | [link](http://modfitness.com/) | **HUMAN-READABLE** | $59 | marianatek widget — prices behind JS |
| **Moontower Pilates**<br><sub>1709 W Koenig Ln, Austin, TX 78756, USA</sub> | pilates | [link](http://moontowerpilates.com/) | **HUMAN-READABLE** | — | momence widget — prices behind JS |
| **PURE Yoga Texas | North Austin**<br><sub>8620 Burnet Rd #132, Austin, TX 78757, USA</sub> | yoga | [link](http://www.pureyogatexas.com/north-austin) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **Shape Method**<br><sub>5350 Burnet Rd #7, Austin, TX 78756, USA</sub> | pilates | [link](http://www.shapemethodpilates.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **Urban Lagree - Rosedale**<br><sub>4800 Burnet Rd Ste A-100, Austin, TX 78756, USA</sub> | pilates | [link](http://urbanlagree.com/) | **HUMAN-READABLE** | — | Mariana Tek widget — prices behind JS |
| **Vigor Pilates**<br><sub>8127 Mesa Dr Ste C-301, Austin, TX 78759, USA</sub> | pilates | [link](https://www.vigoratx.com/) | **HUMAN-READABLE** | — | momence widget — prices behind JS |
| **YTX Yoga, Cycling, Pilates, & Strength Training**<br><sub>2609 Perseverance Dr, Austin, TX 78731, USA</sub> | yoga | [link](https://www.ytxaustin.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **Archetype Boxing Club**<br><sub>2700 W Anderson Ln. Bldg 2, SUITE 203, Austin, TX 78757, USA</sub> | boxing | [link](https://www.archetypeboxing.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Atomic Outpost - North Austin**<br><sub>9805 Beck Cir, Austin, TX 78758, USA</sub> | climbing | [link](https://atomicoutpostnorthaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Britsbarre: Barre Fitness - Tarrytown**<br><sub>2425 Exposition Blvd, Austin, TX 78703, USA</sub> | gym-classes | [link](https://britsbarre.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Coach Nate Boxing and Fitness**<br><sub>5528 N Lamar Blvd, Austin, TX 78757, USA</sub> | boxing | [link](https://www.coachnateboxing.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **CrossFit Central Burnet Road** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>6205 Burnet Rd # A, Austin, TX 78757, USA</sub> | crossfit-hiit | [link](https://www.crossfitcentral.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Dance Discovery**<br><sub>2167 W Anderson Ln., Austin, TX 78757, USA</sub> | gym-classes | [link](https://austin-dance.org/?utm_source=google&utm_medium=organic&utm_campaign=gbp) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Gracie Barra North Austin Jiu Jitsu**<br><sub>8868 Research Blvd #608, Austin, TX 78758, USA</sub> | bjj-mma | [link](https://gbnorthaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Holiday Inn Austin Midtown by IHG**<br><sub>6000 Middle Fiskville Rd, Austin, TX 78752, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=HI&regionCode=US&hotelCode=AUSMF&cm_mmc=GoogleMaps-_-HI-_-US-_-AUSMF) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Integrated Fighting Arts Academy**<br><sub>9603 Saunders Ln, Austin, TX 78758, USA</sub> | bjj-mma | [link](https://www.ifaacademy.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **JWSD Cross Park**<br><sub>8701 Cross Park Dr, Austin, TX 78754, USA</sub> | gym-classes | [link](http://www.jwsdcrosspark.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **LANTE STUDIO**<br><sub>4043 Steck Ave, Austin, TX 78759, USA</sub> | pilates | [link](http://lantestudio.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Martial Way Legacy**<br><sub>1812 Payton Gin Rd #210, Austin, TX 78758, USA</sub> | bjj-mma | [link](http://www.martialwaylegacy.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Master Gohring's Tai Chi & Kung Fu**<br><sub>5775 Airport Blvd #600, Austin, TX 78752, USA</sub> | bjj-mma | [link](https://mastergohring.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Modern Art Jiu Jitsu**<br><sub>8127 Mesa Dr a105, Austin, TX 78759, USA</sub> | bjj-mma | [link](http://modernartjiujitsu.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Ninja Nation ATX - Austin, TX**<br><sub>6500 N Lamar Blvd, Austin, TX 78752, USA</sub> | climbing | [link](https://www.austin.ninjanation.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Nu-U Studio by Pole & Performance, LLC**<br><sub>7801 N Lamar Blvd A130, Austin, TX 78752, USA</sub> | yoga | [link](http://www.nu-u.studio/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **PURO Brazilian Jiu Jitsu | North Austin**<br><sub>7739 Northcross Dr r, Austin, TX 78757, USA</sub> | bjj-mma | [link](https://purojiujitsu.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Pilates Center of Austin**<br><sub>8229 Shoal Creek Blvd Ste 103, Austin, TX 78757, USA</sub> | pilates | [link](https://www.pilatescenterofaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Pilates on Kerbey**<br><sub>3701 Kerbey Ln, Austin, TX 78731, USA</sub> | pilates | [link](http://pilatesonkerbey.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Pole With Shi - Pole Dancing & Fitness Classes**<br><sub>Independent Contractor Space, 6039 N Interstate Hwy 35 Ste b, Austin, TX 78723, USA</sub> | gym-classes | [link](https://polewithshi.square.site/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Richard Lord's Boxing Gym**<br><sub>5528 N Lamar Blvd, Austin, TX 78757, USA</sub> | boxing | [link](http://www.lordsboxinggym.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **SWEAT440 Fitness Highland**<br><sub>110 Jacob Fontaine Ln Ste 200, Austin, TX 78752, USA</sub> | crossfit-hiit | [link](https://sweat440.com/gyms/texas/austin-78752/?utm_source=GMB&utm_medium=organic&utm_campaign=highland) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Sharp Pilates**<br><sub>4111 Marathon Blvd Ste 150, Austin, TX 78756, USA</sub> | pilates | [link](https://www.sharppilates.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **V.O.W. BJJ**<br><sub>5555 N Lamar Blvd H115, Austin, TX 78751, USA</sub> | bjj-mma | [link](https://vowbjj.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Zumba Love**<br><sub>9411 Parkfield Dr, Austin, TX 78758, USA</sub> | gym-classes | [link](https://www.instagram.com/zumbaloveatx?igsh=MTYwNnBsZnprb2swaw==) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **good pilates**<br><sub>4525 Guadalupe St STE 100, Austin, TX 78751, USA</sub> | pilates | [link](http://www.goodpilatesatx.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **MADabolic Austin North**<br><sub>2900 1/2, 2900 W Anderson Ln. B19, Austin, TX 78757, USA</sub> | crossfit-hiit | [link](https://madabolic.com/location/austin-north) | **GATED** | — | bot challenge (HTTP 403) |
| **Camp Mabry GYM**<br><sub>Austin, TX 78703, USA</sub> | crossfit-hiit | — | **NO-SITE** | — | no website in Places |
| **Relentless Boxing Academy**<br><sub>10809 Turner Dr, Austin, TX 78753, USA</sub> | boxing | — | **NO-SITE** | — | no website in Places |
| **X-Train: A Fitness Community**<br><sub>9603 Saunders Ln, Austin, TX 78758, USA</sub> | crossfit-hiit | — | **NO-SITE** | — | no website in Places |

### mueller — 24 candidate(s)

| Name | Category | Website | Class | Sample prices | Note |
|---|---|---|---|---|---|
| **AMLI Branch Park**<br><sub>1911 Philomena St, Austin, TX 78723, USA</sub> | climbing | [link](https://www.amli.com/apartments/austin/mueller-apartments/amli-branch-park?switch_code=58696&utm_source=gmb&utm_medium=organic&utm_campaign=BranchPark) | **SCRAPEABLE** | $1 $2 $3 | prices in fetchable HTML |
| **Evolution Pilates & Flow**<br><sub>3823 Airport Blvd Ste c, Austin, TX 78722, USA</sub> | pilates | [link](https://evolutionpilatesflow.com/) | **SCRAPEABLE** | $10 $15 $20 $25 | prices in fetchable HTML |
| **Solomon**<br><sub>1414 E 51st St, Austin, TX 78723, USA</sub> | climbing | [link](https://www.solomonatx.com/?utm_source=gmb&utm_medium=organic) | **SCRAPEABLE** | $25 $30 $300 | prices in fetchable HTML |
| **Thinkery**<br><sub>1830 Simond Ave, Austin, TX 78723, USA</sub> | climbing | [link](http://www.thinkeryaustin.org/) | **SCRAPEABLE** | $125 $160 $195 $230 $265 $3 $300 $335 | prices in fetchable HTML |
| **Renzo Gracie Austin**<br><sub>4631 Airport Blvd Ste 114, Austin, TX 78751, USA</sub> | bjj-mma | [link](http://renzogracieaustin.com/) | **HUMAN-READABLE** | — | ZenPlanner widget — prices behind JS |
| **StretchLab Mueller**<br><sub>2200 Aldrich St #110, Austin, TX 78723, USA</sub> | gym-weights | [link](https://local.stretchlab.com/location/mueller) | **HUMAN-READABLE** | $5 | clubready widget — prices behind JS |
| **Yoga East Austin**<br><sub>3801 Berkman Dr #B, Austin, TX 78723, USA</sub> | yoga | [link](http://yogaeastaustin.com/) | **HUMAN-READABLE** | $59 | momence widget — prices behind JS |
| **Ace Dances**<br><sub>924 E 51st St, Austin, TX 78751, USA</sub> | gym-classes | [link](http://acedances.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Andrea Liserio Pilates**<br><sub>1206 Deloney St, Austin, TX 78721, USA</sub> | pilates | [link](https://andrealiserio.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Ashtanga Yoga Austin**<br><sub>2112 Robert Browning St, Austin, TX 78723, USA</sub> | yoga | [link](http://www.ashtangayogaaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Austin Kung-Fu Academy**<br><sub>3823 Airport Blvd d, Austin, TX 78722, USA</sub> | bjj-mma | [link](http://www.austinkungfuacademy.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Chulel-Corrective Bodywork & Pilates**<br><sub>1414 E 51st St #116, Austin, TX 78723, USA</sub> | gym-weights | [link](http://www.chulel.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **CrossFit City Limits** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>5206 Eilers Ave, Austin, TX 78751, USA</sub> | crossfit-hiit | [link](http://crossfitcitylimits.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Dharma Yoga**<br><sub>3317 Manor Rd, Austin, TX 78723, USA</sub> | yoga | [link](http://www.dharma-yoga.net/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **DivaDance® HQ**<br><sub>3823 Airport Blvd d, Austin, TX 78722, USA</sub> | gym-classes | [link](https://divadancecompany.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **MovementLink**<br><sub>5206 Eilers Ave, Austin, TX 78751, USA</sub> | crossfit-hiit | [link](https://movementlink.fit/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **MuellerLakePark**<br><sub>4550 Mueller Blvd, Austin, TX 78723, USA</sub> | climbing | [link](http://www.muelleraustinonline.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **TrainLifeFit**<br><sub>4646 Mueller Blvd #1048, Austin, TX 78723, USA</sub> | gym-weights | [link](http://www.trainlifefit.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **VAURA Pilates - Mueller**<br><sub>2023 Aldrich St, Austin, TX 78723, USA</sub> | pilates | [link](https://vauramueller.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Vitality Pilates**<br><sub>508 E 53rd St Unit 100, Austin, TX 78751, USA</sub> | gym-weights | [link](http://vitalitypilatesaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **barre3**<br><sub>1911 Aldrich St, Austin, TX 78723, USA</sub> | gym-classes | [link](https://online.barre3.com/studio-locations/austinmueller) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Fierce Fitness**<br><sub>Austin, TX 78751, USA</sub> | crossfit-hiit | — | **NO-SITE** | — | no website in Places |
| **Fit dance**<br><sub>1810 Briarcliff Blvd, Austin, TX 78723, USA</sub> | gym-weights | — | **NO-SITE** | — | no website in Places |
| **Sagebrush Yoga Collective, LLC**<br><sub>5310 Helen St Unit 1B, Austin, TX 78751, USA</sub> | yoga | — | **NO-SITE** | — | no website in Places |

### south-soco — 65 candidate(s)

| Name | Category | Website | Class | Sample prices | Note |
|---|---|---|---|---|---|
| **Austin Ecstatic Dance Center**<br><sub>10203 Old Manchaca Rd, Austin, TX 78748, USA</sub> | gym-classes | [link](https://www.austinecstaticdancecenter.com/) | **SCRAPEABLE** | $20 $25 | prices in fetchable HTML |
| **Austin Women's Boxing Club**<br><sub>2919 Menchaca Rd #210, Austin, TX 78704, USA</sub> | boxing | [link](https://www.austinwomensboxingclub.com/) | **SCRAPEABLE** | $10 $2 $3 $30 $35 | prices in fetchable HTML |
| **Bouldering Project - Westgate** ⚠︎<br><sub>possibly already listed as *Austin Bouldering Project*</sub><br><sub>4477 S Lamar Blvd, Austin, TX 78745, USA</sub> | yoga | [link](https://boulderingproject.com/location/westgate/) | **SCRAPEABLE** | $55 $8 $85 $95 | prices in fetchable HTML |
| **Gracie Humaitá Austin**<br><sub>321 W Ben White Blvd Ste 108, Austin, TX 78704, USA</sub> | bjj-mma | [link](http://ghaustin.com/) | **SCRAPEABLE** | $10 $30 | prices in fetchable HTML |
| **JETSET Pilates South Austin**<br><sub>5601 Brodie Ln #530, Austin, TX 78745, USA</sub> | pilates | [link](https://jetsetpilates.com/tx/south-austin/) | **SCRAPEABLE** | $145 $169 $17 $219 $269 $279 $289 $35 | prices in fetchable HTML |
| **Muvmet Studio**<br><sub>8708 S Congress Ave B-230, Austin, TX 78745, USA</sub> | gym-classes | [link](https://muvmet.com/studio/) | **SCRAPEABLE** | $100 $139 $169 $185 $199 $229 $249 $260 | prices in fetchable HTML |
| **New Era Martial Arts**<br><sub>10203 Old Manchaca Rd, Austin, TX 78748, USA</sub> | bjj-mma | [link](http://www.thenewerama.com/) | **SCRAPEABLE** | $100 $40 $70 | prices in fetchable HTML |
| **Persona Pilates**<br><sub>4211 S Lamar Blvd Ste A26, Austin, TX 78704, USA</sub> | pilates | [link](https://www.personapilates.com/south-lamar) | **SCRAPEABLE** | $10 $179 | prices in fetchable HTML |
| **Rhythm House ATX**<br><sub>4622 S Lamar Blvd suit D, Austin, TX 78745, USA</sub> | gym-classes | [link](https://rhythmhouseatx.com/) | **SCRAPEABLE** | $1 $125 $15 $169 $170 $175 $225 $239 | prices in fetchable HTML |
| **ToddPilates Fitness**<br><sub>2919 Menchaca Rd #200, Austin, TX 78704, USA</sub> | gym-classes | [link](http://www.toddpilates.com/) | **SCRAPEABLE** | $164 $169 $19 $319 $329 $549 $565 | prices in fetchable HTML |
| **VITA Well Pilates Studio**<br><sub>1825 Fort View Rd Ste 111, Austin, TX 78704, USA</sub> | pilates | [link](https://vitawell.studio/) | **SCRAPEABLE** | $15 $5 | prices in fetchable HTML |
| **Aer Pilates**<br><sub>4511 S Congress Ave, Austin, TX 78745, USA</sub> | pilates | [link](https://aerpilates.com/) | **HUMAN-READABLE** | $99 | arketa widget — prices behind JS |
| **B Pilates** ⚠︎<br><sub>possibly already listed as *Club Pilates William Cannon*</sub><br><sub>3601 W William Cannon Dr Bldg 5, Suite 100, Austin, TX 78749, USA</sub> | pilates | [link](http://bpilatesaustin.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **BE Fit Modern Pilates**<br><sub>2330 S Lamar Blvd Ste. 130, Austin, TX 78704, USA</sub> | pilates | [link](https://befitmp.com/tx/south-lamar/) | **HUMAN-READABLE** | $25 | marianatek widget — prices behind JS |
| **BFT South Congress**<br><sub>3801 S Congress Ave Ste 112-114, Austin, TX 78704, USA</sub> | crossfit-hiit | [link](https://www.bodyfittraining.com/location/south-congress) | **HUMAN-READABLE** | $33 | clubready widget — prices behind JS |
| **CrossFit Jääkarhu** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>139 E St Elmo Rd, Austin, TX 78745, USA</sub> | crossfit-hiit | [link](https://karhustrength.com/) | **HUMAN-READABLE** | — | pushpress widget — prices behind JS |
| **El Studio Pilates**<br><sub>7509 Menchaca Rd Ste 400, Austin, TX 78745, USA</sub> | pilates | [link](https://www.elstudiopilates.com/) | **HUMAN-READABLE** | — | marianatek widget — prices behind JS |
| **FOGO CrossFit** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>4619 S Congress Ave Ste D, Austin, TX 78745, USA</sub> | crossfit-hiit | [link](http://crossfitfogo.com/) | **HUMAN-READABLE** | — | wodify widget — prices behind JS |
| **Forma Fitness**<br><sub>5700 Menchaca Rd #355, Austin, TX 78745, USA</sub> | gym-classes | [link](https://www.formafitstudio.com/) | **HUMAN-READABLE** | — | momence widget — prices behind JS |
| **Gracie Barra South Austin**<br><sub>8204 Brodie Ln #102, Austin, TX 78745, USA</sub> | bjj-mma | [link](https://gbsouthaustin.com/) | **HUMAN-READABLE** | — | wodify widget — prices behind JS |
| **Integral Pilates ATX**<br><sub>10030 Menchaca Rd, Austin, TX 78748, USA</sub> | pilates | [link](https://integralpilatesatx.com/) | **HUMAN-READABLE** | $5 | marianatek widget — prices behind JS |
| **Neighborhood Pilates**<br><sub>3806 Southridge Dr, Austin, TX 78704, USA</sub> | pilates | [link](https://www.neighborhood-pilates.co/) | **HUMAN-READABLE** | — | marianatek widget — prices behind JS |
| **Shuffle HQ Dance and Fitness Studio**<br><sub>632 Ralph Ablanedo Dr Ste 200, Austin, TX 78748, USA</sub> | gym-classes | [link](http://austinshufflehq.com/) | **HUMAN-READABLE** | — | arketa widget — prices behind JS |
| **Urban Lagree - SOCO**<br><sub>4409 S Congress Ave, Austin, TX 78745, USA</sub> | pilates | [link](https://urbanlagree.com/) | **HUMAN-READABLE** | — | Mariana Tek widget — prices behind JS |
| **413 FITNESS**<br><sub>2919 Menchaca Rd #210B, Austin, TX 78704, USA</sub> | boxing | [link](https://www.413.fitness/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **7th Wonder**<br><sub>632 Ralph Ablanedo Dr Ste 200, Austin, TX 78748, USA</sub> | boxing | [link](https://www.7thwonder.world/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Alkimi Jiu-Jitsu South Austin - Nicholas Meregali**<br><sub>5700 S MoPac Expy Bldg D, Suite D-405, Austin, TX 78749, USA</sub> | bjj-mma | [link](https://alkimijiujitsu.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Altitude Trampoline Park**<br><sub>6800 West Gate Blvd, Austin, TX 78745, USA</sub> | climbing | [link](https://www.altitudetrampolinepark.com/locations/texas/austin/6800-west-gate-blvd/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **BODYBAR Pilates**<br><sub>3005 S Lamar Blvd Ste b-105a, Austin, TX 78704, USA</sub> | pilates | [link](https://bodybarpilates.com/studios/texas/south-lamar/?utm_source=gbp_location_id=49081) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Balance Dance Studios**<br><sub>4544 S Lamar Blvd #200/#300, Austin, TX 78745, USA</sub> | yoga | [link](http://www.balancedancestudios.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Barton Creek Greenbelt**<br><sub>3755 S Capital of Texas Hwy Apt B, Austin, TX 78704, USA</sub> | climbing | [link](https://austinparks.org/barton-creek-greenbelt/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Breakdance Austin**<br><sub>4201 S Congress Ave, Austin, TX 78704, USA</sub> | gym-classes | [link](http://www.breakaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Circle Fitness & Martial Arts**<br><sub>4930 S Congress Ave #305, Austin, TX 78745, USA</sub> | bjj-mma | [link](https://join.circlemartialarts.us/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Dance Xplosion - DXP1**<br><sub>9600 Escarpment Blvd #750, Austin, TX 78749, USA</sub> | gym-classes | [link](http://www.dancexplosionaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Flow Yoga - Westgate Austin**<br><sub>4477 S Lamar Blvd #420, Austin, TX 78745, USA</sub> | yoga | [link](https://flowyogatx.com/locations/austin/westgate/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Fox House Martial Arts**<br><sub>3601 W William Cannon Dr #225, Austin, TX 78749, USA</sub> | bjj-mma | [link](https://foxhousemartialarts.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Fuse Bungee Fitness- Austin, Tx**<br><sub>4544 S Lamar Blvd Bldg 300, Austin, TX 78745, USA</sub> | gym-classes | [link](https://www.balancedancestudios.com/adult-dnce-class-descriptions/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Gracie Austin Jiu Jitsu**<br><sub>4619 S Congress Ave Ste D, Austin, TX 78745, USA</sub> | bjj-mma | [link](https://austingraciejiujitsu.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Gus Fruh**<br><sub>2642 Barton Hills Dr, Austin, TX 78704, USA</sub> | climbing | [link](http://austintexas.gov/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Headstrong Girls' Boxing**<br><sub>2919 Menchaca Rd #210b, Austin, TX 78704, USA</sub> | boxing | [link](http://www.headstronggirlsboxing.org/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Hello Dancer South Austin**<br><sub>2919 Menchaca Rd Ste 205, Austin, TX 78704, USA</sub> | gym-classes | [link](https://www.hellodanceraustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Holiday Inn Express & Suites Austin South by IHG**<br><sub>701 E Stassney Ln, Austin, TX 78745, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=EX&regionCode=US&hotelCode=AUSAA&cm_mmc=GoogleMaps-_-EX-_-US-_-AUSAA) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **IJJ Austin**<br><sub>1600 W Stassney Ln, Austin, TX 78745, USA</sub> | bjj-mma | [link](http://www.ijjatx.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Impact Martial Arts Austin TX**<br><sub>9501 Menchaca Rd, Austin, TX 78748, USA</sub> | bjj-mma | [link](https://austinkickboxing.com/?utm_source=google_profile&utm_campaign=localo&utm_medium=mainlink) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Inspired Movement - Austin Salsa Classes**<br><sub>4622 S Lamar Blvd, Austin, TX 78745, USA</sub> | gym-classes | [link](https://www.austininspiredmovement.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Julie Pilates Studio**<br><sub>6700 Menchaca Rd Bldg 3, Austin, TX 78745, USA</sub> | yoga | [link](http://www.fuzzystraps.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Martial Arts of Austin**<br><sub>111 Ramble Ln #108, Austin, TX 78745, USA</sub> | bjj-mma | [link](http://www.martialartsofaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Mina Pilates ATX**<br><sub>705 N Bluff Dr, Austin, TX 78745, USA</sub> | pilates | [link](https://minapilatesatx.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Next Gen Hapkido/ Mu Sool**<br><sub>2110 W Slaughter Ln #145, Austin, TX 78748, USA</sub> | bjj-mma | [link](http://www.nextgenmusool.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Nova Uniao Austin**<br><sub>5700 Menchaca Rd #365, Austin, TX 78745, USA</sub> | bjj-mma | [link](https://www.instagram.com/novauniaoatx/?hl=en) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Paragon Jiu-Jitsu Academy Austin**<br><sub>6800 West Gate Blvd Suite 116, Austin, TX 78745, USA</sub> | bjj-mma | [link](http://www.paragonaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Pure Barre**<br><sub>4301 W William Cannon Dr Bldg B, Suite 114, Austin, TX 78749, USA</sub> | gym-classes | [link](https://www.purebarre.com/location/southwest-austin-tx) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Redeeming Dance**<br><sub>4201 S Congress Ave Ste. 303, Austin, TX 78745, USA</sub> | gym-classes | [link](http://redeemingdance.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Simpleman Martial Arts**<br><sub>1701 W Ben White Blvd Unit 163, Austin, TX 78745, USA</sub> | bjj-mma | [link](http://simplemanmartialarts.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **South Austin Gym**<br><sub>5700 Menchaca Rd #365, Austin, TX 78745, USA</sub> | boxing | [link](http://www.southaustingym.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Star Center Gymnastics**<br><sub>3100 W Slaughter Ln, Austin, TX 78748, USA</sub> | gym-weights | [link](http://www.austinstarcenter.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Staybridge Suites Austin South Interstate Hwy 35 by IHG**<br><sub>901 Little Texas Ln Bldg F, Austin, TX 78745, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=SB&regionCode=US&hotelCode=AUSYH&cm_mmc=GoogleMaps-_-SB-_-US-_-AUSYH) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **TruFusion South Austin**<br><sub>4211 S Lamar Blvd Ste B-07, Austin, TX 78704, USA</sub> | yoga | [link](http://www.trufusionsouthaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Tutu School South Austin**<br><sub>5700 Menchaca Rd, Austin, TX 78745, USA</sub> | gym-classes | [link](https://www.tutuschool.com/southaustin) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **barre3**<br><sub>5700 W Slaughter Ln, Austin, TX 78749, USA</sub> | gym-classes | [link](https://online.barre3.com/studio-locations/austin-circle-c) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Light's Out DanceFit**<br><sub>2605 Jones Rd, Austin, TX 78745, USA</sub> | gym-classes | [link](http://angelinacano.zumba.com/) | **GATED** | — | bot challenge (HTTP 403) |
| **MADabolic Austin South**<br><sub>440 E St Elmo Rd E-1, Austin, TX 78745, USA</sub> | boxing | [link](https://madabolic.com/location/austin-south) | **GATED** | — | bot challenge (HTTP 403) |
| **Bee Hive wall**<br><sub>Barton Creek Greenbelt Trail, Austin, TX 78735, USA</sub> | climbing | — | **NO-SITE** | — | no website in Places |
| **Premier Dance Studio**<br><sub>4201 S Congress Ave #108, Austin, TX 78745, USA</sub> | gym-classes | — | **NO-SITE** | — | no website in Places |
| **The Enclave**<br><sub>1781 Spyglass Dr, Austin, TX 78746, USA</sub> | climbing | — | **NO-SITE** | — | no website in Places |

### the-domain — 43 candidate(s)

| Name | Category | Website | Class | Sample prices | Note |
|---|---|---|---|---|---|
| **Austin Gymnastics Club**<br><sub>13776 US-183, Austin, TX 78750, USA</sub> | gym-weights | [link](http://www.austingymnasticsclub.com/) | **SCRAPEABLE** | $10 $140 $170 $20 $75 $85 $95 | prices in fetchable HTML |
| **Barbells & BJJ**<br><sub>12808 Council Bluff Dr, Austin, TX 78727, USA</sub> | bjj-mma | [link](https://jtinoue.com/) | **SCRAPEABLE** | $150 $349 | prices in fetchable HTML |
| **Black Widow MMA**<br><sub>10515 N Mopac Expy Ste H (rear, Austin, TX 78759, USA</sub> | bjj-mma | [link](http://www.blackwidowmma.com/) | **SCRAPEABLE** | $ 250.00 $1000.00 $15.00 $150.00 $175 $175.00 $1850.00 $250 | prices in fetchable HTML |
| **Fighting Fit Kickboxing & Jiu Jitsu**<br><sub>1779 Wells Branch Pkwy #101, Austin, TX 78728, USA</sub> | boxing | [link](https://www.austinkickboxingandjiujitsu.com/) | **SCRAPEABLE** | $ 39 $200 $499 $500 | prices in fetchable HTML |
| **Grounded Performance ATX**<br><sub>12400 Amherst Dr #104, Austin, TX 78727, USA</sub> | crossfit-hiit | [link](https://groundedperformanceatx.com/) | **SCRAPEABLE** | $ 10 $1 $180 | prices in fetchable HTML |
| **JETSET Pilates Austin Arboretum**<br><sub>10000 Research Blvd Ste 124, Austin, TX 78759, USA</sub> | pilates | [link](https://jetsetpilates.com/tx/austin-arboretum/) | **SCRAPEABLE** | $199 $209 | prices in fetchable HTML |
| **OTL Fitness**<br><sub>2111 Kramer Ln #200, Austin, TX 78758, USA</sub> | crossfit-hiit | [link](http://otlfitness.com/) | **SCRAPEABLE** | $195 $20 $235 $275 $30 $79 | prices in fetchable HTML |
| **Pronto Pilates Arboretum**<br><sub>9722 Great Hills Trl, Austin, TX 78759, USA</sub> | pilates | [link](https://www.prontopilates.com/tx/austin/arboretum/) | **SCRAPEABLE** | $25 $5 $50 $99 | prices in fetchable HTML |
| **Shield Brazilian Jiu-Jitsu**<br><sub>2301 Denton Dr Ste G, Austin, TX 78758, USA</sub> | bjj-mma | [link](http://shieldbjj.net/) | **SCRAPEABLE** | $150 $20 | prices in fetchable HTML |
| **Ying Yoga Pilates - Austin**<br><sub>8650 Spicewood Springs Rd #123, Austin, TX 78759, USA</sub> | pilates | [link](https://www.ying.yoga/) | **SCRAPEABLE** | $100 $1030 $108 $136 $138 $150 $180 $189 | prices in fetchable HTML |
| **Dance With Me Austin**<br><sub>11600 Rock Rose Ave #110, Austin, TX 78758, USA</sub> | gym-classes | [link](https://dancewithmeusa.com/studio/austin-tx-dance-studio/?utm_source=google&utm_medium=organic&utm_campaign=gbp-listing) | **HUMAN-READABLE** | $49 | momence widget — prices behind JS |
| **FS8 Domain Austin**<br><sub>11101 Burnet Rd Ste 190, Austin, TX 78758, USA</sub> | pilates | [link](https://fs8.com/studio/domainaustin/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **Inner Diva Studios**<br><sub>10401 Anderson Mill Rd #104, Austin, TX 78750, USA</sub> | gym-classes | [link](https://innerdivastudios.com/) | **HUMAN-READABLE** | $10 | mindbody widget — prices behind JS |
| **MACA Martial Arts**<br><sub>14611 Burnet Rd Ste. 107, Austin, TX 78728, USA</sub> | bjj-mma | [link](https://www.macamartialarts.com/) | **HUMAN-READABLE** | — | zenplanner widget — prices behind JS |
| **North Austin Strong**<br><sub>13800 Quitman Pass, Austin, TX 78728, USA</sub> | crossfit-hiit | [link](http://www.northaustinstrong.com/) | **HUMAN-READABLE** | $10 | pushpress widget — prices behind JS |
| **Persona Pilates**<br><sub>10721 Research Blvd Ste b-140, Austin, TX 78759, USA</sub> | pilates | [link](https://www.personapilates.com/ats) | **HUMAN-READABLE** | $10 | marianatek widget — prices behind JS |
| **Pure Pilates Austin**<br><sub>11011 Domain Dr #115, Austin, TX 78758, USA</sub> | gym-weights | [link](http://www.purepilatesaustin.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **TITLE Boxing Club Austin North**<br><sub>13945 US-183 Ste C-3, Austin, TX 78717, USA</sub> | boxing | [link](https://titleboxingclub.com/austin-north-tx/) | **HUMAN-READABLE** | — | clubready widget — prices behind JS |
| **UpReach CrossFit** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>13047 Pond Springs Rd, Austin, TX 78729, USA</sub> | crossfit-hiit | [link](https://upreachcrossfit.com/) | **HUMAN-READABLE** | — | zenplanner widget — prices behind JS |
| **We Rock The Spectrum - North Austin**<br><sub>6001 W Parmer Ln #430, Austin, TX 78727, USA</sub> | climbing | [link](https://werockthespectrumnorthaustin.com/) | **HUMAN-READABLE** | — | mindbody widget — prices behind JS |
| **Yoga Pod Austin**<br><sub>9333 Research Blvd C-200, Austin, TX 78759, USA</sub> | yoga | [link](http://yogapodaustin.com/) | **HUMAN-READABLE** | $40 | mindbody widget — prices behind JS |
| **Ambush Muay Thai**<br><sub>13581 Pond Springs Rd #315, Austin, TX 78729, USA</sub> | bjj-mma | [link](https://www.ambushmuaythai.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Brazilian Top Team Austin**<br><sub>9313 Anderson Mill Rd, Austin, TX 78729, USA</sub> | bjj-mma | [link](https://www.bttsa.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Claunch Academy of Brazilian Jiu-Jitsu**<br><sub>9514 Anderson Mill Rd, Austin, TX 78729, USA</sub> | bjj-mma | [link](https://www.claunchacademyofbjj.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Dancers Workshop**<br><sub>11150 Research Blvd #107, Austin, TX 78759, USA</sub> | gym-classes | [link](http://www.dancersworkshopaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **EVEN Hotel Austin Uptown Near the Domain by IHG**<br><sub>13205 Burnet Rd Building # 2, Austin, TX 78727, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=VN&regionCode=US&hotelCode=AUSEV&cm_mmc=GoogleMaps-_-VN-_-US-_-AUSEV) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Fight Factory Jiu-jitsu**<br><sub>9607 Research Blvd #675, Austin, TX 78759, USA</sub> | bjj-mma | [link](https://lp.fightfactoryjiujitsu.com/?utm_source=google&utm_medium=my-business) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Fitness Connection**<br><sub>13776 US-183, Austin, TX 78750, USA</sub> | gym-weights | [link](https://fitnessconnection.com/gyms/lake-creek/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Gracie Jiu-Jitsu North Austin**<br><sub>13945 US-183 Unit D130, Austin, TX 78717, USA</sub> | bjj-mma | [link](https://www.gracienorthaustin.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Holiday Inn Express & Suites Austin NW - Arboretum Area by IHG**<br><sub>10711 Research Blvd, Austin, TX 78759, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=EX&regionCode=US&hotelCode=AUSAU&cm_mmc=GoogleMaps-_-EX-_-US-_-AUSAU) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Holiday Inn Express & Suites Austin NW - Lakeline by IHG**<br><sub>10911 Pecan Park Blvd, Austin, TX 78750, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=EX&regionCode=US&hotelCode=AUSTX&cm_mmc=GoogleMaps-_-EX-_-US-_-AUSTX) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Invictus Martial Arts**<br><sub>9800 N Lake Creek Pkwy Ste 140, Austin, TX 78717, USA</sub> | bjj-mma | [link](http://go.invictusatx.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Main Event Austin**<br><sub>13301 N Hwy 183, Austin, TX 78750, USA</sub> | climbing | [link](http://www.mainevent.com/locations/texas/austin) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Mario Esfiha Brazilian Jiu Jitsu Austin - Brasa Team**<br><sub>1921 Cedar Bend Dr Unit 146, Austin, TX 78758, USA</sub> | bjj-mma | [link](http://www.mebjj.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Pure Barre**<br><sub>11410 Century Oaks Terrace Ste 146, Austin, TX 78758, USA</sub> | gym-classes | [link](https://www.purebarre.com/location/austin-domain-tx) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **RDA ACADEMY**<br><sub>6001 W Parmer Ln #230, Austin, TX 78727, USA</sub> | bjj-mma | [link](https://www.rdaacademyatx.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Staybridge Suites Austin North - Parmer Lane by IHG**<br><sub>13000 N Interstate Hwy 35 Bldg 9, Austin, TX 78753, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=SB&regionCode=US&hotelCode=AUSST&cm_mmc=GoogleMaps-_-SB-_-US-_-AUSST) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Staybridge Suites Austin Northwest by IHG**<br><sub>13087 N Hwy 183, Austin, TX 78750, USA</sub> | gym-weights | [link](https://www.ihg.com/redirect?path=hd&localeCode=en&brandCode=SB&regionCode=US&hotelCode=AUSHC&cm_mmc=GoogleMaps-_-SB-_-US-_-AUSHC) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **TFI Jiu Jitsu Cedar Park**<br><sub>13642 N Hwy 183 Ste 300, Austin, TX 78750, USA</sub> | bjj-mma | [link](https://tfiexperience.com/cedar-park/?utm_source=gmb&utm_medium=organic&utm_campaign=cedar-park-tx) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **The Domain** ⚠︎<br><sub>possibly already listed as *Equinox Domain*</sub><br><sub>11410 Century Oaks Terrace, Austin, TX 78758, USA</sub> | climbing | [link](https://www.simon.com/mall/the-domain) | **NO-PUBLISHED-PRICE** | — | site readable; no price on 10 path(s) tried |
| **Unity Combat Club - 24/7 Boxing and Muay Thai Sports Facility**<br><sub>1921 Cedar Bend Dr, Austin, TX 78758, USA</sub> | boxing | [link](http://www.unitycombatclub.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Voodoo CrossFit 512** ⚠︎<br><sub>possibly already listed as *CrossFit Austin*</sub><br><sub>9313 Anderson Mill Rd Ste 100, Austin, TX 78729, USA</sub> | crossfit-hiit | [link](http://www.voodoocrossfit512.com/) | **NO-PUBLISHED-PRICE** | — | site readable; no price on (10 tried) |
| **Activate Games**<br><sub>3220 Feathergrass Ct, Austin, TX 78758, USA</sub> | climbing | [link](https://playactivate.com/domain?utm_source=google&utm_medium=organic&utm_campaign=gmb-domain) | **GATED** | — | bot challenge (HTTP 403) |

## Set aside

Recorded rather than dropped, so the call can be overruled.

| Name | Why |
|---|---|
| Atos Austin Brazilian Jiu Jitsu | outside every region circle |
| Austin Submission Fighting | outside every region circle |
| Breakthrough Fitness ATX | outside every region circle |
| Cooper MMA | outside every region circle |
| Corazon Latino Dance Studio South | outside every region circle |
| CrossFit SoChac | outside every region circle |
| Crux Climbing Center Pflugerville | outside every region circle |
| Dance Institute | outside every region circle |
| Dead Game Boxing Gym | outside every region circle |
| Forty Five Boxing | outside every region circle |
| Gracie Barra Westlake Hills | outside every region circle |
| Gracie Jiu-Jitsu Southwest Austin | outside every region circle |
| Iron Mantis Martial Arts - Austin | outside every region circle |
| Jazzercise Austin Studio (ATX) | outside every region circle |
| John's Gym Mixed Martial Arts and Jiu Jitsu | outside every region circle |
| Kings MMA Austin | outside every region circle |
| MAX BOXING GYM | outside every region circle |
| MBA Boxing Gym | outside every region circle |
| Mt Playmore | outside every region circle |
| Northwest Recreation Center | out of v1 scope |
| Northwest YMCA of Austin | out of v1 scope |
| Patriot Sports and Fitness Austin | outside every region circle |
| Physical Therapy - East Austin Jiujitsu Parlor | out of v1 scope |
| Powerhouse Martial Arts & Fitness of North Austin | outside every region circle |
| Reynoso's Boxing Gym | outside every region circle |
| Round Rock Tournament | outside every region circle |
| Shadow Work Boxing | outside every region circle |
| Vasquez Academy | outside every region circle |
| austin ascents | outside every region circle |
