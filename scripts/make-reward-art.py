#!/usr/bin/env python3
"""Press the pictures a game gives at about 60% of its trophies down to the machine's sixteen colours: assets/rewards/<id>.png.

    python3 scripts/make-reward-art.py 00=00.png 01=01_swapped_places.png ...

Each picture keeps its own shape, is scaled to 640 pixels wide, nudged a little (colour, contrast, a little sharpening) and
dithered with Floyd-Steinberg onto VGA16 -- the exact sixteen of kernel/god.js (scripts/vga_dither.py, shared with the blackout's
pictures and the credits' portraits) -- then saved as an indexed PNG. Which picture belongs to which game, and what each is
called, is kernel/trophy_pictures.js. Needs Pillow and numpy; the machine itself never runs this.
"""
import os, sys
from PIL import Image, ImageEnhance, ImageFilter
from vga_dither import dither, save_indexed

WIDTH, SAT, CON, BRI = 640, 1.25, 1.15, 1.08

def make(name, src, out_dir):
    im = Image.open(src).convert('RGB')
    h = round(WIDTH * im.height / im.width)
    im = im.resize((WIDTH, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
    im = ImageEnhance.Brightness(ImageEnhance.Contrast(ImageEnhance.Color(im).enhance(SAT)).enhance(CON)).enhance(BRI)
    path = os.path.join(out_dir, name + '.png')
    save_indexed(dither(im), path)
    print(path, (WIDTH, h), os.path.getsize(path), 'bytes')

if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'rewards')
    os.makedirs(out_dir, exist_ok=True)
    for arg in sys.argv[1:]:
        name, _, src = arg.partition('=')
        if not name or not src:
            sys.exit('usage: make-reward-art.py 00=photo.png ...')
        make(name, src, out_dir)
