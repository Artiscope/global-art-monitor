# Agent log

A record of what the website agent did on each run, newest first.

## Friday 27 November 2026 (clearer colours)
Published: nothing.
Drafts waiting: clearer colours for hammer price, price with premium, estimate and check status, and a lilac diamond for the second artist in comparisons (draft/2026-11-27-clearer-colours).
Checked: results table, legend, artist charts, comparison and the estimate, hammer and total bars at desktop and phone widths.
Needs you: your yes on the draft.

## Friday 27 November 2026 (price game)
Published: nothing.
Drafts waiting: Guess the hammer price, a daily game at guess-the-price/, linked from the full menu, the home page and the price explorer (draft/2026-11-27-guess-the-hammer-price).
Checked: the game uses only sales already on the site with a known hammer price, checked on the house page or in the press or a sales database. No figure was added or changed.
Needs you: your yes on the draft.

## Friday 27 November 2026 (filter panel)
Published: nothing.
Drafts waiting: the results filter panel lined up on a neat grid, so no label is cut off (draft/2026-11-27-filter-layout).
Checked: the panel at desktop, tablet and phone widths.
Needs you: your yes on the draft.

## Friday 27 November 2026
Published: nothing.
Drafts waiting: Price explorer, sortable results table and price charts, https://github.com/Artiscope/global-art-monitor/pull/39
Checked: built only on the sales already in data/sales.json. No new figures.
Needs you: look at the draft and the screenshots in the project's engagement folder.









## Thursday 26 November 2026, contact form saves messages (draft)
Published: nothing. The owner asked for an enquiry form on every site, stored in Supabase. The form on the Contact page now sends the message straight to us instead of opening the visitor's email app. Messages are saved to the enquiries table in the Artiscope Digital Home project on Supabase, which visitors can add to but never read. A hidden box catches spam robots. The privacy wording says where messages are kept and how to have them deleted.
Checked: the site builds; the form shows its sending, thank you and error messages; the layout holds at 390 pixels and desktop width.
Needs you: a yes on the pull request.

## Thursday 26 November 2026, gallery activity piece (draft)
Published: nothing. The owner's new brief asks Global Art Monitor to cover gallery activity and collector intelligence, which it did not. New research piece, Gallery Activity in 2025: What Dealers Sold, and Who Bought, built on Art Basel's published summaries of the Art Basel and UBS report.
Checked: the site builds, the new page holds at 390 pixels and desktop width.
Needs you: a yes on the pull request.

## Wednesday 25 November 2026, missing figures checked on MutualArt
Published: nothing yet.
Drafts waiting: "Fill missing figures from MutualArt" (https://github.com/Artiscope/global-art-monitor/pull/22). Adds eight figures the house pages did not give: four pairs of estimates (Zara Muse, Malala Yousafzai; OSGEMEOS, Untitled at Bonhams 2024; Vhils, Attrition series #01; Picasso, Tête de femme (Dora Maar), plus its lot number 23A) and four sale prices (El Anatsui, Hesitant Rivers; Warhol, The Scream (After Munch), Flowers and Dolly Parton). Each is labelled "From MutualArt" with a link. MutualArt does not say whether its sale prices include the buyer's premium, so the four prices say "premium not stated".
Checked: all 60 sales with a gap, using the owner's MutualArt account. 53 were found. In every one the price and estimate MutualArt gives match the figures already on the site. MutualArt never states a hammer price for these lots, so the 52 missing hammer prices stay "To confirm".
Needs you: your yes on the draft.

## Wednesday 25 November 2026, notice says the site does not sell
Published: on the owner's instruction, the footer notice now opens "Global Art Monitor does not sell art" and says what the site does. It keeps one line telling readers that a gallery elsewhere in the Artiscope group sells work by some of the artists covered. The notes on the Zara Muse and Konn Artiss pages and one research piece match.
Drafts waiting: none from this change.
Checked: all pages rebuild, links and markup pass.
Needs you: nothing.

## Wednesday 25 November 2026, corrected who sells the work
Published: the owner pointed out that Artiscope itself does not sell work. The footer notice, artist notes and source labels now say a gallery in the Artiscope group shows and sells work by artists covered here. The gallery is not named, on the owner's instruction. The notice to readers stays.
Drafts waiting: none from this change.
Checked: all pages rebuild, links and markup pass. No facts, figures or sources were removed.
Needs you: nothing new. Source links to the gallery's own pages remain, as noted in the entry below.

## Wednesday 25 November 2026, publisher named as Artiscope only
Published: on the owner's instruction in a conversation, the site no longer names Grove Gallery. The footer notice, the artist notes, the Artist Market Profiles page and source labels now say Artiscope. The notice still tells readers that the publisher sells work by artists covered here.
Drafts waiting: none from this change.
Checked: all pages rebuild, links and markup pass. No facts, figures or sources were removed.
Needs you: five source links still lead to grovegallery.com or to an Artsy page with the gallery name in its address, because that is where the facts come from. Say if you want different sources.

## Wednesday 25 November 2026, shorter footer
Published: on the owner's instruction in a conversation, the footer's Artists column shows six artists, the ones with the most recent priced sale, followed by an "All artists" link to the Artist Market Profiles page. It had grown to 33 links on every page. The number is the footer setting `artists_limit` (default 6). New artists no longer lengthen the footer.
Drafts waiting: none from this change.
Checked: all pages rebuild, links and markup pass, footer holds at phone and desktop width.
Needs you: nothing.

## Wednesday 25 November 2026, artists in alphabetical order
Published: on the owner's instruction in a conversation, the artist cards on the Artist Market Profiles page and the artist list in the footer are now in alphabetical order by the name as written. The sorting is automatic, so a new artist lands in the right place and nothing needs arranging by hand. The homepage's three cards still follow the most recent priced sale.
Drafts waiting: none from this change.
Checked: all pages rebuild, links and markup pass, and the order reads A to Z on the profiles page, the footer and the results filter menu.
Needs you: nothing.

## Wednesday 25 November 2026, new filter on Auction Results
Published: on the owner's instruction in a conversation, the rows of artist and house buttons above the results table are replaced by one search box and three menus (artist, auction house, currency). A line shows how many lots are showing, with a "Clear filters" link. The filter now stays one row on desktop however many artists are added, so nothing needs changing there when an artist joins the site.
Drafts waiting: none from this change.
Checked: menus, search, clear and the lot count at desktop, tablet and phone width. All pages rebuild, links and markup pass.
Needs you: nothing.

## Wednesday 25 November 2026, results table was not showing
Published: a fix for a fault the owner reported. On the Auction Results page everything under the heading was invisible. The page fades each block in once enough of it is on screen, and the results panel had grown so tall (94 lots) that the required share could never fit on a screen, so it never appeared. Blocks now appear as soon as any part of them comes into view. The change is one line in `assets/site.js`.
Drafts waiting: none from this change.
Checked: scrolled through eleven pages at desktop and phone width with motion on. Nothing stays hidden.
Needs you: nothing.

## Wednesday 25 November 2026, shorter homepage
Published: on the owner's instruction in a conversation, the homepage no longer lists everything. Research and features shows the first four pieces, with a "See all research pieces" link. Artist market profiles shows the three artists with the most recent priced sale, picked automatically, with a "See all artists" link. The full lists stay on the Research Reports and Artist Market Profiles pages. The settings are on the homepage's two sections in `data/pages.json`: `limit` on both, and `pick: recent` on the profiles. New artists and articles no longer lengthen the homepage, so do not add them to it by hand.
Drafts waiting: none from this change.
Checked: all pages rebuild, links and markup pass, phone and desktop widths hold.
Needs you: nothing.

## Wednesday 25 November 2026, Andy Warhol (draft)
Published: nothing. Andy Warhol added as a draft after the owner asked for him on all five sites.
Drafts waiting: Andy Warhol market profile with five unique works sold 16 to 19 November 2026, a row in "What makes an artist's work valued", and a public domain portrait (White House photograph, 1977). Branch draft/2026-11-25-andy-warhol.
Checked: Sotheby's lot pages (lots, sizes, estimates; results hidden), Christie's results listing, Phillips lot 21, The Art Newspaper, Artdaily, Luxury.it, MyArtBroker.
Needs you: three Sotheby's totals stay "To confirm" because Sotheby's hides results; The Scream's reported hammer does not match its reported total.

## Wednesday 25 November 2026
Published: "Fuller artist profiles", on the owner's go ahead. Made on the owner's request to write more about every artist. Nineteen market profiles gain Life and career, Key works and what reaches auction, In the artist's words, Reading the prices, and a Compare with box linking related profiles. New sources are added to each profile's Background sources. Sales tables, verified flags and existing text are unchanged. Konn Artiss is unchanged, and Zara Muse gets only a quote and Compare with links, because her profile depends on facts from Grove Gallery.
Checked: every new fact and quote against its linked page; the site builds; profiles hold at 390 and 1280 pixels; no long dashes; CNAME unchanged.
Needs you: approval to publish.

## Wednesday 25 November 2026
Published: nothing yet.
Drafts waiting: five new artist market profiles (Rene Matić, Raven Halfmoon, Ana Segovia, Dana Awartani, Jes Fan), with two Phillips results for Raven Halfmoon and new rows in "What makes an artist's work valued". Pull request link to follow.
Checked: Phillips, Sotheby's and Christie's lot pages for all five artists. Only the two Halfmoon results could be confirmed with a price on the house's own page.
Needs you: profile photos for the five artists and the two Halfmoon works (spots added to image-slots.json).

## Wednesday 25 November 2026, latest result card fix (draft)
Published: nothing. Prepared as a draft after the owner asked to fix the homepage "Latest documented result" card.
Drafts waiting: Fix the latest result card, https://github.com/Artiscope/global-art-monitor/pull/16
Checked: the title was clipped because the artwork cards added earlier today shared its style name. Renamed them. The card and the "latest result" band now say "Our calculation" when the price is worked out. Homepage, results and artist pages checked at 1280 and 390 pixels.
Needs you: nothing.

## Wednesday 25 November 2026, artwork photos and links (draft)
Published: nothing. Prepared as a draft on the owner's request for artwork photos in the results table, each leading to the full details on the artist's profile.
Drafts waiting: Artwork photos and links in the results tables, https://github.com/Artiscope/global-art-monitor/pull/15
Checked: tables and artist pages at 1280 and 390 pixels. Wikimedia Commons could not be reached from this run, so no photos were added yet.
Needs you: photos of the works. 53 artwork spots are now listed in Digital Home under "Artwork photos". Most of these works are still in copyright, so photos need to come from you or with the rights holder's permission.

## Wednesday 25 November 2026, currency column back (draft)
Published: nothing. Prepared as a draft after the owner said the Currency column is important.
Drafts waiting: Bring back the Currency column on the results tables, https://github.com/Artiscope/global-art-monitor/pull/14
Checked: the results tables on the auction results, artist, homepage and research pages fit at 1280 and 390 pixels with nothing cut off.
Needs you: nothing.

## Wednesday 25 November 2026, results table layout (draft)
Published: nothing. Prepared as a draft on the owner's request in a conversation ("fix this properly") about the auction results table.
Drafts waiting: Make the auction results table fit on every screen, https://github.com/Artiscope/global-art-monitor/pull/13
Checked: the table on the auction results, artist and research pages at 1280 and 390 pixels. Found the estimate for Christie's 1991 Richter (US$7m to 10m) in a pre-sale listing. The Van Gogh and Seoul Kusama estimates were given only on request, so they now say so.
Needs you: the "How we report a price" text on the About page is edited in Digital Home, so it still explains only the worked back hammer price.

## Wednesday 25 November 2026, prices to confirm (draft)
Published: nothing. Prepared as a draft on the owner's request in a conversation to research every price left "To confirm".
Drafts waiting: Confirm prices that were marked to confirm, https://github.com/Artiscope/global-art-monitor/pull/12
Checked: Christie's lot pages (read in the browser on the owner's computer), Phillips, Bonhams, Tate Ward, Strauss, Saffronart and AstaGuru lot pages, Sotheby's and Christie's premium rates, and press reports. 24 sales updated and the Das bunte Leben high estimate corrected to £25 million. "To confirm" cells on the Auction results page fall from 61 to 29.
Needs you: Hesitant Rivers is still unknown. Hammer prices at Phillips, Saffronart, AstaGuru and Strauss can't be worked back, because the rate that applied isn't published. The lot pages for Christie's 1991 Richter (New York) and Das bunte Leben weren't found.

## Monday 23 November 2026, autumn 2026 top lots
Published: a report on the November 2026 New York evening sales (sale totals, the twelve top prices, why they sold, and the autumn sales in London and Hong Kong), new market profiles for Vincent van Gogh and Wassily Kandinsky, and two October London results for Gerhard Richter. Artists page, homepage profiles, auction results page and the "why work is valued" guide updated to fifteen artists. Published on the owner's instruction in a conversation ("once everything is done. merge and publish").
Drafts waiting: none from this change.
Checked: Phillips lot pages and sale pages in New York and London give exact prices. Sotheby's hides results unless signed in and Christie's lot pages refused automated visits, so those prices rest on The Art Newspaper, Artsy, Art Insider, Artdaily and others, and rounded figures stay "To confirm" in the tables. Pages build and hold at 390 and 1280 pixels.
Needs you: exact Christie's and Sotheby's figures if you can read them while signed in. Image spots added for the two new profiles.

## Monday 23 November 2026, images for the new street artists (draft)
Published: nothing. Prepared as a draft on the owner's request in a conversation to add images for the five new street artists.
Drafts waiting: profile images for Vhils, OSGEMEOS and Faith XLVII (link in the pull request list).
Checked: each licence on the photo's own Wikimedia Commons page. Credits sit in the captions. The pages build and hold at phone and desktop width.
Needs you: these photos come from the web, not the inbox, and each shows the artist's work, so they wait for your yes. Nothing usable was found for KAWS or Eko Nugroho.

## Monday 23 November 2026, auction guides and why each artist is valued (draft)
Published: nothing. Prepared as a draft on the owner's request in a conversation to research more and update every section.
Drafts waiting: six new guides (how an auction works, the buyer's premium with 2026 rates, guarantees and catalogue symbols, unique works and editions, provenance and authentication, what makes an artist's work valued), a "Why the work is valued" section on all thirteen profiles, 17 new glossary terms, and hammer prices worked back for 11 Christie's lots (link in the pull request list).
Checked: buyer's premium schedules at Christie's, Phillips and (through The Art Newspaper and the Antiques Trade Gazette) Sotheby's; UK resale right on GOV.UK and the 2006 regulations; Phillips' guide for buyers; Tate and IFPDA print terms; Pest Control's terms; museum and prize pages for every artist. Every worked-back hammer price came out as a whole bidding step. Christie's English help pages and the Richter catalogue site refused automated visits.
Needs you: a yes or no on the draft. Zara Muse and Konn Artiss have no museum show or collection in the sources read, and their profiles say so plainly next to the disclosure.

## Monday 23 November 2026, artist images (draft)
Published: nothing. Prepared as a draft on the owner's request in a conversation to add images to the sites.
Drafts waiting: pictures on the profiles of Banksy, Yayoi Kusama, El Anatsui, S.H. Raza and Gerhard Richter (link in the pull request list).
Checked: every picture comes from Wikimedia Commons under a licence that allows reuse, read on the file's own page, and each caption names the photographer and licence. Portraits for Kusama, Raza and Richter. Banksy: his 2026 statue in Waterloo Place, London. El Anatsui: no free portrait exists, so a public sculpture from his design at the University of Nigeria, Nsukka. Pages build and hold at phone and desktop width.
Needs you: this site's brief says images come only from the inbox, so these wait for your yes. No usable picture was found for Beatriz Milhazes; her profile stays without one.

## Monday 23 November 2026, five street artists
Published: five street artists and their auction results, on the owner's yes ("publish now"). Merged with the eight-artist profiles change, and the five new artists added to the Artists page lists.
Drafts waiting: none.
Checked: every price on the auction house's own lot page (Christie's, Phillips, Bonhams, Artcurial, Strauss & Co). Sotheby's results need a sign-in and are listed as not priced. Unique works go in the tables; prints are named in the text. Also fixed in the draft: the price bars could run off the screen when a work sold below its estimate, because the scale ignored the estimate. The scale now includes it.
Needs you: photos for the five new artists (spots added).

## Monday 23 November 2026, all eight artist profiles (draft)
Published: nothing. Prepared as a draft on the owner's instruction in a conversation.
Drafts waiting: All eight artist profiles on the Artists page, with two prices filled from Christie's https://github.com/Artiscope/global-art-monitor/pull/7.
Checked: every artist profile page. The Artists page listed only Zara Muse and Konn Artiss, so the other six profiles could not be reached from it. Christie's lot pages for Richter's Kerze (Candle) and Kusama's INFINITY-NETS (OOAXT) gave lot numbers, estimates and prices with premium. Hammer prices are still not published, so they stay "To confirm".
Needs you: a yes or no on the draft, and photos for the six artists without a profile image (spots added).

## Monday 23 November 2026, five international artists (draft)
Published: nothing. Prepared as a draft on the owner's instruction in a conversation.
Drafts waiting: Five international artists with their auction results https://github.com/Artiscope/global-art-monitor/pull/4.
Checked: lot pages at Saffronart, AstaGuru, Phillips and Sotheby's, and press reports from The Art Newspaper, HENI News, TheValue, Artdaily and ArtDependence. Sotheby's and Christie's results need a sign-in, so several prices rest on press reports and rounded figures stay "To confirm".
Needs you: a yes or no on the draft.

## Monday 23 November 2026, prices fit and stay in their own currency
Published: on the owner's instruction in a conversation. (1) The price on the homepage "Latest documented result" card now shrinks to fit on one line inside the card. (2) Every price shows the currency of its sale, including in the table cells. (3) Prices in different currencies are no longer ranked or charted against each other: the bar comparison uses one scale per currency, and "Highest documented price" gives the highest in each currency. A sale with no currency set shows "currency to confirm" in place of assuming pounds. One line was added to the brief (CLAUDE.md) under the auction data rules to record this.
Drafts waiting: none from this change.
Checked: all pages rebuild, links and markup pass, the card fits at 360, 390, 1024 and 1440 pixels with short and long prices. All 13 sales already carry the currency of their saleroom.
Needs you: nothing.

## Friday 20 November 2026, Christie's prices added
Published: the two Christie's rows in the Zara Muse timeline now show the price with premium, on the owner's instruction in a conversation: Ava GBP 44,450 and Unspoken GBP 30,720. The owner supplied both from Christie's sold lots page, where they are labelled "Price Realised". Hammer price stays "To confirm" for both, as the owner chose, because Christie's does not publish it and the premium rate for each sale is not confirmed. Three articles were brought up to date to match (the Zara Muse timeline, the record sale piece and the liquidity piece).
Drafts waiting: none.
Checked: all pages rebuild, links and markup pass, phone and desktop widths hold. The homepage "Latest documented result" is now Unspoken. Highest documented price is unchanged at GBP 51,200.
Needs you: the address of each lot's own page on Christie's, if you would like the table to link to those in place of the search page.

## Thursday 19 November 2026
Published: nothing on the site. This log entry and one topic idea in the content calendar.
Drafts waiting: none.
Checked: the site rebuilds with no changes and the live homepage loads with all six Zara Muse rows. No long dashes or US spellings. No photos in the inbox. Read Tate Ward, Roseberys and FAD Magazine and searched for Christie's results: no sold prices found for Ava or Unspoken, so both stay "To confirm". Invaluable and MutualArt refused automated visits today. Monday's run was missed, so the first topic idea is added today: Zara Muse prints at auction.
Needs you: (1) A yes or no on the prints idea in the content calendar. (2) Roseberys offers Kerry and Vivienne and Calliope on Tuesday 24 November. I will draft the results once they are published. (3) The article "How to Compare Primary Gallery Prices with Auction Results" opens with the word "bargain", which is on the voice guide's never-use list. Tell me to draft a rewording. (4) Roseberys gives Zara Muse's birth year as 1972. The site says 1971, as Bonhams and Tate Ward do. No change made. (5) Still open: the Gilded Promise row has no sale date or lot page.

## Monday 16 November 2026, new header bar
Published: the header on every page is now a rounded charcoal bar that stays in view while scrolling, at the owner's request in a conversation. Larger logo, a lighter pill on the current page, Contact added to the bar, mint Subscribe button. Two labels are shortened in the bar only ("Artist Profiles", "Research"). The pages keep their full names.
Drafts waiting: none.
Checked: all pages rebuild, links and markup pass, and the bar fits from 360 pixels to desktop width.
Needs you: nothing.

## Wednesday 11 November 2026, second photo placed
Published: the Konn Artiss picture sent from Artiscope Digital Home is now on his artist profile page (artists/konn-artiss). Resized to 2000 pixels on the longest side, nothing cropped.
Drafts waiting: none.
Checked: the profile page rebuilds cleanly, the picture shows at phone and desktop width, and no other page changed.
Needs you: nothing. The photo came without a description, so I wrote one from what the picture shows. Tell Claude the work's title if you want it named.

## Wednesday 11 November 2026, photo placed
Published: the Zara Muse painting sent from Artiscope Digital Home is now on her artist profile page (artists/zara-muse). Resized to 2000 pixels on the longest side.
Drafts waiting: none.
Checked: the profile page rebuilds cleanly and no other page changed.
Needs you: nothing. The picture's description on the page reads "Work by Zara Muse". Tell Claude the painting's title if you want it named.

## Wednesday 11 November 2026, after your merge
Published: the Christie's details for Ava (lot 429, 2 July 2026) and Unspoken (lot 1075, 21 October 2026), both estimated at GBP 6,000 to 8,000. You merged the draft at 15:39. Sold prices stay "To confirm". https://github.com/Artiscope/global-art-monitor/pull/1
Drafts waiting: none.
Checked: the publishing run finished without errors. The Zara Muse artist page shows the new rows on the live site. The Auction results page still showed the old rows a few minutes later, which is normally a stored copy catching up.
Needs you: nothing new. Points 1 to 3 below still stand.

## Wednesday 11 November 2026, first weekday run
Published: nothing on the site. This log entry only.
Drafts waiting: Fill in the two Christie's lots: sale date, lot numbers and estimates for Ava and Unspoken. https://github.com/Artiscope/global-art-monitor/pull/1
Checked: every page loads at phone and desktop width, and a fresh build matches what is live. No long dashes, US spellings or dividing lines found. Source links opened: all work except the two Bonhams lot pages, which refuse automated visits and could not be checked. Read Invaluable, MutualArt, Tate Ward and Grove Gallery for news. No photos in the inbox. Content calendar: no answers to act on, new ideas come Monday.
Needs you: (1) Invaluable lists two Zara Muse paintings coming up at Roseberys on 24 November, Kerry (2025) and Vivienne and Calliope (2024), each estimated at GBP 8,000 to 12,000. The site has no place for lots not yet sold, so nothing is added. I will draft the results after the sale. (2) The databases also list earlier lots the site does not show: Angelique at Tate Ward (19 June 2024), two lots at Tate Ward on 19 March 2025 (Stillness Within and Timeless Mystique), Naomi at Roseberys (10 December 2025) and a print of In Her Own Light at Roseberys (1 July 2026). Tell me if you want these drafted, or if prints and smaller works are left out on purpose. (3) The Konn Artiss row for Gilded Promise has no sale date and only the Tate Ward homepage as its source. A lot page or the figures from you would settle it.

## Wednesday 11 November 2026
Also added: the voice guide (`VOICE.md`) and the content calendar (`CONTENT-CALENDAR.md`). First topic ideas arrive Monday 16 November.
Published: the agent's instructions (`CLAUDE.md`), this log and the `inbox/` folder for photos. Nothing on the site itself changed.
Drafts waiting: none.
Checked: nothing yet. The first weekday run does the first full check.
Needs you: photos, when you have them. Upload them to the `inbox/` folder.

## Thursday 26 November 2026
Drafts waiting: new colour palette, chosen by the owner (https://github.com/Artiscope/global-art-monitor/pull/34).
Checked: build, homepage and inner pages at desktop and phone widths, text contrast (WCAG AA).
