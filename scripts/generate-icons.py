"""Regenerate the original SWaP camera/play icon. Optional tool: Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(__file__).resolve().parents[1] / 'extension' / 'icons'
out.mkdir(parents=True, exist_ok=True)
scale = 4
image = Image.new('RGBA', (128 * scale, 128 * scale))
d = ImageDraw.Draw(image)
def box(v): return tuple(round(x * scale) for x in v)
d.rounded_rectangle(box((2, 2, 126, 126)), radius=28 * scale, fill='#111113')
d.rounded_rectangle(box((23, 37, 81, 91)), radius=12 * scale, fill='#f4f4f5')
d.polygon([box(p) for p in [(85, 51), (107, 39), (107, 89), (85, 77)]], fill='#d5f88a')
d.polygon([box(p) for p in [(44, 49), (44, 79), (66, 64)]], fill='#172011')
for size in (16, 32, 48, 128):
    if size == 128:
        # Web Store square artwork: 96px with 16px transparent padding.
        icon = Image.new('RGBA', (128, 128))
        artwork = image.crop(box((2, 2, 126, 126))).resize((96, 96), Image.Resampling.LANCZOS)
        icon.paste(artwork, (16, 16))
    else:
        icon = image.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(out / f'icon{size}.png', optimize=True)
print('Generated 16, 32, 48 and 128px extension icons.')
