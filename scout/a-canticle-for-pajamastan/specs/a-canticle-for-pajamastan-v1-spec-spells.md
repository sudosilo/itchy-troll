A Canticle for Pajamastan, spells spec, version one.

This document describes how spells are cast and resolved. It is restated in our own terms from observed behavior of a classic console action RPG. All costs, powers, ranges and timings live in the spells tuning file, and the values there are ours.

Every spell has a level. A character learns a spell at some level from a scroll, and a scroll only teaches when its level is higher than the level already known. Each spell has a per class level ceiling, so some classes can never take a spell past a middling level. A spell costs spell points to cast. The cost is fixed per spell and does not change with level, so high levels are pure gain.

Casting has a wind up. The caster stands still for the spell's cast time, and the spell resolves at the end of it. A caster who takes a flinching hit during the wind up loses the cast and the spell points. Casting speed is shortened by a flat amount for the caster archetype.

Spell power follows a straight line in level: a base amount plus a per level amount times the level. Above a high level threshold, spells switch to a second, steeper straight line, so the last levels of a spell feel like a real jump. When the caster's gear carries a spell boost, the final power is multiplied by that boost.

Attack spells come in elements. Each element has three tiers: a single target bolt, a short range burst around the caster, and a long range area that lands on the target's spot. The bolt flies in a straight line and is used up on the first enemy it touches. Bursts and areas hit every enemy inside their shape once. A spell flagged as piercing keeps going after its first hit and can strike every enemy in its path, but never the same enemy twice, so each cast keeps a list of who it already struck. Area size grows by a fixed step every few levels.

Attack spell damage starts from the spell power, adds a fraction of the caster's mind, then scales by the target's resistance to that element. Resistance is a percentage per element on every enemy, and it can go negative for a weakness. Attack spells don't roll accuracy. They always hit what their shape touches, and they never crit.

Some spells inflict status instead of damage. Each one rolls a chance against the target's resistance to that status, and the status module decides what happens next. Instant death spells work the same way, rolling against a death resistance, and bosses are always immune.

Support spells target allies inside a radius around the caster, and the caster is always included. A heal restores spell power in health to every ally inside the radius. A cure removes harmful statuses. A revive brings back an ally who is down, with a share of health set by the spell level. Power up and guard up spells grant a timed stat buff whose size is spell power as a percentage, and power down and guard down do the same to enemies. Buffs and debuffs of the same kind don't stack, so a newer cast only replaces an older one when it's stronger, and otherwise just refreshes the timer.
