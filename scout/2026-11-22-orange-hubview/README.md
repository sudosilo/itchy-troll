Hub View

Hub View is a three dimensional car explorer for the phone. It is for anyone who wants to see how a car is put together and look up its parts.

You pick a car and spread its assemblies apart in an exploded view, or use Extra explode to spread out every part. Tap a part to get an info card with its manual diagram, part number, and shop links. You can scan a photo of any object to get its parts list and an exploded view of it. You can search for parts, change the paint, adjust opacity, save a card as an image, and build a buy sheet that prints on one page.

Live at 2026-11-22-orange-hubview.vercel.app

Latest change. 2026-11-25, v2026.11.25c. Added the shared library. Scans of an exact model now go to a shared library in Supabase that anyone can open. If the model is already built, it opens right away for everyone. If not, the scan is queued for the worker, which downloads the manuals, keeps the useful pages and diagrams, pulls out the parts, builds the model, fact checks it against the manual and publishes it as verified or draft. A quick draft shows on the phone while the worker runs, and the Shared library button in the menu lists every build and your scans in progress. The worker code is in 2026-11-22-orange-hubview-backend and runs on a schedule in GitHub Actions.

Full history is in CHANGELOG.md.
