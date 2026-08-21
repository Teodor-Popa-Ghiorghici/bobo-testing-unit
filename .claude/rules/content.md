---
paths: ["data.js"]
---

# Content authoring conventions (Bekkedal `data.js`)

## Id naming

Item, crop, and seed ids are lowercase Norwegian nouns, no separators
(`potetfro`, `blabar`, `tommer`). A seed id is the crop id plus the `fro`
suffix (`potet` → `potetfro`); `BEK_CROPS[cropId].out` must equal the crop's
own item id, and `BEK_ITEMS[seedId].seed` must equal the crop id it plants.
Map ids and NPC ids are lowercase Norwegian place/first names with no
suffix (`setra`, `hakon`) and are used verbatim as keys into `BEK_MAPS`,
`BEK_TALK`, and as `who`/`npc.id` values elsewhere — renaming one means
updating all three.

## Quests referencing items

A quest's `need` object keys must be `BEK_ITEMS` ids the player can actually
hold (not seeds unless the quest is specifically a seed-turn-in). A quest's
`kr`/`tool`/`grant` rewards use the same ids as `BEK_ITEMS`/`BEK_TOOLS` —
`grant.item` is itself a `{itemId: qty}` map added via the same `add()` path
as everything else. A quest's `who` must match an id in `BEK_NPCS` and a key
in `BEK_TALK`; the quest is only offered/completable through that NPC's
dialogue nodes, so a quest with no matching `BEK_TALK` entry is unreachable.

## Where the dialogue lives

`BEK_TALK` is no longer written out in `data.js`. It is four sibling files,
two characters each, grouped by where those two stand — `talk_town.js`
(Astrid, Håkon), `talk_water.js` (Ingrid, Olav), `talk_field.js` (Marit,
Sigrid), `talk_stone.js` (Gunnar, Lars) — which `data.js` joins into the one
table every consumer still asks it for. The twenty-four heart events split
the same way, into `scenes_valley.js` and `scenes_wild.js`, joined as
`BEK_SCENES`. Same reasoning as the three map files: forty times as much
dialogue as there was is more than one file should carry beside the items and
the crops, and the repo's 300-line rule says so. A new line goes in the file
its speaker is in; a new speaker goes in the file their place is in.

## Dialogue gating on friendship

Friendship (`S.fr[npcId]`) is a 0–10 counter, raised through `fr` values on
dialogue-choice options (`ask.opts[].fr`), quest completion
(`BEK_QUESTS[].fr`), or a gift the character loves or likes (`BEK_NPCS[].gift`,
+2/+1; a disliked gift is -1) — never set directly. A `BEK_TALK[npc].nodes[]` entry gates
on friendship with a `when: S => S.fr.npcId >= N` predicate, checked in array
order — nodes are one-shot (tracked in `S.seen`), so ordering nodes from
lowest to highest required friendship is required for them to surface as the
relationship grows rather than being skipped. `chat[]` entries are the
fallback pool once no ungated node is available; an `if` predicate on a chat
entry follows the same `S => ...` convention, never reading state that a chat
line itself would need to mutate. What it may read is most of `S`:
`S.flag`/`S.fr`/`S.disc`/`S.q`, `S.weather`, `S.season` (an index, 0-3),
`S.festival`, `S.min`, `S.bag`, `S.act2Unlocked`, and `S.yst` for what the
player did yesterday. Two rules hold for all of them, and
`act2_check.js` enforces both: read a bag or a counter through
`(S.bag.x || 0)` so a partial state cannot make the gate throw, and never
gate an NPC's whole pool off at once — `talkTo()` indexes the filtered pool
modulo its length, so an NPC with nothing to say has nothing to say. The
five-beat arcs and the friendship-4/7/10 heart events those gates carry are
described in `.claude/rules/bekkedal-content.md`.

## Gifting

`BEK_NPCS[npc].gift` is `{ loved, liked, disliked, reactions }`: the first
three are lists of `BEK_ITEMS` ids the player can actually hold — the same
"real, holdable item" rule a quest's `need` follows, checked by
`quest_check.js`'s obtainability table — anything not listed is neutral.
`reactions` carries one spoken line (a `dlg.lines`-shaped array, same
convention as a `nodes[]` entry) per tier — `loved`/`liked`/`neutral`/
`disliked` — rather than a number popping up. `talkTo()` (`index.js`) checks
an item held out against these lists third, after both quest turn-ins (the
fixed list, then the repeatable board), so a gift never races a turn-in for
the same conversation; `BEK_GIFT_CAP` (`data.js`) caps it at two per person
per week, tracked in `S.giftWeek` and cleared on the same weekly cadence
`isRefreshDay()` already turns the quest board over on.

## Who is speaking, and what face they are wearing

The dialogue panel names the speaker on a plate under their portrait, and that
plate is the **only** place a speaker is named. Every string in `BEK_TALK`
used to open with the speaker's own name and a colon as well, so the box read
"ASTRID" and then "ASTRID: Good morning." — a new line must not bring the
prefix back. `scripts/lint-content.mjs` fails on any spoken string that starts
with a `BEK_NPCS` name and a colon; a line may still *mention* somebody by
name, it just may not be addressed by one.

A `nodes[]` or `chat[]` entry may carry `mood: 'warm' | 'troubled'`, which
picks the expression `portrait.js` draws for every line in it. `neutral` is
the resting face and is what an entry with no `mood` gets, so it is never
written down. Where the tone turns *inside* an entry, the individual line
carries `m` instead — which only works on the object form of a line
(`{ no, en, m }`), a bare string having nowhere to hang one. The valid values
are `PORT_MOODS` (`portrait.js`), and the same lint asserts both that every
mood asked for is one the rig has and that both opt-in faces are actually
reached by some line.

A line built in code rather than read out of a table has to be given its
speaker explicitly — see **Which face, and who is speaking**,
`.claude/rules/bekkedal-art.md`.
