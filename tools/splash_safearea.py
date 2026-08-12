# Rimpicciolisce il contenuto delle splash sorgente lasciando margini di sicurezza.
#
# Perche': la scritta "ASHFALL" occupava l'84% della larghezza della splash
# verticale generata (1280x1920). Su uno schermo 20:9 il ritaglio necessario per
# riempirlo mostra solo il 67% della larghezza dell'immagine, quindi la prima e
# l'ultima lettera finivano sotto il bordo dello schermo. Segnalato dai tester
# del test chiuso su Galaxy A03s.
#
# La sorgente e' quadrata (2732x2732) e capacitor-assets la ritaglia al centro
# per ottenere 2:3 (verticale) e 3:2 (orizzontale): la larghezza utile in
# verticale e' gia' solo il 66.7% del quadrato. Rimpicciolendo il contenuto al
# 65% e riempiendo il resto col colore di fondo, la scritta scende sotto il 55%
# della larghezza verticale e resta intera anche a 21:9.
#
# Uso:  python tools/splash_safearea.py
# Poi:  npx capacitor-assets generate --android --ios
from PIL import Image
import os

SCALE = 0.65
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

for name in ('splash.png', 'splash-dark.png'):
    path = os.path.join(HERE, 'assets', name)
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert('RGB')
    w, h = im.size
    bg = im.getpixel((0, 0))                      # angolo: il colore di fondo
    small = im.resize((int(w * SCALE), int(h * SCALE)), Image.LANCZOS)
    out = Image.new('RGB', (w, h), bg)
    out.paste(small, ((w - small.width) // 2, (h - small.height) // 2))
    out.save(path)
    print('%s  %dx%d  contenuto al %d%%  fondo %s' % (name, w, h, SCALE * 100, bg))
