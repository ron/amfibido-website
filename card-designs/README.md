# Amfibido: 20 new card designs

Twenty proposed cards: 8 fighters, 4 equipment, 5 actions and 3 sensei. None of them have been playtested. Power values are set against the existing curve, and the cards I trust least are listed under [Balance watchlist](#balance-watchlist).

Each card is written in the same format as `context/cards.md`, so a block can be pasted there once a card is approved. They are kept out of that file on purpose, because the rules chatbot reads it.

## What the designs go after

**Gaps in the current set**

- There is no level I turtle, no level II spawn and no level V spawn.
- Level V has no action cards.
- Nothing rewards transforming. Transform cards are their own payoff.
- Only Timeout, Kick and Punch and Mr Minami touch the cooldown zone.
- Only Marbled Salamander and Siren Salamander care where a card sits.

**New ground**

- Timing: one card is played after both players pass, and one sensei pays you for passing first.
- Scoring: Sumo Turtle is the only card that changes the score. Two new cards change what a round is worth or how it is decided.
- Hand size, negative power, a fighter that cannot win or lose, and a sensei who steps into the dojo.

## Overview

| # | Card | Level | Type | Power | In short |
|---|------|-------|------|-------|----------|
| 1 | Stinkpot | I | Fighter - Turtle | 6 | Your fighters in adjacent dojos have -1 |
| 2 | Spadefoot Toad | I | Fighter - Toad | 2 | Goes to the cooldown zone when discarded from hand |
| 3 | Tadpole | II | Fighter - Spawn | 2 | Wins a fight, becomes a level IV fighter |
| 4 | Wood Frog | III | Fighter - Frog | 5 | +2 for each card in your cooldown zone |
| 5 | Box Turtle | III | Fighter - Turtle | 7 | Its fight is always a draw |
| 6 | Mutant Spawn | III | Fighter - Spawn | 5 | +3 each time you transform a card |
| 7 | Hellbender | IV | Fighter - Salamander | 8 | Also uses the opposing equipment's base power |
| 8 | Primordial Spawn | V | Fighter - Spawn | 9 | Transforms your other fighters when it enters |
| 9 | Bandages | I | Equipment | none | +1 for each round your opponent has won |
| 10 | Slingshot | II | Equipment | +* | * is the opposing fighter's level |
| 11 | Training Weights | II | Equipment | -2 | The fighter transforms when it wins |
| 12 | Dojo Gong | IV | Equipment | none | Your fighters in adjacent dojos gain +3 |
| 13 | Karate Chop | I | Action - Combo Move | +1 | +3 more with an empty hand |
| 14 | Smelling Salts | II | Action | none | Put a fighter from your cooldown zone into a dojo |
| 15 | Flawless Victory | III | Action - Combo Move | +3 | Winning all 3 fights is a double win |
| 16 | Sneak Attack | IV | Action - Combo Move | +4 | Can be played after both players pass |
| 17 | Main Event | V | Action | none | One dojo decides the round |
| 18 | Ali Gator | Sensei | Sensei | none | Steps into an empty dojo as a crocodile |
| 19 | Obi-Newt | Sensei | Sensei | none | +3 for a fighter when you pass first |
| 20 | Master Dartwin | Sensei | Sensei | none | +1 to all when your 3 fighters differ in type |

Deck sizes with all 20 added: level I 36, level II 36, level III 35, level IV 29, level V 12, sensei 18.

---

## Fighters

### 1. Stinkpot

```
CARD: Stinkpot
LEVEL: I
BASE_POWER: 6
CARD_TYPE: Fighter - Turtle
ABILITY: Your fighters in adjacent dojos have -1 power.
```

**Why:** There is no level I turtle. Turtles carry the vanilla power of the next level plus a drawback: Snapping Turtle is an 8 at level II, the same as Great Crocodile at level III. Stinkpot is an Alligator-sized 6 at level I. Its drawback depends on position, so it belongs in dojo 1 or 3. Stinkpot is the real nickname of the musk turtle.

**Rulings**

- In dojo 2 it affects both of your other fighters. In dojo 1 or 3 it affects only the fighter in dojo 2.
- The -1 is ability power. Coach Hulk and Desert Tortoise neutralize it.

### 2. Spadefoot Toad

```
CARD: Spadefoot Toad
LEVEL: I
BASE_POWER: 2
CARD_TYPE: Fighter - Toad
ABILITY: When this is discarded from your hand, put it in your cooldown zone instead of the discard pile.
```

**Why:** Black Toad and Bogart Toad replace themselves once. Spadefoot Toad comes back every other round, which makes it permanent fuel for Toada, Bloated Toad, Oak Toad, Kung Fu Gi and Meditate. Real spadefoot toads bury themselves and dig back out.

**Rulings**

- It still counts as a fighter discarded from your hand for Cane Toad and Meteor Hammer.
- It works only when discarded from your hand. If it is replaced in a dojo, it is retired as normal.
- It returns to your hand at the end of the next round, like any card in the cooldown zone.

### 3. Tadpole

```
CARD: Tadpole
LEVEL: II
BASE_POWER: 2
CARD_TYPE: Fighter - Spawn
ABILITY: When this wins the fight, transform it into a level IV fighter.
```

**Why:** There is no level II spawn. Tadpole is Spawn with a bigger prize: it skips level III. Winning a level II fight with base power 2 takes real investment.

**Rulings**

- Reveal cards from the level IV deck until you reveal a fighter. The rest of the Transform procedure is unchanged.
- Other transform effects, such as Rebirth or Spawning Suit, transform it into a level III fighter as normal.
- Mentor Morphos applies: reveal until you hit 2 level IV fighters and pick one.

### 4. Wood Frog

```
CARD: Wood Frog
LEVEL: III
BASE_POWER: 5
CARD_TYPE: Fighter - Frog
ABILITY: This gains +2 for each card in your cooldown zone.
```

**Why:** A payoff for the cooldown zone, which frog decks fill with boomerang combos. It is also a comeback card: fighters that were knocked out last round make it stronger this round. Real wood frogs freeze solid in winter and thaw in spring.

**Rulings**

- Count the cards when the fight is resolved. Fighters knocked out in this round's fights are not in the cooldown zone yet.
- Taking cards out of the cooldown zone (Timeout, Kick and Punch, Mr Minami, Smelling Salts) lowers the bonus.
- A Spadefoot Toad discarded this round counts.

### 5. Box Turtle

```
CARD: Box Turtle
LEVEL: III
BASE_POWER: 7
CARD_TYPE: Fighter - Turtle
ABILITY: The fight in this dojo is always a draw. This gets knocked out after the fight.
```

**Why:** A fighter that can neither win nor lose. It blanks whatever the opponent has stacked in that dojo and turns the round into a two-dojo contest. The knockout uses Tipsy Turtle's wording and stops it from locking a dojo for the rest of the game.

**Rulings**

- The fight is a draw even if the opponent has no fighter in that dojo.
- The Knockout keyword needs a win, so it never triggers against Box Turtle.
- If its ability is neutralized (Hypnotoad, Desert Tortoise, Coach Hulk), it fights normally with base power 7 and is not knocked out.

### 6. Mutant Spawn

```
CARD: Mutant Spawn
LEVEL: III
BASE_POWER: 5
CARD_TYPE: Fighter - Spawn
ABILITY: This gains +3 each time you transform a card this round.
```

**Why:** The missing payoff for transform decks. It follows the Dart Frog pattern, with transforms in place of combo moves.

**Rulings**

- Counts every transform of your fighters and equipment this round, including ones before this card was played. Keep track while it is in your hand.
- Mass Metamorphosis counts once for each fighter it transforms.
- Transforms that happen after the fight (Spawn, Tadpole, Weapon Rack, Training Weights) come too late to count.

### 7. Hellbender

```
CARD: Hellbender
LEVEL: IV
BASE_POWER: 8
CARD_TYPE: Fighter - Salamander
ABILITY: This also gains the base power bonus from the opposing equipment in this dojo.
```

**Why:** Level IV has only one salamander. Hellbender points the salamanders' equipment skill across the table and gives the game a second answer to equipment-heavy opponents, next to Bo Staff.

**Rulings**

- Only printed base power counts, as with Marbled Salamander. Power from equipment abilities is not gained.
- If the opponent has two equipment in the dojo, it gains the base power of both.
- A negative base power is gained too. Opposing Training Weights give Hellbender -2.

### 8. Primordial Spawn

```
CARD: Primordial Spawn
LEVEL: V
BASE_POWER: 9
CARD_TYPE: Fighter - Spawn
ABILITY: When this enters a dojo from your hand, you may transform each of your other fighters in your dojos.
```

**Why:** There is no level V spawn. This is Mass Metamorphosis on a body, without the level limit, so level IV fighters become champions.

**Rulings**

- You choose for each fighter whether it transforms. A level V fighter transforms into another level V fighter.
- Combo moves stay on fighters that transform.
- Each transform counts for Mutant Spawn.

---

## Equipment

### 9. Bandages

```
CARD: Bandages
LEVEL: I
CARD_TYPE: Equipment
ABILITY: This equipment has +1 power for each round your opponent has won.
```

**Why:** A catch-up card that sits on the table. It does nothing on turn one and is worth +3 when you have your back against the wall. Because equipment never leaves, playing it early is a real bet.

**Rulings**

- It has no printed base power. The bonus is ability power, so Newt and Axolotl do not double it, Marbled Salamander does not copy it and Silent Lee adds nothing.
- Use the opponent's score marker. The maximum is +3.

### 10. Slingshot

```
CARD: Slingshot
LEVEL: II
POWER: +*
CARD_TYPE: Equipment
ABILITY: * is equal to the opposing fighter's card level.
```

**Why:** The mirror of Nunchucks. It grows with the opponent's team instead of your own, so it keeps an early fighter relevant against late-game champions.

**Rulings**

- The +* counts as base power, as with Nunchucks.
- With no opposing fighter, * is 0.
- A sensei fighting in a dojo (Ali Gator) has no card level and counts as 0.

### 11. Training Weights

```
CARD: Training Weights
LEVEL: II
POWER: -2
CARD_TYPE: Equipment
ABILITY: When the fighter wins the fight, transform it.
```

**Why:** The first equipment with negative power: fight with a handicap, and level up if you win anyway. It is repeatable, since each new fighter picks up the weights.

**Rulings**

- The -2 is base power. Newt and Axolotl double it to -4. Marbled Salamander and Siren Salamander gain -2 from it in an adjacent dojo. Silent Lee makes it -1.
- The transform happens after the fight. The new fighter stays in the dojo for the next round.

### 12. Dojo Gong

```
CARD: Dojo Gong
LEVEL: IV
CARD_TYPE: Equipment
ABILITY: Your fighters in adjacent dojos gain +3.
```

**Why:** Support equipment that does nothing for its own dojo. In dojo 2 it is worth +6 across two fights, and on a side it is worth +3. It gives Switcheroo effects a new target.

**Rulings**

- It has no printed base power. The bonus is ability power and is not copied or doubled by salamanders.
- If an opposing Bo Staff or Hypnotoad neutralizes it, both bonuses are lost.

---

## Actions

### 13. Karate Chop

```
CARD: Karate Chop
LEVEL: I
POWER: +1
CARD_TYPE: Action - Combo Move
ABILITY: This has an additional +3 power if you have no cards in your hand.
```

**Why:** Karate means "empty hand". This is the first card that cares about hand size. It rewards going all-in and fits toad decks that discard their hand anyway.

**Rulings**

- Check your hand when the fight is resolved, not when you play the card.
- The +3 is part of this combo move's power, so Black Belt triples the full +4.

### 14. Smelling Salts

```
CARD: Smelling Salts
LEVEL: II
CARD_TYPE: Action
ABILITY: Put a fighter from your cooldown zone into one of your dojos.
```

**Why:** An answer to knockout that costs a card. It also has a home in turtle decks: it brings Tipsy Turtle or Box Turtle straight back.

**Rulings**

- If the dojo already holds one of your fighters, that fighter is replaced and retired as normal.
- The fighter enters a dojo, but not from your hand. Wrist Wraps and Clouded Salamander trigger. Painted Turtle's discard and Anaconda's switcheroo do not.

### 15. Flawless Victory

```
CARD: Flawless Victory
LEVEL: III
POWER: +3
CARD_TYPE: Action - Combo Move
ABILITY: If you win all 3 fights this round, it counts as a double win.
```

**Why:** The mirror of Sumo Turtle's double loss. Once it is on the table, the opponent has to secure at least a draw in one dojo. As a combo move it is never a dead card, and it stays on the fighter as a reminder until the fights are resolved.

**Rulings**

- Move your score marker 2 spaces instead of 1.
- A fight you win because the opponent has no fighter in that dojo counts as a win.
- If the opponent also loses the round with Sumo Turtle, move your marker 3 spaces.

### 16. Sneak Attack

```
CARD: Sneak Attack
LEVEL: IV
POWER: +4
CARD_TYPE: Action - Combo Move
ABILITY: You may play this at the start of the fight phase, after both players have passed.
```

**Why:** The whole action phase is about who acts last. This card lets you act after the last action. Once players know it is in the deck, every pass with cards in hand becomes a possible bluff.

**Rulings**

- You may also play it during the action phase like any other combo move.
- If both players play one at the start of the fight phase, the starting player goes first.
- No other card or ability can be used at that moment.

### 17. Main Event

```
CARD: Main Event
LEVEL: V
CARD_TYPE: Action
ABILITY: Choose a dojo. This round, the player who wins the fight in that dojo wins the round.
```

**Why:** Level V has no actions. This one is a champion-level gamble: everything rides on one fight. The opponent can still answer by pouring cards into that dojo, unless they have already passed.

**Rulings**

- If the fight in that dojo is a draw, the round is a draw.
- The other fights are still resolved for their effects (knockout, returning to hand, transforming). They do not count toward the round.
- Leave this card next to the chosen dojo until the end of the round. A second Main Event replaces the first.
- Sumo Turtle's double loss still applies. Flawless Victory still needs all 3 fights won.

---

## Sensei

The existing sensei are named after famous mentors, so these three follow suit.

### 18. Ali Gator

```
CARD: Ali Gator
LEVEL: Sensei
CARD_TYPE: Sensei
ABILITY: Discard 2 cards from your hand: Put this in one of your empty dojos as a crocodile fighter with base power equal to 3 + the round number. Return this to the sensei spot at the end of the round.
ACTION_ABILITY: TRUE
```

**Why:** A retired champion who steps back into the ring. His power follows the vanilla crocodile curve: 4 in round 1 (Caiman) and 11 in round 8 (River Crocodile). The price matches Master Toshi's 2 cards. Toshi gives you a card to keep, and Ali Gator gives you a guaranteed fighter for one round.

**Rulings**

- An empty dojo is a dojo without one of your fighters. Equipment in that dojo works for him, and combo moves can be played on him.
- He is a crocodile for Brass Knuckles, Tail Swipe and Marsh Crocodile.
- He has no card level. He cannot be transformed, knocked out or retired, and he always returns to the sensei spot.
- From round 9 on, the round marker stays on 8, so his base power is 11.

### 19. Obi-Newt

```
CARD: Obi-Newt
LEVEL: Sensei
CARD_TYPE: Sensei
ABILITY: When you are the first player to pass in a round, one of your fighters in a dojo gains +3.
```

**Why:** Acting last is the strongest position in the action phase. This sensei pays you to give it up. You get +3 for free, and your opponent then gets to react with full information.

**Rulings**

- Choose the fighter at the moment you pass. The bonus stays on that fighter until the end of the round.
- If your opponent passes first, you get nothing this round.

### 20. Master Dartwin

```
CARD: Master Dartwin
LEVEL: Sensei
CARD_TYPE: Sensei
ABILITY: When you have 3 fighters of 3 different fighter types in your dojos, your fighters gain +1.
```

**Why:** Almost every payoff in the game rewards one fighter type. This sensei rewards a mixed team, which changes how you value every draft pick.

**Rulings**

- Check when the fight is resolved.
- A fighter with several types (Humongous Spawn) counts as one type of your choice.

---

## Balance watchlist

These are the designs most likely to need a change after playtesting.

- **Training Weights:** A fighter that keeps winning levels up every round, so one dojo can snowball. If that happens, make the power -3 or retire the weights after the first transform.
- **Main Event:** A bomb when the opponent has already passed. That is in line with other level V cards, but it can decide a game.
- **Box Turtle:** Drawn fights lead to more drawn rounds and longer games. The self-knockout limits it to every other round, and Smelling Salts gets around that.
- **Primordial Spawn:** Two random level V fighters is a large swing. Limiting it to one fighter is the easy fix.
- **Sneak Attack:** +4 with no possible answer. Lower it to +3 if it decides too many rounds.
- **Tadpole:** A level IV fighter in round 4 is strong. If it wins too easily, lower the base power to 1.
- **Stinkpot:** 6 is the highest base power at level I. The penalty may need to be -2.
