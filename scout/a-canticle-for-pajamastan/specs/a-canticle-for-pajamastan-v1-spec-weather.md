A Canticle for Pajamastan, weather spec, version one.

This document describes weather and ambient life on a floor. It is restated in our own terms from observed behavior of a classic console action RPG. Rates, densities and colors live in the weather tuning file, and the values there are ours.

Each area has a weather profile with a set of states, like clear, dust, rain and storm, and how long each one tends to last. The weather moves from state to state over time, blending between them so the change is gradual.

Rain and dust are drawn as falling or blowing streaks whose count and speed follow the current state. A storm adds lightning. Lightning strikes at random gaps, flashing the whole screen bright for a moment, followed by thunder after a short delay. Fog sets a draw distance and tint, so far things fade into the fog color.

Ambient creatures, like butterflies, moths and birds, drift around on wandering paths near the player. Birds and moths scatter when a player runs close. Weather is cosmetic and never changes combat, except for a fog zone, which belongs to the world objects spec.
