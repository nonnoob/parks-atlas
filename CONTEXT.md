# Parks Atlas — domain language

Vocabulary for the scratch-off collection game of the 63 U.S. National Parks. This file records the ubiquitous language only, no implementation detail. Chinese terms in parentheses are the canonical UI wording in zh mode.

## Collection & progress

**Atlas (图鉴)**:
The full set of 63 U.S. National Parks an owner is collecting one by one; an atlas corresponds one-to-one with a passphrase, and one device can hold several. "Parks Atlas" also names the app itself.
_Avoid_: map, game, collection

**Check-in (打卡)**:
The **action** of the owner marking "I have been to this park". It produces a check-in record and turns the park lit.
_Avoid_: sign in, stamp (as a noun)

**Lit (点亮)**:
The **visual state** of a park after check-in (gray foil scratched off, color revealed). Opposite: unlit. Check-in and lit are two faces of one event: the action and the resulting state.
_Avoid_: using "lit" for the check-in action

**Check-in record (打卡记录)**:
A tamper-evident credential that "this park was checked in by this atlas's owner", carrying the **visit date** — chosen by the owner at check-in time (defaults to today, may backfill a past day, never a future one). The date itself is tamper-protected.
_Avoid_: signature, entry

**Invalid record (异常记录)**:
A check-in record that fails verification (altered, or of unknown origin); it never counts toward progress. In a **shared atlas** it is shown flagged red to expose forgery; in the owner's own atlas it has no value and is removed automatically on entry.
_Avoid_: tampered record, bad record

## People & identity

**Owner (持有者/卡主)**:
The person an atlas belongs to; holds the passphrase; the only one who can check in.
_Avoid_: user

**Passphrase (口令)**:
The secret the owner uses to authorize check-ins and to locate their cloud archive; entered once at the entrance and never again inside the game. **The passphrase IS the atlas**: one passphrase ↔ one independent atlas; different passphrases on the same device open their own atlases; the same passphrase on any device opens the same one. A never-seen passphrase only takes effect after the owner confirms "new atlas".
_Avoid_: password

**Card fingerprint (编号)**:
An atlas's short public identifier, shown on shared snapshots to tell sources apart.
_Avoid_: fingerprint (raw), ID

**Cloud archive (云存档)**:
The atlas's encrypted copy in a GitHub repo, updated automatically after each check-in. Encrypted as a whole: the repo reveals nothing about which parks were visited, and nobody without the passphrase can overwrite it.
_Avoid_: backup, cloud data

**Restore (恢复)**:
Entering the passphrase on any device to fetch the cloud archive and continue checking in. When a passphrase has no archive, creating a fresh atlas requires the "new atlas" confirmation — so a typo can't silently spawn a new book.
_Avoid_: log in, sync (that's what happens automatically after check-ins)

## Views & map

**National view (全美视图)**:
The whole U.S. map, used to pick a state; a "Territories" inset floats off the Atlantic coast to hold territory parks.
_Avoid_: main map, overview map

**Territory park (属地公园)**:
A park belonging to no state (U.S. Virgin Islands and American Samoa — two parks). It has no state view; its detail card opens straight from the Territories inset, and check-in is press-and-hold there. The region filter groups them under "Territories".
_Avoid_: overseas park, island park (that means parks like Dry Tortugas — in a state but out at sea)

**State view (州视图)**:
A single state filling the screen, its parks rendered as badges.
_Avoid_: state map

**Badge (徽章)**:
The scratchable disc representing **one park** in the state view: a disc bearing that park's dedicated emoji (unique across all 63), sized by in-state density. Scratching it open is checking in. This is the canonical name for one of the three "card" senses.
_Avoid_: card, icon, medallion, scratch card

**Detail card (详情卡)**:
The in-map info card — name/intro/status — pulled out from a badge by a leader line. It scales with the map, so it stays readable when pinch-zoomed. Canonical name for the second "card" sense.
_Avoid_: card, popup, sheet

**Leader line (连线)**:
The guide line connecting a badge to its detail card.

## Sharing

**Shared atlas (分享图鉴)**:
A **read-only snapshot link** of the owner's atlas at one moment: others can view it and verify authenticity, but cannot check in. A one-time snapshot; the link itself never expires. Canonical name for the third "card" sense.
_Avoid_: shared card, card, link

**Read-only (只读)**:
The mode you are in when viewing a shared atlas.
_Avoid_: guest mode

## The scratch mechanic (scratch-off metaphor)

**Scratch-off (刮刮卡)**:
The physical metaphor the whole experience rests on — scraping foil off a lottery ticket. Used as theme/metaphor only; it names no concrete object.

**Scratch (刮开)**:
The gesture of rubbing a badge to erase its foil and reveal color; requires arming by press-and-hold first, and the check-in completes once the foil is essentially cleared and a visit date is chosen.
_Avoid_: scratch-off (that's the metaphor, not the action)

**Foil (箔层)**:
The translucent silver-gray coating over an unscratched badge, the gray park image faintly showing through; scratched areas reveal color.
_Avoid_: gray layer, overlay
