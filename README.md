# The First Floor · Kansas Union Level 1

Team 3's design for Level 1 of the Kansas Union, as a website built around the floor plan.
Everything on it comes from the deck, `Working Files/Union_L1_Final_Deck_V2.ai`.

## What's where

| File | What it holds |
|---|---|
| `data/content.js` | Every word on the site, the order of the walk, and where each view sits on the plan. Edit this by hand. |
| `data/assets.js` | Which pictures exist for each space. Written by the build script; don't edit it. |
| `tools/deck.json` | Which deck slide feeds which part of the site. |
| `tools/build_assets.py` | Rebuilds every picture from the deck. |
| `assets/` | The built pictures (plan layers, renders, before photos, elevations, references). |

## Updating after the deck changes

1. Save the deck in Illustrator (keep the file name, or change `deck` in `tools/deck.json`).
2. If slides were added or moved, fix the page numbers in `tools/deck.json`.
   The "more views" slides (Jay, Jay Games, Bar, Pods, Terrace, Front) are already listed:
   once their grey placeholders hold pictures, those pictures show up on the site by themselves.
3. Rebuild the pictures (about 10 minutes, the before photos are large):

   ```bash
   python3 tools/build_assets.py
   ```

4. Change any wording in `data/content.js`.
5. Preview, then publish:

   ```bash
   python3 -m http.server 8000
   ```

   ```bash
   git add -A && git commit -m "Update from the final deck" && git push
   ```

   GitHub Pages republishes about a minute after the push.

Needs poppler (`brew install poppler`), Google Chrome, and Python with Pillow, numpy and scipy.

## Notes

- The plan layers are the deck's own "Nine zones" and "Loud to quiet" sheets with the type and
  number markers stripped out, so the site can draw its own buttons on top.
- View positions (`cam` and `look` in `content.js`) are in deck points on the Nine zones sheet.
  They were read off the red view cones in each space's key plan. The Bar slide has no cone,
  so its position was placed by hand at zone 7.
- The site tells search engines not to index it. Anyone with the link can open it.
