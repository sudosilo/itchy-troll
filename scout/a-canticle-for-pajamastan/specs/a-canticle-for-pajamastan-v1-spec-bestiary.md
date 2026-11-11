A Canticle for Pajamastan, bestiary spec, version one.

This document describes the enemy behavior archetypes beyond the pack hunter. It is restated in our own terms from observed behavior of a classic console action RPG. Every speed, range, timer and count lives in the bestiary tuning file, and the values there are ours. All archetypes share the state machine rules from the brain spec, including dormant start, wake radius, sense radius, leash and hurt flinch.

The pack hunter correction. On the leader's death, followers stop and mourn as described in the brain spec. Partway through the mourning, each follower casts a guard down on its current target, and near the end it casts a power down. The pack weakens the player instead of strengthening itself. The rage multiplier in the brain tuning file stays as an optional extra and is set to no change by default.

The flyer hovers above ground and can't be hit by low sweeping attacks. It drifts toward its target at hover height, circles overhead, then dives at the target in a straight line, strikes, and climbs back up. It is grounded and open to all attacks for a short time after a dive.

The gunner keeps its distance. It walks to a firing distance from its target, turns to face it, and fires a volley of shots with a short gap between each one. When the target closes inside a too close distance, the gunner backs away before firing again. Its shots are dodgeable projectiles that travel at a fixed speed.

The phantom is hard to see. It stays invisible while it moves and only becomes visible during its wind up before an attack and its recovery after. Invisible phantoms can still be hit by area attacks. Some phantoms also make decoys. A decoy copies the phantom's look and movement and vanishes in one hit without dropping anything. The real one is marked by being the only copy that takes damage numbers.

The splitter is a blob. When killed, it splits into smaller copies with a share of its health, until it reaches the smallest size, which dies for good. The children of one split try to merge back into a bigger blob if they touch each other and none of them are hurt for a while.

The nest doesn't move. It spawns swarm units on a timer while a player is near, up to a live cap. Swarm units are weak and fast. Destroying the nest stops spawning, and its live swarm units scatter and flee.

The boss is built from parts. Each part has its own health and armor and can be broken off. Breaking a part removes the attacks that use it and can open a soft spot. A boss moves through phases set by its total health, and each phase can switch its attack set and speed. Bosses are immune to instant death and have high resistance to hard locking effects like freeze and paralysis.
