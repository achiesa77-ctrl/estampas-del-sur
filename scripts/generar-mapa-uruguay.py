"""Genera el `d` del contorno de Uruguay para src/components/MapaUruguay.astro
(spec §2.4 "mapa pirograbado", Tarea 11).

Fuente: Natural Earth 1:50m admin-0 countries (dominio público), feature
ADMIN == "Uruguay". Este script NO commitea el GeoJSON (pesa ~3 MB); lo
descarga a un archivo temporal, lo proyecta, simplifica el contorno con
Douglas-Peucker y escribe el `d` + las coordenadas del punto de Pando listas
para pegar en el componente. Se vuelve a correr sólo si cambia el contorno
elegido (viewBox, cantidad de puntos, etc.).

Proyección: equirectangular con corrección cos(lat) (adecuada para una
extensión tan chica como un país: ningún shapefile-grade library hace falta).
lat0 = latitud media del contorno; escala elegida para que el mapa entre en
el viewBox con un margen fijo.

Uso:
    python scripts/generar-mapa-uruguay.py
Requiere conexión a internet (o un GeoJSON ya descargado en --geojson).
"""

import argparse
import json
import math
import urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"
PANDO = (-34.717, -55.958)  # (lat, lon), dato del brief
MARGEN = 10  # unidades de viewBox
ALTO = 600  # unidades de viewBox (ancho se deriva de la relación real)
OBJETIVO_PUNTOS = 90  # dentro del rango pedido (~60-120)


def descargar(destino: Path) -> None:
    print(f"Descargando {URL} ...")
    with urllib.request.urlopen(URL, timeout=60) as resp:
        destino.write_bytes(resp.read())


def extraer_uruguay(geojson_path: Path) -> list[tuple[float, float]]:
    data = json.loads(geojson_path.read_text(encoding="utf-8"))
    (feature,) = [f for f in data["features"] if f["properties"].get("ADMIN") == "Uruguay"]
    geom = feature["geometry"]
    if geom["type"] == "Polygon":
        anillo = geom["coordinates"][0]
    elif geom["type"] == "MultiPolygon":
        # Si algún día el dataset trae islas como polígonos separados, se
        # usa el anillo de mayor área (el contorno continental).
        anillos = [p[0] for p in geom["coordinates"]]
        anillo = max(anillos, key=lambda a: abs(area_poligono(a)))
    else:
        raise ValueError(f"Geometría inesperada: {geom['type']}")
    # GeoJSON trae [lon, lat]; se devuelve (lon, lat) tal cual.
    return [(lon, lat) for lon, lat in anillo]


def area_poligono(anillo: list[list[float]]) -> float:
    s = 0.0
    for i in range(len(anillo)):
        x1, y1 = anillo[i]
        x2, y2 = anillo[(i + 1) % len(anillo)]
        s += x1 * y2 - x2 * y1
    return s / 2


def rdp(puntos: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    """Ramer-Douglas-Peucker sobre una polilínea abierta (sin cerrar)."""
    if len(puntos) < 3:
        return puntos[:]

    def distancia_punto_segmento(p, a, b):
        (px, py), (ax, ay), (bx, by) = p, a, b
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return math.hypot(px - ax, py - ay)
        t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
        t = max(0, min(1, t))
        cx, cy = ax + t * dx, ay + t * dy
        return math.hypot(px - cx, py - cy)

    dmax, idx = 0.0, 0
    for i in range(1, len(puntos) - 1):
        d = distancia_punto_segmento(puntos[i], puntos[0], puntos[-1])
        if d > dmax:
            dmax, idx = d, i

    if dmax > epsilon:
        izq = rdp(puntos[: idx + 1], epsilon)
        der = rdp(puntos[idx:], epsilon)
        return izq[:-1] + der
    return [puntos[0], puntos[-1]]


def simplificar_a_objetivo(anillo: list[tuple[float, float]], objetivo: int) -> list[tuple[float, float]]:
    # El anillo de Natural Earth viene cerrado (primer punto == último); se
    # trabaja abierto y se vuelve a cerrar al final.
    abierto = anillo[:-1] if anillo[0] == anillo[-1] else anillo[:]
    lo, hi = 0.0, 1.0  # epsilon en grados
    resultado = abierto
    for _ in range(40):
        eps = (lo + hi) / 2
        simplificado = rdp(abierto, eps)
        if len(simplificado) > objetivo:
            lo = eps
        else:
            hi = eps
            resultado = simplificado
        if abs(len(simplificado) - objetivo) <= 3:
            resultado = simplificado
            break
    return resultado


def proyectar(lon: float, lat: float, lon0: float, lat0: float, escala: float, ox: float, oy: float):
    x = (lon - lon0) * math.cos(math.radians(lat0)) * escala + ox
    y = -(lat - lat0) * escala + oy  # -lat: en SVG "y" crece hacia abajo
    return x, y


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geojson", type=Path, default=None, help="GeoJSON ya descargado (si no, se baja)")
    args = parser.parse_args()

    tmp = args.geojson or Path(__file__).resolve().parent.parent / ".cache-ne-countries.geojson"
    if not tmp.exists():
        descargar(tmp)

    anillo = extraer_uruguay(tmp)
    simple = simplificar_a_objetivo(anillo, OBJETIVO_PUNTOS)
    print(f"Puntos: original={len(anillo)} simplificado={len(simple)}")

    lons = [p[0] for p in simple]
    lats = [p[1] for p in simple]
    lon0 = (min(lons) + max(lons)) / 2
    lat0 = (min(lats) + max(lats)) / 2

    # Escala provisoria con lon0/lat0 para medir el bbox proyectado.
    cos_lat0 = math.cos(math.radians(lat0))
    xs_crudo = [(lon - lon0) * cos_lat0 for lon in lons]
    ys_crudo = [-(lat - lat0) for lat in lats]
    ancho_crudo = max(xs_crudo) - min(xs_crudo)
    alto_crudo = max(ys_crudo) - min(ys_crudo)

    alto_util = ALTO - 2 * MARGEN
    escala = alto_util / alto_crudo
    ancho_total = ancho_crudo * escala + 2 * MARGEN
    ox = MARGEN - min(xs_crudo) * escala
    oy = MARGEN - min(ys_crudo) * escala

    puntos_svg = [proyectar(lon, lat, lon0, lat0, escala, ox, oy) for lon, lat in simple]

    d = "M " + " L ".join(f"{x:.2f} {y:.2f}" for x, y in puntos_svg) + " Z"

    pando_lat, pando_lon = PANDO
    pando_x, pando_y = proyectar(pando_lon, pando_lat, lon0, lat0, escala, ox, oy)

    print()
    print(f'viewBox="0 0 {ancho_total:.2f} {ALTO}"')
    print()
    print("d =", json.dumps(d))
    print()
    print(f'Pando: cx={pando_x:.2f} cy={pando_y:.2f}')


if __name__ == "__main__":
    main()
