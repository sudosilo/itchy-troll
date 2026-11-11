A Canticle for Pajamastan, economy spec, version one.

This document describes shops, refining, appraisal, storage and trading. It is restated in our own terms from observed behavior of a classic console action RPG. Prices, odds and stock sizes live in the economy tuning file, and the values there are ours.

Shops restock every time the player returns to town. Stock is rolled from the same item building rules as the loot spec, using the player's level instead of area depth, so shops grow with the character. The tool shop always carries the basic consumables, plus scrolls whose levels are rolled from a range set by player level. The weapon and armor shops roll a fixed count of items each visit. Shop weapons can carry bonuses, but never specials.

Prices come from the item. A weapon's price comes from its tier, with additions for refinement, each bonus point and any special. Armor follows the same pattern with its defense and evasion bonuses. Selling pays back a fixed share of the price.

Refining raises a weapon's power spread one step at a time, up to a per weapon refine cap. Refining uses a consumable refining material. It always succeeds and the cap can't be passed.

Rare drops and weapons with specials can drop unidentified. An unidentified item can't be equipped. Appraising it at the appraiser costs a fee and reveals the item. Appraisal can also shift the item a little: it rolls a small chance to raise the refinement, a small chance to lower it, and the rest leave it as it is. Lowering never goes below zero.

Each character has a storage box with a slot limit, and currency can be stored up to a cap.

Trading is a handshake between two players standing near each other. One player sends a request and the other accepts. Both then move items and currency into their offer window. When either player changes their offer, both confirmations reset. When both players confirm their offers, each sees a final summary. When both confirm the final summary, the items swap in one step. Either player can cancel at any time, and the trade cancels by itself if the two players move too far apart. Nothing changes hands until the final step, so a dropped connection can never lose items.
