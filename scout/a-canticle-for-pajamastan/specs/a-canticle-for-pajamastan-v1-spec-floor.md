A Canticle for Pajamastan, floor spec, version one.

This document describes how a dungeon floor is laid out and gated. It is restated in our own terms from observed behavior of a classic console action RPG. Floor sizes, chances and counts live in the floor tuning file, and the values there are ours.

A floor is a graph of rooms joined by doors. Rooms come from a set of authored templates, and each template has fixed door slots on its sides. A floor is assembled from a seed, so the same seed always builds the same floor. That way every player in a party builds an identical floor locally from one shared number instead of the server sending the whole map.

Assembly grows a main path from the entry room to the exit room, then branches side rooms off the main path. Side branches are dead ends that hold optional loot and keys.

Rooms come in a few kinds. A plain room has enemies that stay where they spawn and doors that never lock. A wave room seals all its doors the moment a player steps inside, then spawns enemies in waves. Each wave starts when the previous wave is cleared, and the doors open when the last wave dies. A switch room has a barrier fence across one exit that drops when every switch in the room is stepped on, and switches can require several players standing on them at once. A key room holds a key whose matching door is somewhere later on the main path. Keys are always placed in a side branch or earlier on the main path, never behind their own door. A rest room has no enemies and holds a healing point. The exit room holds the warp to the next floor, and on the last floor of an area it holds the boss gate instead.

Containers are breakable objects placed in rooms. Each one rolls loot through the container path of the loot spec when broken. Some containers are trapped and release a hazard instead of loot, at a chance set per floor.

Floors deeper in an area raise the wave count, the share of wave rooms and the area depth value the loot system reads.
