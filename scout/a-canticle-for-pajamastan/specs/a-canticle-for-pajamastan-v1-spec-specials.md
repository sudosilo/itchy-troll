A Canticle for Pajamastan, weapon specials spec, version one.

This document describes the extra effects a weapon can carry, which fire when a special attack lands. It is restated in our own terms from observed behavior of a classic console action RPG. Every power, cap and factor lives in the specials tuning file, and the values there are ours.

A special is a kind plus a strength. Only the special attack kind from the combat spec triggers it, so a player trades a lower hit chance for the effect.

Fast weapons are weakened. Every weapon family has a special factor. Single strike weapons use the full factor, while weapons that hit several times per swing or fire many shots use a half or a third. The factor scales every special effect, so twin knives can't spread a strong drain across many hits.

Drain specials take a percentage of the target's current health and give it to the attacker. The amount is the special's power as a percentage of the target's health, times the weapon factor. It's capped per difficulty tier, so a drain on a huge boss doesn't heal for thousands, and it's at least one point. Spirit drain works the same way, taking spell points instead of health. Neither works on bosses.

Siphon specials give the attacker experience equal to a share of the target's level, instead of draining a resource. They don't work in boss areas or against players.

Status specials try to apply a status. The chance is the special's power minus the target's resistance to that status, times the weapon factor, read as a percentage. The status kinds are the harmful ones from the status spec.

Fell specials try to kill outright. The chance is the special's power minus the target's death resistance, times the weapon factor, read as a percentage. Bosses and players are immune.

Cleave specials cut a percentage of the target's current health, capped per difficulty tier. Bosses take a reduced share.

When a special doesn't fire or the target is immune, the special attack still deals its normal damage from the combat spec, and a miss popup shows over the target.

Our special names map to kinds. Draining is a health drain, Thirsting is a spirit drain, Learning is a siphon, Searing and Chilling are status specials for poison and freeze, Static is shock, Hushing is a fell special, and Splitting is a cleave.
