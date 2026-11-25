"""Draws the Jellyflix icon: a cute jellyfish hugging a play button. Run: python3 make-icon.py (needs Pillow).
Writes jellyflix.png (512 px) and jellyflix.ico (16 to 256 px) next to it."""
import math
from PIL import Image, ImageDraw, ImageFilter

S = 4                      # drawn four times too big, then shrunk, for smooth edges
N = 512 * S

def px(v): return int(round(v * S))
def bez(p0, p1, p2, p3, n=60):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append((u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0], u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]))
    return out

def layer(): return Image.new("RGBA", (N, N), (0, 0, 0, 0))
def stroke(img, pts, width, color):
    d = ImageDraw.Draw(img)
    r = width / 2
    for (x, y) in pts: d.ellipse([px(x - r), px(y - r), px(x + r), px(y + r)], fill=color)
    for a, b in zip(pts, pts[1:]): d.line([(px(a[0]), px(a[1])), (px(b[0]), px(b[1]))], fill=color, width=px(width))
def ell(img, cx, cy, rx, ry, color):
    ImageDraw.Draw(img).ellipse([px(cx - rx), px(cy - ry), px(cx + rx), px(cy + ry)], fill=color)
def over(base, top): return Image.alpha_composite(base, top)
def blur(img, r): return img.filter(ImageFilter.GaussianBlur(px(r)))

# background: a rounded square fading from violet to pink
bg = Image.new("RGBA", (N, N))
top, bottom = (70, 44, 214), (255, 96, 160)
for y in range(N):
    t = y / (N - 1)
    c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,)
    ImageDraw.Draw(bg).line([(0, y), (N, y)], fill=c)
mask = Image.new("L", (N, N), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, N - 1, N - 1], radius=px(112), fill=255)
img = Image.new("RGBA", (N, N), (0, 0, 0, 0)); img.paste(bg, (0, 0), mask)

# a soft glow behind everything
g = layer(); ell(g, 256, 230, 190, 190, (255, 255, 255, 38)); img = over(img, blur(g, 30))

PINK, PINK_D, PINK_L = (255, 158, 210, 255), (240, 120, 190, 255), (255, 224, 244, 255)

# thin tentacles behind the button, swaying
back = layer()
for x0, phase in ((214, 0.0), (256, 1.6), (298, 3.1)):
    pts = [(x0 + 9 * math.sin(phase + (y - 236) / 22), y) for y in range(236, 452, 4)]
    stroke(back, pts, 15, PINK_D)
img = over(img, back)

# the play button, with a soft shadow
sh = layer(); ell(sh, 256, 352, 88, 88, (30, 10, 70, 110)); img = over(img, blur(sh, 8))
btn = layer(); ell(btn, 256, 338, 88, 88, (255, 255, 255, 255)); img = over(img, btn)
tri = layer()
ImageDraw.Draw(tri).polygon([(px(233), px(296)), (px(233), px(380)), (px(307), px(338))], fill=(255, 64, 108, 255))
for (x, y) in ((233, 296), (233, 380), (307, 338)): ell(tri, x, y, 0.1, 0.1, (255, 64, 108, 255))
stroke(tri, [(233, 296), (233, 380), (307, 338), (233, 296)], 14, (255, 64, 108, 255))
img = over(img, tri)

# the bell
bell = layer()
ell(bell, 256, 170, 124, 112, PINK_L)                                  # the dome
ImageDraw.Draw(bell).rectangle([px(132), px(170), px(380), px(228)], fill=PINK_L)
for i in range(7):                                                       # a scalloped rim
    ell(bell, 156 + i * 33.3, 226, 19, 19, PINK_L)
shade = layer(); ell(shade, 256, 250, 150, 70, (255, 150, 205, 120))
shade = Image.composite(shade, layer(), bell.split()[3])                 # shading only where there is bell
img = over(img, bell); img = over(img, shade)
hi = layer(); ell(hi, 204, 112, 34, 15, (255, 255, 255, 190)); img = over(img, hi)

# the arms: wrapped round the button and curling over its lower edge
arms = layer()
for side in (-1, 1):
    cx = 256
    a = bez((cx + side * 82, 236), (cx + side * 150, 296), (cx + side * 150, 380), (cx + side * 84, 402))
    b = bez((cx + side * 84, 402), (cx + side * 54, 412), (cx + side * 30, 404), (cx + side * 22, 390), 20)
    stroke(arms, a + b, 19, PINK)
    ell(arms, cx + side * 22, 390, 13, 13, PINK_L)                       # a little hand
img = over(img, arms)

# the face
face = layer()
for ex in (220, 292):
    ell(face, ex, 166, 15, 20, (44, 24, 84, 255)); ell(face, ex + 5, 158, 6, 6, (255, 255, 255, 255)); ell(face, ex - 4, 174, 2.6, 2.6, (255, 255, 255, 200))
for cx in (186, 326): ell(face, cx, 200, 17, 11, (255, 100, 150, 150))
stroke(face, bez((238, 196), (248, 212), (264, 212), (274, 196), 24), 6, (44, 24, 84, 255))
img = over(img, face)

# two sparkles
for (x, y, r) in ((92, 104, 15), (420, 150, 11), (110, 330, 9)):
    sp = layer(); d = ImageDraw.Draw(sp)
    d.polygon([(px(x), px(y - r)), (px(x + r * .28), px(y - r * .28)), (px(x + r), px(y)), (px(x + r * .28), px(y + r * .28)),
               (px(x), px(y + r)), (px(x - r * .28), px(y + r * .28)), (px(x - r), px(y)), (px(x - r * .28), px(y - r * .28))], fill=(255, 255, 255, 235))
    img = over(img, sp)

out = img.resize((512, 512), Image.LANCZOS)
out.save("jellyflix.png")
out.save("jellyflix.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("written")
