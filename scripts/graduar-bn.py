"""Gradúa las fotos del sitio a blanco y negro documental.

Lee las originales en color, aplica por foto (scripts/bn-ajustes.json):
mezcla de canales -> puntos negro/blanco -> contraste alrededor de 128,
y guarda JPG q92 (lado largo <= 2400 px, sin agrandar) en src/assets/fotos/bn/
como RGB con los tres canales iguales.

El disco «Soy Uruguayo» se copia en color a src/assets/fotos/.

Los retratos usan las fuentes de mayor resolución de musicos/Nueva carpeta/
(carpeta fuera de git); si no están, caen a las de fotos/. Lo reproducible
es el resultado commiteado en src/assets/fotos/.

Uso: python scripts/graduar-bn.py
"""

import json
import shutil
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
SALIDA_BN = RAIZ / "src" / "assets" / "fotos" / "bn"
SALIDA_COLOR = RAIZ / "src" / "assets" / "fotos"
AJUSTES = Path(__file__).resolve().parent / "bn-ajustes.json"

LADO_MAX = 2400
CALIDAD = 92
DEFAULT = {"mezcla": [0.30, 0.59, 0.11], "contraste": 1.25, "negro": 12, "blanco": 245}

HD = RAIZ / "musicos" / "Nueva carpeta"
RETRATOS_HD = {
    "guillermo-perez": "Guillermo Pérez Bajo.jpg",
    "marcelo-marrero": "Marcelo Marrero - Primera Voz Segunda Guitarra.jpeg",
    "fernando-saavedra": "Fernando Saavedra - Primera Guitarra Segunda Voz.jpeg",
    "henry-acuna": "Henry Acuña Acordeon y Teclados.jpg",
    "diego-rodriguez": "Diego Rodriguez Bateria - Percusión.jpeg",
}


def fuentes():
    """slug -> ruta de la original en color."""
    rutas = {
        "portada": RAIZ / "fotos" / "portada-hd.jpg",
        "hero-franja": RAIZ / "fotos" / "hero-franja.jpg",
        "acordeon": RAIZ / "fotos" / "acordeon.jpg",
    }
    for n in range(1, 10):
        rutas[f"g{n}"] = RAIZ / "fotos" / "gal" / f"g{n}.jpg"
    for slug, nombre in RETRATOS_HD.items():
        hd = HD / nombre
        rutas[slug] = hd if hd.exists() else RAIZ / "fotos" / f"{slug}.jpg"
    return rutas


def curva(negro, blanco, contraste):
    """LUT de 256 valores: niveles negro/blanco y luego contraste alrededor de 128."""
    lut = []
    for v in range(256):
        x = (v - negro) * 255 / (blanco - negro)
        x = (x - 128) * contraste + 128
        lut.append(max(0, min(255, round(x))))
    return lut


def abrir(ruta):
    im = ImageOps.exif_transpose(Image.open(ruta)).convert("RGB")
    if max(im.size) > LADO_MAX:
        im.thumbnail((LADO_MAX, LADO_MAX), Image.LANCZOS)
    return im


def graduar(im, ajuste):
    r, g, b = ajuste["mezcla"]
    total = r + g + b  # normaliza para conservar la exposición al bajar un canal
    gris = im.convert("L", (r / total, g / total, b / total, 0))
    gris = gris.point(curva(ajuste["negro"], ajuste["blanco"], ajuste["contraste"]))
    return Image.merge("RGB", (gris, gris, gris))


def main():
    ajustes = json.loads(AJUSTES.read_text(encoding="utf-8"))
    SALIDA_BN.mkdir(parents=True, exist_ok=True)

    for slug, ruta in fuentes().items():
        ajuste = {**DEFAULT, **ajustes.get(slug, {})}
        salida = SALIDA_BN / f"{slug}.jpg"
        graduar(abrir(ruta), ajuste).save(salida, "JPEG", quality=CALIDAD, optimize=True, progressive=True)
        print(f"{slug:18} <- {ruta.relative_to(RAIZ)}")

    disco = RAIZ / "fotos" / "disco-soy-uruguayo.jpg"
    shutil.copyfile(disco, SALIDA_COLOR / "disco-soy-uruguayo.jpg")
    print(f"{'disco-soy-uruguayo':18} <- {disco.relative_to(RAIZ)} (color)")


if __name__ == "__main__":
    main()
