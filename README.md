# The First Floor · Kansas Union Level 1

Team 3's design for Level 1 of the Kansas Union, as a website built around the floor plan.
Everything on it comes from the deck, `Working Files/Finals/Union_L1_Final_Deck_V3.ai`.

## What's where

| File | What it holds |
|---|---|
| `data/content.js` | Every word on the site, the order of the walk, and where each view sits on the plan. Edit this by hand. |
| `data/assets.js` | Which pictures exist for each space. Written by the build script; don't edit it. |
| `tools/deck.json` | Which deck slide feeds the map and elevations, and which picture files (the exact files placed in the deck) feed each space, the more-views galleries and the reference grids. |
| `tools/build_assets.py` | Rebuilds every picture from the deck. |
| `assets/` | The built pictures (plan layers, renders, before photos, elevations, references). |

## Updating after the deck changes

1. Save the deck in Illustrator (keep the file name, or change `deck` in `tools/deck.json`).
2. If slides were added or moved, fix the page numbers in `tools/deck.json`. If a picture in the
   deck was swapped (a hero render, a before photo, a more-views tile, furniture, materials), change
   its file path there too. The deck's PDF layer lists neighbouring slides' images on every page, so
   the build reads the placed files directly instead of guessing them from the PDF.
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
   python3 tools/stamp.py && git add -A && git commit -m "Update from the final deck" && git push
   ```

   `stamp.py` puts a new version number on the site's files so nobody's browser keeps an old copy.

   GitHub Pages republishes about a minute after the push.

Needs poppler (`brew install poppler`), Google Chrome, and Python with Pillow, numpy and scipy.

## Notes

- The plan layers are the deck's own "Nine zones" and "Loud to quiet" sheets with the type and
  number markers stripped out, so the site can draw its own buttons on top.
- The map is painted into one canvas the size of the window. Each layer has a light picture
  (`assets/map/<layer>-sm.webp`) for the whole floor, and zoomed in, the sharp version loads as
  600 px tiles (`assets/map/tiles/<layer>/`), only the ones on screen. The build cuts the tiles.
- View positions (`cam` and `look` in `content.js`) are in deck points on the Nine zones sheet.
  They were read off the red view cones in each space's key plan (every space has one now).
- The site tells search engines not to index it. Anyone with the link can open it.
