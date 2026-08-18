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

## Dialogue gating on friendship

Friendship (`S.fr[npcId]`) is a 0–5 counter, raised only through `fr` values
on dialogue-choice options (`ask.opts[].fr`) or quest completion
(`BEK_QUESTS[].fr`), never set directly. A `BEK_TALK[npc].nodes[]` entry gates
on friendship with a `when: S => S.fr.npcId >= N` predicate, checked in array
order — nodes are one-shot (tracked in `S.seen`), so ordering nodes from
lowest to highest required friendship is required for them to surface as the
relationship grows rather than being skipped. `chat[]` entries are the
fallback pool once no ungated node is available; an `if` predicate on a chat
entry follows the same `S => ...` convention reading `S.flag`/`S.fr`/`S.disc`,
never state that a chat line itself would need to mutate.
