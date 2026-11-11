A Canticle for Pajamastan, status effects spec, version one.

This document describes timed effects on fighters. It is restated in our own terms from observed behavior of a classic console action RPG. Every duration, tick and chance lives in the status tuning file, and the values there are ours.

Every effect reaches a fighter as a message with a kind and a value, and the fighter decides how to apply it. The same message shape is used whether the source is a spell, a weapon special, a trap, an enemy attack or a pack reacting to its leader's death. Enemies can be built to ignore any kind they shouldn't care about.

Stat effects change one stat by a percentage for a duration. The kinds are power up, power down, guard up and guard down. Only one effect of each kind is active at a time. A new one replaces the old only when its percentage is larger, and otherwise it refreshes the duration.

Harmful effects come in seven kinds. Poison drains a share of maximum health on every tick and can't kill, leaving the fighter at one health at worst. Paralysis stops all movement and actions for its duration. Freeze also stops everything, but a hit that deals more than a share of maximum health shatters the ice, ending the freeze and adding bonus damage. Shock stops actions in short bursts, flickering on and off over its duration. Slow cuts movement speed and attack speed by a percentage. Confusion makes a player's movement input point in random directions and makes an enemy strike other enemies near it. Curse halves healing received.

Each harmful effect is applied by a chance roll. The source's chance is reduced by the target's resistance to that kind, and a resistance of one hundred or more makes the fighter immune. A fighter already under an effect can't have it reapplied until it ends, which stops lock chains. After paralysis, freeze or shock ends, the fighter gets a short immunity window to that same effect.

A cure removes every harmful effect at once and leaves stat effects alone. Dying clears everything.

Every fighter carries a status list that's ticked once per frame with the elapsed time. The tick returns events, like poison damage and effects ending, so the game can show numbers and play sounds.
