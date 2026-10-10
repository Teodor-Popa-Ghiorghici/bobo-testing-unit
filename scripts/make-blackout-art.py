#!/usr/bin/env python3
"""Press a photograph down to the machine's sixteen colours: assets/blackout/<name>.png.

    python3 scripts/make-blackout-art.py park=chickens.jpg city=bridge.jpg boulder=wall.jpg \
        cd=discs.jpg turtle=turtle.jpg lol=league.jpg ultrakill=corridor.jpg posers=five.jpg

Each picture is cropped, scaled to 320 pixels wide, nudged (colour, contrast, a little
sharpening) and dithered with Floyd-Steinberg onto VGA16 -- the exact sixteen of
kernel/god.js -- then saved as an indexed PNG. The kernel never resamples it, only moves
it by whole rows (kernel/blackout_photo.js, where each picture's pan range lives).
Needs Pillow and numpy; the machine itself never runs this. The crop boxes below are in
pixels of the ORIGINAL photographs, so a different photo needs its own box.
"""
import os, sys
from PIL import Image, ImageEnhance, ImageFilter
from vga_dither import dither, save_indexed

# name: (crop box in the original or None, height at 320 wide, saturation, contrast, brightness)
JOBS = {
    'park':    (None,                 240, 1.25, 1.15, 1.00),
    'boulder': ((0, 250, 1179, 1250), 271, 1.30, 1.18, 1.05),
    'cd':      ((0, 430, 2352, 1760), 181, 1.20, 1.12, 1.00),
    'turtle':  ((30, 165, 474, 415),  180, 1.25, 1.15, 1.00),
    'lol':     (None,                 180, 1.35, 1.25, 1.45),
    'city':    ((0, 330, 900, 940),   217, 1.25, 1.20, 1.15),
    'ultrakill': (None,               180, 1.35, 1.25, 1.15),
    # the newer pictures (scene ids as kernel/blackout.js lists them): their own shape
    'posers':    (None, 0, 1.30, 1.20, 1.05), 'penguin': (None, 0, 1.30, 1.20, 1.05), 'shard': (None, 0, 1.25, 1.20, 1.00),
    'stargazing': (None, 0, 1.25, 1.15, 1.05), 'lake': (None, 0, 1.25, 1.15, 1.05), 'mosaic': (None, 0, 1.40, 1.25, 1.00),
    'bedroom':   (None, 0, 1.35, 1.20, 1.05), 'stairs': (None, 0, 1.20, 1.15, 1.15), 'lawn': (None, 0, 1.35, 1.20, 1.05),
    'hill':      (None, 0, 1.25, 1.15, 1.05), 'temple': (None, 0, 1.30, 1.20, 1.00), 'poster': (None, 0, 1.30, 1.20, 1.00),
    'glitter':   (None, 0, 1.30, 1.20, 1.10), 'chaos': (None, 0, 1.15, 1.25, 1.10), 'meow': (None, 0, 1.30, 1.25, 1.20),
    'grin':      (None, 0, 1.00, 1.30, 1.10), 'boot': (None, 0, 1.35, 1.20, 1.05), 'halo': (None, 0, 1.00, 1.35, 1.05),
    'aurora':    (None, 0, 1.35, 1.25, 1.05), 'axe': (None, 0, 1.15, 1.20, 1.05), 'pond': (None, 0, 1.20, 1.15, 1.05),
    # the eight after those: a man and his new monitor, a box of mints, a phone call, the temple's own crest, a bow tie, a kitten, a very tall bear and a lab coat
    'monitor':   (None, 0, 1.15, 1.20, 1.10), 'tictac': (None, 0, 1.15, 1.20, 1.05), 'phone': (None, 0, 1.10, 1.25, 1.10),
    'crest':     (None, 0, 1.00, 1.05, 1.00), 'domnule': (None, 0, 1.20, 1.20, 1.10), 'kitten': (None, 0, 1.15, 1.25, 1.10),
    'bear':      (None, 0, 1.30, 1.20, 1.05), 'labcoat': (None, 0, 1.05, 1.30, 1.15),
}

def make(name, src, out_dir):
    box, h, sat, con, bri = JOBS[name]
    im = Image.open(src).convert('RGB')
    if box:
        im = im.crop(box)
    if not h:                                                  # 0: keep the picture's own shape, 320 wide
        h = round(320 * im.height / im.width)
    im = im.resize((320, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=90, threshold=2))
    im = ImageEnhance.Brightness(ImageEnhance.Contrast(ImageEnhance.Color(im).enhance(sat)).enhance(con)).enhance(bri)
    path = os.path.join(out_dir, name + '.png')
    save_indexed(dither(im), path)
    print(path, (320, h), os.path.getsize(path), 'bytes')

if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'blackout')
    os.makedirs(out_dir, exist_ok=True)
    for arg in sys.argv[1:]:
        name, _, src = arg.partition('=')
        if name not in JOBS or not src:
            sys.exit('usage: make-blackout-art.py name=photo.jpg ...   (names: ' + ', '.join(JOBS) + ')')
        make(name, src, out_dir)
