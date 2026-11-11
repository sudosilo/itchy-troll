A Canticle for Pajamastan, enemy brain spec, version one.

This document describes how a ground enemy thinks, using a pack hunter as the reference design. It is restated in our own terms from observed behavior of a classic console action RPG. All distances, timers and chances live in the brain tuning file, and the values there are ours.

An enemy is a state machine. Every state has an enter step, an update step that runs every tick, and an exit step. Only one state is active at a time, and states hand off to each other by name. The full set is dormant, waking, idle, howl, roam, chase, flank, circle, lunge, recover, return, hurt, dying and gone.

An enemy starts dormant, placed at its spawn anchor and doing nothing. When a player enters its wake radius, or when a packmate calls it, it moves to waking, which plays a short reveal and then hands off to idle. Idle stands in place and checks for targets.

Target selection works by sense radius. The enemy picks the nearest living player within its sense radius. A pack leader has a larger sense radius than its followers, so the leader notices players first and pulls the pack in after it. When the leader acquires a target, it enters howl, which alerts every packmate sharing its group id and hands them the same target. Followers that hear the howl skip waking and go straight to the attack loop.

The attack loop decides how to approach. When an enemy with a target leaves idle, it rolls a chance. Below the chase chance it goes straight for the target in chase. Otherwise it enters flank, where it picks a point offset to the side of the target and runs there first, so a pack spreads around a player instead of stacking in a single line. When the enemy gets within circle range it enters circle, orbiting the target at that range for a randomized time while turning to face it. When the circle timer runs out, or when it rolls the lunge chance on any tick, it enters lunge, a fast committed dash through the target's position that can't be steered once it starts. After a lunge it enters recover, a short pause where it's open to punishment, then returns to the attack loop.

Turning is speed limited. An enemy turns toward its desired heading by at most its turn rate each tick, so a player who sidesteps a lunge at the last moment gets past it.

Leashing keeps enemies near their rooms. When an enemy wanders farther than its leash distance from its anchor, or loses all targets, it enters return, walks back to its anchor and goes idle there.

Hurt is entered when a hit lands that deals at least the flinch threshold of the enemy's maximum health. It plays a short stagger, during which the enemy can't attack, then resumes the attack loop. Damage below the threshold doesn't interrupt.

Dying is entered at zero health. The body slides in the direction of the knockback, turned sideways to the side the blow came from, then enters gone and is removed.

Pack mourning is the signature behavior. When a pack leader dies, every surviving follower in its group stops, faces the leader's body and holds there for a mourning time. Partway through the mourning, each follower casts a guard down on its current target, and near the end it casts a power down. Then it goes back to the attack loop. Killing the leader first weakens the player, so kill order becomes a real decision. The tuning file also has an optional rage multiplier for followers, set to no change by default.
