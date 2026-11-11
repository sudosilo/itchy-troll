A Canticle for Pajamastan, traps spec, version one.

This document describes floor hazards. It is restated in our own terms from observed behavior of a classic console action RPG. Ranges, damages and timers live in the traps tuning file, and the values there are ours.

Every trap watches for the nearest visible player inside its notice range. When a player is noticed, the trap arms and shows a warning. When that player gets inside the trap's trigger distance, the trap fires. Traps fire once and are spent, unless they're marked as repeating, which rearms them after a cooldown.

Trap damage is a base amount scaled by the difficulty tier, so the same trap hurts more on harder difficulties. Traps can be destroyed by attacks before they fire, and some traps are hidden until a player uses a detection tool or walks near.

The trap kinds are a blast trap that damages everyone in a radius, a freeze trap, a shock trap and a confusion trap that each apply their status in a radius, a snare that holds the target player in place for a duration, a spinning saw that sweeps back and forth along a fixed line and damages anyone it touches, and a laser fence that blocks a doorway until a switch is hit and damages anyone who touches it.

Players can also place their own traps from a limited supply in modes that allow it. Player placed traps only affect enemies, or other players in battle mode.
