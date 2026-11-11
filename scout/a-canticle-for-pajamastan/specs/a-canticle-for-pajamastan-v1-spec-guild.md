A Canticle for Pajamastan, quest board spec, version one.

This document describes the board where players pick up quests and the story progress behind it. It is restated in our own terms from observed behavior of a classic console action RPG. Quest lists, requirements and rewards live in the guild tuning file, and the values there are ours.

Quests come in categories: story, hunting, retrieval, escort and challenge. Each quest has a minimum level, an optional list of story flags that must already be set, a difficulty tier range, a time limit or none, a short description, the script it runs, and a reward of currency, items and experience.

The board shows every quest whose requirements the player meets, plus locked quests greyed out with the reason they're locked. A player can hold one active quest at a time. Accepting it starts its script when the party enters the quest area. Abandoning it ends it with no reward.

When the quest script ends in success, the player returns to the clerk to report it. Reporting pays the reward and sets the quest's completion flag. Story quests also set story flags that unlock later quests and change what town characters say. Repeatable quests pay a reduced reward after the first clear. The board remembers each quest's best clear time.
