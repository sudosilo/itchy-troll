A Canticle for Pajamastan, growth spec, version one.

This document describes character classes, stat growth and experience. It is restated in our own terms from observed behavior of a classic console action RPG. All numbers live in the growth tuning file, and the values there are ours.

Every class belongs to one of three archetypes: fighter, shooter or caster. Each archetype carries a health factor and a spell point factor. Fighters get the most health per point of vitality, shooters a little less, and casters the least health but the most spell points per point of mind. Maximum health is vitality times the archetype's health factor plus a flat health bonus per level. Maximum spell points are mind times the archetype's spell point factor plus a flat bonus per level.

Every class has a starting stat block and a cap stat block. Stat gains per level are set so that a class reaches its cap block at the level cap. A class can have a cap of zero in mind, which means it can never cast. Gains are not even across levels. Each stat follows a curve between the starting value and the cap, set by a growth shape value per class, so some classes start strong and flatten out while others start weak and surge late.

Each level requires a total experience amount set by a curve that gets steeper as levels rise. The curve is defined by a base amount, a growth exponent and a level cap.

Experience from a kill goes in full to the player who landed the killing blow. Every other living player in the same room who hit that enemy at least once gets a share of it, and players in the room who never touched the enemy get a smaller share. The shares are set in the tuning file. Experience is never split, so each player gets their own amount and party play never punishes anyone for joining.

Stat boosting consumables raise one stat by one point each, up to a per class limit on how many can be used, so a maxed character can still grow a little by farming.
