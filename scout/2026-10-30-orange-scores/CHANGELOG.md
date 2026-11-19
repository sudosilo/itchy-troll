Score Hub changelog

2026-11-17, v2026.11.17f. Registered Raineurysm Puzzle on the score hub. A run adds up points for each solved level, for speed and for using few parts, and can be played across many sessions.

2026-11-18, v2026.11.18. MobbyHill sign in now runs on Supabase Auth. Players sign in with their own email and a six digit code, or with any outside provider turned on in Supabase. Wallets, unlocks and payments belong to the Supabase Auth user. Removed the name and password accounts and the mh-account endpoint. New endpoint mh-auth.

2026-11-17, v2026.11.17e. Added MobbyHill player accounts on Supabase. Players sign in with a name and password, get the weekly 1000 tokens on the account, can buy 1000 tokens for $1 through Stripe Checkout, and keep vehicle and part unlocks on the account. A signed Stripe webhook credits each paid checkout once. New endpoints: mh-account, mh-wallet, mh-buy, stripe-webhook, and the paid.html return page.

2026-11-17, v2026.11.17d. Added MobbyHill vehicle unlocks to its token wallet: side by side 1500, SUV 1500, pickup 2500.

2026-11-17, v2026.11.17c. Registered eight MobbyHill Off road recovery leaderboards, shown as jobs cleared and a clock time, and added the heavy rope and fast winch to its token wallet.

2026-11-17, v2026.11.17b. Registered eight MobbyHill Search and rescue leaderboards, with and without fuel on each of the four landscapes. The hub shows them as hikers rescued and a clock time.

2026-11-17, v2026.11.17. Registered twelve more MobbyHill leaderboards, one for each game in the Forest, Canyon and Dunes landscapes. Added six new MobbyHill store parts to its token wallet.

2026-11-15, v2026.11.15b. Added token wallets. A game can give each player a set number of tokens every calendar week, counted by the server clock, and spend them on items through the server. MobbyHill is the first game with a wallet: 1000 tokens a week, holding up to 3000.

2026-11-15, v2026.11.15. Registered three more MobbyHill modes: Fuel, Climb and Climb Fuel. The climb modes post height in tenths of a meter and the hub shows them in meters.

2026-11-14, v2026.11.14. Registered MobbyHill on the score hub. Its scores count checkpoints first and the time to reach them second, and the hub now shows those as flags and a clock time.

2026-11-10, v2026.11.10. Registered Sky Flow on the score hub so its timed round scores show up there.

2026-10-31, v2026.10.31. Registered FogWarren on the score hub so its scores show up there.

2026-10-30, v2026.10.30. First release. A shared score service for the games, with a small script that games use to send scores and a hub page that lists top scores and live plays. It accepts the Redis variable names from the hosting marketplace. Mill-ionaire was registered, with scores up to the safe integer limit and runs that can last for days.

2026-11-18, v2026.11.18b. Registered Tile Spinner on the score hub with three boards: Rush counts boards cleared before time runs out, Pipes counts total stars earned across challenge levels, and Vault scores how fast and in how few tries a code is cracked.

2026-11-18, v2026.11.18c. Tile Spinner Vault scores now scale with vault difficulty, up to three times for Expert, so the board accepts scores up to 3000.

2026-11-19, v2026.11.19. Registered Just Five More on the score hub with seven boards, one for each task: math, petals, paint, scratch tickets, bubble wrap, leaves and cables. A score is how many items the player did in one shift after being told to do five.
