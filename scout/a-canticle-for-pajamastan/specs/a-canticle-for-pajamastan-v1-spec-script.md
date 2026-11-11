A Canticle for Pajamastan, quest script spec, version one.

This document describes the scripting engine that runs quests, story events, dialogue and mode rules. It is restated in our own terms from observed behavior of a classic console action RPG.

A quest is a small program run by a virtual machine. The machine has a bank of numbered registers, a set of numbered event flags saved with the character, a call stack, and labels that code can jump to. Several threads can run at once, and each thread runs until it hits a wait instruction, then gives the rest of the frame to the game.

The instruction set covers arithmetic on registers and constants, comparisons and conditional jumps, calls and returns, flag set and clear and test, and waits by frames or until a condition. The game side instructions cover showing messages and dialogue windows with choices, moving and fading the camera, playing music and sounds, spawning and removing enemies and objects, locking and unlocking doors, enabling and disabling the map and menus and movement, giving items and currency, warping players between floors, setting a time limit, and ending the quest with success or failure.

Scripts react to the world through handlers. A script registers a label for each event it cares about, like entering a floor, talking to a character, stepping into an area, a switch flipping, an enemy dying, a wave clearing, a player dying, and the quest succeeding, failing or being abandoned. When the event happens, the machine starts a new thread at that label.

Rule instructions let a script set up a mode. They can fix the character level, swap in a fixed equipment loadout, set lives, ban spells or items or companions, choose whether enemies drop currency and items, set trap supplies, turn on scoring, and set the score weights for kills, damage dealt, damage taken and deaths.

For our engine, scripts are written as plain text, one instruction per line. A label is a word ending in a colon, and an instruction is an opcode followed by its arguments. That way quests can be written on a phone and loaded without a compiler.
