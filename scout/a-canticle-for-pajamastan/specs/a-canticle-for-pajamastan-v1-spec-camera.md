A Canticle for Pajamastan, camera spec, version one.

This document describes how the game camera follows the player. It is restated in our own terms from observed behavior of a classic console action RPG. Distances, heights and easing rates live in the camera tuning file, and the values there are ours.

The camera trails behind the player at a set distance and height, looking at a point a little above and ahead of them. When the player turns, the camera doesn't snap. It swings around behind them at a limited rate, so short turns barely move it and long runs pull it into place.

A reset button snaps the camera directly behind the player. Holding a shoulder button lets the player swing the camera left and right by hand.

The camera eases toward its goal position each frame instead of jumping, with a separate easing rate for distance and for angle. When a wall would come between the camera and the player, the camera moves in close in front of the wall, then eases back out once the way is clear.

In a fight, the look point pulls partway toward the nearest locked target, so the player and the enemy stay in frame together. Scripts can take over the camera for cutscenes by setting a fixed position and look point, then hand control back. A shake effect adds a short, decaying jitter for big hits and boss slams.

For a top down game, the same rules apply with the trailing distance set to zero and a fixed pitch. The camera follows the player with easing and leads in the direction they're moving.
