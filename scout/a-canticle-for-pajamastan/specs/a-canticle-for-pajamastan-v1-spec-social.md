A Canticle for Pajamastan, social spec, version one.

This document describes quick chat, player cards and the lobby. It is restated in our own terms from observed behavior of a classic console action RPG. Phrase lists, limits and timers live in the social tuning file, and the values there are ours.

Quick chat lets players talk without typing. It's a two level menu: a category, then a phrase. Phrases are stored as numbers, not text, so every player sees them in their own language and nobody can type something abusive. A phrase can have a slot filled from game context, like the name of the item the player is holding, the floor number, or a target enemy. Phrases show as a bubble over the player's head and in the chat log.

Symbol messages are tiny pictures built from a set of stock shapes, each with a position, size, color and flip, plus a face. They're sent as a short list of numbers, so they're cheap on the network and can't carry text.

Free chat is text typed by the player. It goes through a word filter before it's sent, and any player can mute another player's free chat for themselves.

Every player has a player card holding their name, class, level, a short comment and a unique card number. Two players standing near each other can trade cards. Each player keeps a card book with a slot limit. From the card book, a player can see whether a card's owner is online and which lobby they're in, and send them a short mail even when they're offline.

Lobbies are shared hangout rooms holding many players. They have quick chat, free chat, symbol messages and card trading, but no combat. From a lobby, players make or join game rooms of up to four players. A game room can have a name, a password and a difficulty tier, and its leader picks the mode and the quest.
