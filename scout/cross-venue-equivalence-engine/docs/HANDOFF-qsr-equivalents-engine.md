# [ qsr equivalents engine ] — Handoff & Description
Origin: BLUE phone, Termux, `~/cross-venue-equivalence-engine/`. July 2026.
Live: https://equivalence-engine.vercel.app
Creator seal: Mohave Technology Group (embedded in the page footer and head metadata).
This document is written so a Claude instance on ANY phone (Green, Orange, Red) can pick the project up cold, or lift pieces of it into a different app.

## What the product is
A tool that answers: given any documented fast-food item — official or secret-menu — how closely could every other restaurant recreate it using only that restaurant's own official ingredients? Displayed name in the UI is exactly `[ qsr equivalents engine ]`, square brackets included. The internal/project directory name remains `cross-venue-equivalence-engine` — do not rename either, and do not apply either name to any other project.

Three user-facing layers: browse venues (menu items + secret items + tagged ingredient inventory), the differential view for any item (every candidate venue ranked by recreation score with a per-ingredient "match ladder" breakdown), and "makeable here" per venue (items documented elsewhere that this venue's inventory scores ≥60% but which it doesn't itself list — the opportunity-discovery view, e.g. spotting that a venue stocks pie + soft serve but has no pie-blend dessert documented).

## The complete file set
All in `~/cross-venue-equivalence-engine/` on the Blue phone.

`scraped_items.json` — 273 secret-menu items scraped from hackthemenu.com (scraper lives separately in `~/htm_scrape/`; its H1-parsing quirk: item name and "X Secret Menu" label are two spans split by an hr, parsed via `h1.find_all("span")`). Each record: `url`, `item_name`, `category_label` (format "`<Venue> Secret Menu`" — strip that suffix to get the venue), `paragraphs` (free-text description; note every page ends with the same boilerplate sentence about following instructions, ignore it in any text mining). Covers 20 venues. Every page also carries this shared footer boilerplate — filter it before frequency analysis.

`ingredient_taxonomy.json` — dict of 292 ingredient names → `{category, subcategory}`. The original 222 came from RESTOSTOCK; 70 drink/dessert terms were added in July 2026, introducing categories `Dairy/Frozen`, `Fruit`, `Juice`, `Syrup/Flavoring`, `Coffee/Tea` on top of the original 13 (Bun/Bread, the Protein/* family, Cheese, Sauce/Condiment, Produce, Side). This file is the master vocabulary: extraction can only find terms that exist here.

`venues_tagged.json` — array of 14 venue objects from RESTOSTOCK: `{id, name, short, inventory:[{name,category,subcategory}], recipes:[{name, ingredients:[{name,category,subcategory}]}]}`. 125 official recipes total. These 14 are the only scoreable candidate venues.

`scan_secret_menu.py` — plural-tolerant extraction. Normalizes text (lowercase, strip punctuation, per-word singularize: -ies→y, -es after s/x/z/h, trailing -s), matches taxonomy phrases longest-first with word boundaries, blanks matched spans so substrings can't double-match. Writes `extracted_components.json` (list parallel to scraped_items order; each entry = list of canonical taxonomy names). Current confirmed run: 234/273 items matched, 777 component matches.

`score_engine.py` — the canonical scorer (user-built, predates the front end). Weights: exact name 1.0, same subcategory 0.85, same category 0.4, no match 0.0; item score = mean over its ingredients. Confirmed test: Wendy's Dave's Single at McDonald's = 91.7% (only gap: bun tier). Any port of scoring MUST match these weights.

`cross-venue-engine.html` — the entire front end, 530 lines, fully commented. Single file: CSS + JS + full dataset embedded as `const EMBEDDED` (one ~262 KB JSON line: `{venues:[venues_tagged format], secret_items:[{name, venue, components:[{name,category,subcategory}], description (trimmed ≤280 chars)}]}`). The JS scorer mirrors score_engine.py exactly. Adapter functions tolerate raw pipeline key names, so the UI can be re-pointed at the raw JSON files if embedding is ever dropped.

`deploy/` — contains `index.html` (a copy of cross-venue-engine.html) and the Vercel project link. Redeploy = overwrite index.html, `vercel --prod` from inside `deploy/`.

## Current coverage state (memorize these numbers)
20 venues scraped; 14 venues have inventories; only 8 overlap (Burger King, Five Guys, In-N-Out, Jack in the Box, McDonald's, Shake Shack, Wendy's, Whataburger). The 12 without inventories: Arby's, Carl's Jr., Chick-fil-A, Chipotle, Dairy Queen, Jamba Juice, KFC, Panera Bread, Sonic, Starbucks, Subway, Taco Bell — their items display and extract but the venues themselves can't be scored as candidates; the home screen lists them under "awaiting ingredient data." 234 of 273 items have components; the 39 remainder have descriptions naming no ingredients and need manual or inferred components. Per-venue extraction highlights: Starbucks 52/52, Jamba 40/44, McDonald's 26/31; weakest are Subway 1/3 and Wendy's 1/2 (few items, sparse descriptions).

## Rebuild / update flow
Fix or extend vocabulary in `ingredient_taxonomy.json` → run `python3 scan_secret_menu.py` → regenerate the embedded blob (venues + secret items joined with their components and tags, descriptions trimmed to 280 chars) into `const EMBEDDED` in the HTML → copy to `deploy/index.html` → `vercel --prod`. All steps CLI in Termux; no GUI anywhere in the loop. File transfer between Claude and the phone goes through Firefox downloads (the Claude app's own download is unreliable on this device), then `mv` from `~/storage/downloads/`.

## Roadmap as discussed (in priority order, none started)
Phase 2 is inventories for the 12 uncovered venues, built RESTOSTOCK-style; Starbucks and Jamba first since their items are fully extracted and drinks need drink-stocked candidates to score meaningfully. Then: manual/inferred components for the 39 unmatched items; a dynamic backend (user's standard Railway Postgres pattern) for product drops, timing, and announcements; user recreation-voting feeding confidence scores; a regional naming/synonym table; procedurally generated undocumented-combo suggestions; and a far-future ingredient cost layer per venue. QSR Timeline (`qsr-timeline-Orange.html`, Orange phone lineage) holds brand metadata for hundreds of chains (founding years, categories, active/defunct) — a venue-registry source for expansion past 20, but it contains no ingredient data.

## House rules that shaped this code (binding on any continuation)
CLI only, ever — Termux on Android, no laptop; verify a CLI path exists before proposing anything. Light theme only, blue accent, small text (13px root), generous whitespace, Android-first ≤640px, `<!-- Blue Phone -->` source comment stays (add your own phone-color comment beside it if another phone modifies the file, don't remove Blue's). Never rename this project or borrow its name elsewhere; never import another project's name into it. In chat: paragraphs not lists, no validation phrases, and the words "actually/realistic/honest/honestly" are forbidden. One downloadable file per delivery block, Firefox download instructions first, cleanup command included whenever a file lands under a generic name. The apostrophe lesson is baked into `enc()` in the router: venue names like McDonald's must have `'` escaped beyond encodeURIComponent or inline handlers break — keep that in any port.
