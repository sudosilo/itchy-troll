A Canticle for Pajamastan, player actions spec, version one.

This document describes how a player character moves, attacks, gets hit, goes down and comes back. It is restated in our own terms from observed behavior of a classic console action RPG. Every speed, frame window and timer lives in the actions tuning file, and the values there are ours.

Movement follows the stick. A small push walks and a full push runs. Turning is instant while standing, but turn rate is limited while running, so a hard turn at full speed swings wide. A player can't move while an attack animation is playing, except during its recovery tail, where a new input can cancel into movement.

Attacks chain in three steps. Pressing an attack button during the open window near the end of the current swing queues the next step. Pressing too early does nothing, and pressing too late lets the combo drop. Each step can use any attack kind, so a quick, quick, heavy chain is normal play. Each swing has a wind up, an active window where it can hit, and a recovery. Ranged weapons follow the same chain rules. Their active window fires a shot, and they lock on to the nearest target in a forward cone.

Getting hit has three weights. A light hit plays a short flinch. A hit at or above the knockback share of maximum health knocks the player back a short distance and stops their actions. A hit at or above the knockdown share knocks them flat. After a knockdown, the player gets up with a short invulnerability window. Some enemy attacks always knock down regardless of damage.

At zero health a player goes down. A downed player can't act, their meter is frozen, and they show a revive marker. In modes where the rule is on, they drop their equipped weapon on the floor where they fell, and anyone can pick it back up for them. A downed player can be revived by a revive spell, a revive tool used by a teammate standing next to them, or a companion revive. Otherwise they choose to return to town. Returning to town costs a share of the currency they carry, and the medical center in town restores them for a fee.

Revival brings the player back with a share of health set by the source, and with a short invulnerability window.
