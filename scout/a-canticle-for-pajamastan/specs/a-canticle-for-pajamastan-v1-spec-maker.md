A Canticle for Pajamastan, character maker spec, version one.

This document describes making a new character and saving it. It is restated in our own terms from observed behavior of a classic console action RPG. Ranges, palettes and rules live in the maker tuning file, and the values there are ours.

Making a character takes a class, a name and an appearance. The class sets the starting stats and the gear the character can use. The appearance is cosmetic only and never changes stats.

The appearance has a body section and a style section. The body has a height slider and a build slider, each with a range set per class, so some classes can be taller or broader than others. The style has a head shape, a hair style, a face, and color choices for skin, hair and costume, each picked from a palette. A random button rolls everything inside the allowed ranges.

A name has a minimum and maximum length and can only use letters, numbers, spaces and a few marks. It can't start or end with a space or use two spaces in a row. It's checked against the word filter from the social spec. Names don't need to be unique within one player's save slots.

Each player has a fixed number of save slots. A slot holds one character with its class, name, appearance, level, experience, stats boosts, inventory, storage, card book, companion and story flags. Deleting a character asks twice. Saving writes the whole slot at once, so a crash mid save never leaves a half written character.
