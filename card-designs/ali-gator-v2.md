# Amfibido: Ali Gator, version 2

A new version of the Ali Gator sensei, card 18 in `README.md`. It has not been playtested.

The card is written in the same format as `context/cards.md`. Run `node card-designs/build.mjs ali-gator-v2.md --pdf` to rebuild the shareable page and PDF.

---

## Sensei

This replaces the first version of card 18. He now costs 1 card instead of 2, his power is 2 + the round number instead of 3 + the round number, and he stays in the dojo until he loses instead of leaving at the end of every round.

### 18. Ali Gator

```
CARD: Ali Gator
LEVEL: Sensei
BASE_POWER: 2+*
CARD_TYPE: Sensei
ABILITY: * is equal to the round number. Discard a card from your hand: Put this into one of your dojos as a fighter. When this loses the fight, return it to the sensei spot.
ACTION_ABILITY: TRUE
```

**Why:** A sensei who fights. He is the only sensei with a power, and it grows every round: 3 in round 1 and 10 in round 8. Sending him in costs one card. He holds his dojo for as long as he wins or draws, and every loss sends him back to the sensei spot, where it costs another card to bring him out again.

**Rulings**

- * is the round the round marker is on when the fight is resolved. From round 9 on the marker stays on 8, so his power is 10.
- You can only put him into a dojo from the sensei spot. If one of your fighters is already in that dojo, it is replaced as normal.
- In a dojo he is a fighter in every way. Equipment works for him, combo moves can be played on him, and he counts as one of your fighters.
- He has no fighter type and no card level, so he cannot be transformed.
- He stays in the dojo after a win or a draw, like any fighter.
- Whenever he would go to your hand, your cooldown zone or the discard pile, he returns to the sensei spot instead. This covers knockout, being replaced, Timeout and Sparring Boots.
- He cannot be retired to pay a cost, such as Champion's Belt.

---

## Balance watchlist

- **Power for free:** While he keeps winning he gains 1 power every round at no cost. If he holds one dojo for too long, change the 2 to a 1.
- **Cost:** One card buys a fighter at any moment of the game, and that fighter is never lost. Master Toshi pays 2 cards for one new card. If Ali Gator turns out too cheap, 2 cards is the first thing to try.
- **Knockout:** A knockout sends him to the sensei spot, so he can fight again the next round. That takes away what crocodile decks are good at. An option is to turn him face-down for one round after a knockout.
- **Fighter type:** He has none in this version. Making him a crocodile is one extra line and would connect him to Brass Knuckles, Tail Swipe and Marsh Crocodile.
