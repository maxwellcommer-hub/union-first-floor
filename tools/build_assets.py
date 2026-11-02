#!/usr/bin/env python3
"""Rebuild every image on the site from the Illustrator deck.

    python3 tools/build_assets.py            # everything
    python3 tools/build_assets.py map        # only the plan layers
    python3 tools/build_assets.py spaces     # only the space sheets and references
    python3 tools/build_assets.py changed    # only the today / our plan pair
    python3 tools/build_assets.py elevations # only the elevation drawings

Page numbers live in tools/deck.json. If slides move in the deck, change them there.
Needs: poppler (pdftoppm, pdftocairo, pdfimages), Google Chrome, Pillow, numpy, scipy.
"""
import json, os, re, shutil, subprocess, sys, tempfile
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
CFG = json.load(open(os.path.join(HERE, 'deck.json')))
DECK = os.path.normpath(os.path.join(SITE, CFG['deck']))
OUT = os.path.join(SITE, 'assets')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
TMP = tempfile.mkdtemp(prefix='union_site_')

KU_BLUE = 'rgb(0%, 40.39917%, 69.398499%)'
CRIMSON = 'rgb(87.799072%, 11.399841%, 22.399902%)'
WHITE_RING = 'rgb(100%, 100%, 100%)'

# Card boxes on a 1920x1080 sheet, as fractions (measured on the V2 deck).
ELEVATION_CARD = (0.0151, 0.0269, 0.9849, 0.8731)
MORE_VIEWS = [(0.0151, 0.0269, 0.4922, 0.8731), (0.5005, 0.0269, 0.9849, 0.4426),
              (0.5005, 0.4574, 0.7385, 0.8731), (0.7469, 0.4574, 0.9849, 0.8731)]


def run(*a, **k):
    return subprocess.run(a, check=True, capture_output=True, text=True, **k).stdout


def save_webp(im, path, width=None, q=82):
    im = im.convert('RGB')
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6)
    print('  ', os.path.relpath(path, SITE), im.size)


def page_png(page, dpi):
    base = os.path.join(TMP, f'p{page}_{dpi}')
    if not os.path.exists(base + '.png'):
        run('pdftoppm', '-r', str(dpi), '-f', str(page), '-l', str(page), '-singlefile', '-png', DECK, base)
    return Image.open(base + '.png')


# ---------------------------------------------------------------- plan layers
def small(d):
    """True for a crimson shape no bigger than the entrance arrow (zone 1 is far larger)."""
    nums = [float(v) for v in re.findall(r'-?\d+\.?\d*', d)]
    xs, ys = nums[0::2], nums[1::2]
    return bool(xs) and max(xs) - min(xs) < 80 and max(ys) - min(ys) < 120


def svg_page(page, strip_zones=False):
    """Deck page as SVG with all type and the round zone markers removed."""
    raw = os.path.join(TMP, f'raw{page}.svg')
    run('pdftocairo', '-svg', '-f', str(page), '-l', str(page), DECK, raw)
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
    tree = ET.parse(raw)
    root = tree.getroot()
    root.set('width', '1920'); root.set('height', '1080')
    href = '{http://www.w3.org/1999/xlink}href'
    for parent in root.iter():
        kids = list(parent)
        for i, ch in enumerate(kids):
            tag = ch.tag.split('}')[-1]
            if tag == 'use' and (ch.get(href) or '').startswith('#glyph'):
                parent.remove(ch)
            elif tag == 'path' and ch.get('stroke') == WHITE_RING and ch.get('stroke-width') == '2.053':
                parent.remove(ch)  # marker ring, and the disc drawn just before it
                if i and kids[i - 1].tag.endswith('path') and kids[i - 1].get('fill') in (KU_BLUE, CRIMSON):
                    if kids[i - 1] in list(parent):
                        parent.remove(kids[i - 1])
            elif strip_zones and tag == 'path' and ch.get('fill') in (KU_BLUE, CRIMSON):
                parent.remove(ch)
            elif tag == 'path' and ch.get('fill') == CRIMSON and small(ch.get('d') or ''):
                parent.remove(ch)  # the entrance arrow: the site draws its own on every layer
    out = os.path.join(TMP, f'clean{page}{"_plain" if strip_zones else ""}.svg')
    tree.write(out)
    return out


def chrome_png(svg, scale=4):
    png = svg[:-4] + '.png'
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                    '--window-size=1920,1080', f'--force-device-scale-factor={scale}',
                    f'--screenshot={png}', 'file://' + svg], capture_output=True)
    return Image.open(png).convert('RGB')


def navy_mask(a):
    r, g, b = (a[..., i].astype(int) for i in range(3))
    return (r < 70) & (g < 90) & (b < 130) & (b > r + 15)


def build_map():
    print('plan layers')
    m = CFG['map']
    plain = chrome_png(svg_page(m['zones_page'], strip_zones=True))
    zones = chrome_png(svg_page(m['zones_page']))
    heat = chrome_png(svg_page(m['heat_page']))
    a = np.array(plain)
    nm = navy_mask(a)
    nm[:, : int(a.shape[1] * 0.3)] = False  # the plan sits in the right-hand card
    ys, xs = np.where(nm)
    pad = 60
    box = (xs.min() - pad, ys.min() - pad, xs.max() + pad, ys.max() + pad)
    for name, im in (('plan', plain), ('zones', zones), ('heat', heat)):
        c = im.crop(box)
        save_webp(c, f'{OUT}/map/{name}.webp', width=3600, q=86)
        save_webp(c, f'{OUT}/map/{name}-sm.webp', width=1800, q=80)
    json.dump({'box': [int(v) for v in box], 'scale': 4, 'size': [int(box[2] - box[0]), int(box[3] - box[1])]},
              open(f'{OUT}/map/frame.json', 'w'))


def build_changed():
    """Today vs our plan: the drawing from each half of the "What changed" sheet, without the
    deck's card, its title or its grey ground, so the site's own frame is the only frame."""
    print('what changed')
    p = page_png(CFG['map']['changed_page'], 216)
    W, H = p.size
    for name, fx in (('today', (0.0151, 0.4985)), ('ours', (0.4985, 0.9849))):
        panel = p.crop((int(fx[0] * W), int(0.29 * H), int(fx[1] * W), int(0.98 * H)))
        a = np.asarray(panel.convert('RGB')).astype(int)
        h, w = a.shape[:2]
        a = a.copy()
        bg = a[int(h * .3), int(w * .05)].copy()  # the inner card's ground
        inner = a[int(h * .11):int(h * .97), int(w * .03):int(w * .97)]  # inside the card's rounded edge
        # wipe the deck's TODAY / OUR PLAN title: the shapes that end above the plan's top wall
        ink = np.abs(inner - bg).sum(2) > 40
        top_wall = int(np.argmax(ink.sum(1) > inner.shape[1] * .25))
        lab, _ = ndimage.label(ink)
        for k, sl in enumerate(ndimage.find_objects(lab), 1):
            if sl[0].stop <= top_wall:
                inner[lab == k] = bg
        ink = np.abs(inner - bg).sum(2) > 40
        ys, xs = np.where(ink)
        pad = 40
        crop = inner[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad].copy()
        crop[np.abs(crop - bg).sum(2) < 24] = 255  # the card's ground becomes plain white
        save_webp(Image.fromarray(crop.astype(np.uint8)), f'{OUT}/changed/{name}.webp', width=1800)


def build_elevations():
    """Each elevation drawing, cut inside the deck's light blue card so its rounded edge never shows."""
    print('elevations')
    for sid, s in CFG['spaces'].items():
        if 'elevation' in s:
            f = ELEVATION_CARD
            inset = (f[0] + .011, f[1] + .004, f[2] - .011, f[3] - .004)  # clears the corner radius
            save_webp(trim(card(s['elevation'], inset, 300)), f'{OUT}/spaces/{sid}/elevation.webp', width=3800, q=84)


# ---------------------------------------------------------------- images by object id
_lists = {}


def page_images(page):
    if page not in _lists:
        rows = run('pdfimages', '-list', '-f', str(page), '-l', str(page), DECK).split('\n')[2:]
        _lists[page] = [r.split() for r in rows if r.strip()]
    return _lists[page]


def extract_object(oid, pages):
    """Pull one embedded image (by PDF object id) out of the first page that holds it."""
    dst = os.path.join(TMP, f'obj{oid}.png')
    if os.path.exists(dst):
        return Image.open(dst)
    for page in pages:
        for r in page_images(page):
            if r[2] == 'image' and r[10] == str(oid):
                d = os.path.join(TMP, f'x{page}')
                if not os.path.isdir(d):
                    os.makedirs(d)
                    run('pdfimages', '-png', '-f', str(page), '-l', str(page), DECK, d + '/i')
                shutil.copy(f'{d}/i-{int(r[1]):03d}.png', dst)
                return Image.open(dst)
    raise SystemExit(f'object {oid} not found on pages {pages}')


def before_after(page):
    """On a before/after sheet: the big photo is 'before', the deck render is 'after'."""
    imgs = [r for r in page_images(page) if r[2] == 'image' and int(r[3]) > 600]
    imgs.sort(key=lambda r: int(r[3]) * int(r[4]), reverse=True)
    return int(imgs[0][10]), int(imgs[-1][10])


def card(page, frac, dpi):
    p = page_png(page, dpi)
    W, H = p.size
    return p.crop((int(frac[0] * W), int(frac[1] * H), int(frac[2] * W), int(frac[3] * H)))


def trim(im, pad=60):
    """Cut the empty card margin around a drawing (the card colour is read at its left edge)."""
    a = np.asarray(im.convert('RGB')).astype(int)
    bg = a[a.shape[0] // 2, 150]
    ys, xs = np.where(np.abs(a - bg).sum(2) > 40)
    if not len(xs):
        return im
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad),
                    min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))


def build_spaces():
    print('space sheets')
    manifest = {}
    allpages = list(range(1, 51))
    for sid, s in CFG['spaces'].items():
        d = f'{OUT}/spaces/{sid}'
        before_id, after_id = before_after(s['before_after'])
        save_webp(extract_object(before_id, [s['before_after']]), f'{d}/before.webp', width=1600)
        save_webp(extract_object(after_id, [s['before_after']]), f'{d}/after.webp', width=1600, q=88)
        entry = {'before': f'assets/spaces/{sid}/before.webp', 'after': f'assets/spaces/{sid}/after.webp'}
        if 'elevation' in s:
            entry['elevation'] = f'assets/spaces/{sid}/elevation.webp'
        for i, oid in enumerate(s.get('art', [])):
            save_webp(extract_object(oid, allpages), f'{d}/art-{i + 1}.webp', width=2000, q=86)
            entry.setdefault('art', []).append(f'assets/spaces/{sid}/art-{i + 1}.webp')
        if 'more' in s:  # "more views" sheet: keep only cards that hold a real picture
            for i, frac in enumerate(MORE_VIEWS):
                c = card(s['more'], (frac[0] + .008, frac[1] + .014, frac[2] - .008, frac[3] - .014), 216)  # inside the rounded corners
                if np.array(c.convert('L')).std() > 12:
                    save_webp(c, f'{d}/view-{i + 1}.webp', width=1800)
                    entry.setdefault('views', []).append(f'assets/spaces/{sid}/view-{i + 1}.webp')
        manifest[sid] = entry
    for name, oid in CFG['images'].items():
        save_webp(extract_object(oid, allpages), f'{OUT}/refs/{name}.webp', width=1400)
    write_manifest(manifest)


def write_manifest(spaces):
    """data/assets.js: which pictures exist, and where the plan sits on the deck sheet."""
    frame = json.load(open(f'{OUT}/map/frame.json'))
    body = json.dumps({'frame': frame, 'spaces': spaces}, indent=1)
    open(os.path.join(SITE, 'data', 'assets.js'), 'w').write(
        '/* Written by tools/build_assets.py. Do not edit by hand. */\nwindow.UNION_ASSETS = ' + body + ';\n')


if __name__ == '__main__':
    what = sys.argv[1:] or ['map', 'changed', 'spaces']
    try:
        if 'map' in what: build_map()
        if 'changed' in what: build_changed()
        if 'spaces' in what: build_spaces()
        if 'spaces' in what or 'elevations' in what: build_elevations()
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
