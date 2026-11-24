# Amfibido: 5 more level I equipment

Five proposed level I equipment cards, numbered 21 to 25 so they follow the first 20 designs in `README.md`. None of them have been playtested.

Each card is written in the same format as `context/cards.md`. Run `node card-designs/build.mjs level-1-equipment.md --pdf` to rebuild the shareable page and PDF.

## What the designs go after

All five are gear that a fighter wears or holds, and every effect is about the fighter using it.

- Four are +1 equipment with one small extra, in the mould of Sparring Boots.
- Each extra looks at a different moment: a knockout, a drawn fight, the opponent's combo moves, and a win with a combo move.
- The fifth is a plain +2 that breaks when its fighter loses.

## Overview

| # | Card | Level | Type | Power | In short |
|---|------|-------|------|-------|----------|
| 21 | Mouthguard | I | Equipment | +1 | A knocked out fighter returns to your hand instead |
| 22 | Headband | I | Equipment | +1 | The fighter wins a drawn fight |
| 23 | Chest Guard | I | Equipment | +1 | +1 for each combo move on the opposing fighter |
| 24 | Focus Mitts | I | Equipment | +1 | On a win, one combo move on the fighter gains boomerang |
| 25 | Glass Bottle | I | Equipment | +2 | Retired when the fighter loses |

---

## Equipment

### 21. Mouthguard

```
CARD: Mouthguard
LEVEL: I
POWER: +1
CARD_TYPE: Equipment
ABILITY: When the fighter is knocked out, return it to your hand instead.
```

**Why:** Boxing Gloves with insurance. It is the protection half of Combat Headgear, available from round 1. In most rounds it is a plain +1, and against crocodiles it saves you a fighter.

**Rulings**

- It works against any knockout, including Sucker Punch and Tipsy Turtle's own ability.
- Against Coach Nickey the fighter returns to your hand and is not retired.

### 22. Headband

```
CARD: Headband
LEVEL: I
POWER: +1
CARD_TYPE: Equipment
ABILITY: If the fight in this dojo is a draw, the fighter wins it instead.
```

**Why:** Draws are common at level I, where most fighters have 2 to 4 power. The headband settles them in your favour and does nothing else.

**Rulings**

- Compare total power first. The headband only applies when the totals are equal.
- It counts as a normal win for Knockout, Sparring Boots, Spawn and Basilisk.
- If both fighters wear a Headband, the fight stays a draw.

### 23. Chest Guard

```
CARD: Chest Guard
LEVEL: I
POWER: +1
CARD_TYPE: Equipment
ABILITY: The fighter gains +1 for each combo move played on the opposing fighter.
```

**Why:** Padding that takes the edge off a combo. It is a plain +1 until the opponent commits combo moves to that dojo, and then it gives a little back for each one.

**Rulings**

- Count every combo move on the opposing fighter when the fight is resolved, including ones with no power value.
- Combo moves copied onto the opposing fighter by Fists of Fury or Goliath Frog count.
- The extra power is ability power. Newt and Axolotl do not double it.

### 24. Focus Mitts

```
CARD: Focus Mitts
LEVEL: I
POWER: +1
CARD_TYPE: Equipment
ABILITY: When the fighter wins the fight, one combo move played on it gains boomerang.
```

**Why:** Focus mitts are the pads a coach holds up for combination practice. Win with a combo move and you get that move back, one round later. The fighter has to win first, so it is a small reward for a fight you already won.

**Rulings**

- You choose the combo move. It goes to your cooldown zone at the end of the round.
- It does nothing if the fighter draws or loses, or if it has no combo moves on it.

### 25. Glass Bottle

```
CARD: Glass Bottle
LEVEL: I
POWER: +2
CARD_TYPE: Equipment
ABILITY: Retire this from play when the fighter loses the fight.
```

**Why:** A street-fighting weapon next to Barbed Wire and Brass Knuckles. It is the strongest equipment at level I for as long as you keep winning with it, and it breaks the first time you lose.

**Rulings**

- It stays in the dojo after a win or a draw.
- It is not retired if you have no fighter in its dojo.
- The +2 is base power. Newt and Axolotl double it to +4.

---

## Balance watchlist

- **Glass Bottle:** +2 is the highest base power on level I equipment, and Newt makes it +4. If it wins too many early rounds, retire it on a draw as well.
- **Headband:** Winning draws is worth more at level I than later. It may be the best of the +1 cards.
- **Focus Mitts:** Getting a big combo move back is more than a very small benefit once level III and IV combos arrive. If so, limit it to level I and II combo moves.
- **Mouthguard:** With Tipsy Turtle it gives you a 10-power fighter every round. Combat Headgear already allows that, but this is available two levels earlier.
- **Chest Guard:** It may do too little in games without frogs.
