A Canticle for Pajamastan, particles spec, version one.

This document describes the three particle emitter shapes used for hit sparks, spell bursts, dust and pickups. It is restated in our own terms from observed behavior of a classic console action RPG. Counts, speeds and lifetimes live in the particles tuning file, and the values there are ours.

Every particle has a position, a velocity, a size that grows or shrinks over its life, a color that fades out at the end of its life, a spin and a lifetime. Emitters create particles and own them until they die.

A ballistic emitter throws particles out in a cone with a random speed, and gravity pulls them down. It's used for sparks, debris and dust kicked up by feet.

An orbit emitter makes particles circle a center at a set radius and angular speed, rising or sinking slowly. The center can follow a moving object. It's used for buffs, pickups that glow, and the swirl before a spell lands.

A radial emitter fires a ring of particles straight out from a center, all at the same time and the same speed, with even spacing. It's used for blasts, shockwaves and spell rings.

Particles can be drawn additive, so overlapping ones glow brighter, or normal. Every emitter has a cap on live particles so a big fight never stalls the frame.
