A Canticle for Pajamastan, cutscene spec, version one.

This document describes short in engine story scenes. It is restated in our own terms from observed behavior of a classic console action RPG. Default timings live in the cutscene tuning file, and the values there are ours.

A cutscene is a list of steps run in order. A step can move the camera to a spot over a duration, point the camera at a target, show a line of dialogue with a speaker name and wait for a tap or a timeout, move an actor to a spot, turn an actor to face something, play an animation on an actor, play a sound or music, fade the screen to or from a color, shake the camera, set a switch flag, or wait for a duration. Several steps can be grouped to run at the same time, and the group ends when its longest step ends.

While a cutscene plays, player input is locked, enemies hold still, and the radar is hidden. A skip button jumps to the end. Skipping still applies every flag set and actor move in the remaining steps, so the world ends up in the same state either way. When the cutscene ends, the camera eases back to the player.
