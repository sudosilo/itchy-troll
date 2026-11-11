A Canticle for Pajamastan, network sync spec, version one.

This document describes how a party of players stays in sync. It is restated in our own terms from observed behavior of a classic console action RPG.

Every client simulates the whole game locally. The server is a relay. It holds rooms of up to four players, assigns each player a client slot, and forwards game events from one client to every other client in the room. It never runs the game itself. That keeps the server tiny and cheap.

Ownership decides who is allowed to say what. Each player owns their own character, so only that client may send that character's movement, attacks, item use, equipment changes, death and revival. Enemies are owned by the room leader, who is the earliest joined player still in the room. The leader decides enemy deaths and loot rolls, and every client applies the leader's result. When the leader leaves, the next earliest player becomes leader and takes over enemy ownership.

Events are small typed messages. Each carries a type, the sender's slot and a body. The core types are: set position, walk to position, run to position, stop at position, attack with an attack kind and a target list, hit result, change health, die, revive, change floor, warp within floor, drop item, pick up item, use item, equip, unequip, level up, step on switch, open door and room cleared. Position updates are sent at a modest rate, and receiving clients ease toward the newest position, so movement looks smooth without flooding the relay.

Every receiving client validates every event before applying it. The sender's slot must be a real slot in the room. The sender must own the thing the event is about, so a client sending a move for someone else's character is ignored. Floor numbers must be inside the valid floor range. Entity ids must refer to things that exist. Counts must be inside their limits, like a target list no longer than the maximum. Health values can't go negative. An event that fails any check is dropped silently. The relay applies the same slot and ownership checks before forwarding, so a bad client can't spray junk into a room.

Floors are never sent over the wire. The leader sends the floor seed when the party enters a floor, and every client builds the floor from that seed using the floor spec. Loot is rolled only by the leader, and the result is sent as a drop item event, so every client sees the same item land in the same spot.
