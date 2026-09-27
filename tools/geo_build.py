#!/usr/bin/env python3
"""СМОГ: сборка компактной геометрии центра Алматы для сцен 'city' / 'city_drive'.

Вход:  assets/geo/source-city-local.json  (ODbL, © OpenStreetMap contributors; github.com/farhat2222s/almaty60)
Выход: assets/geo/almaty.json

Координаты: локальные метры, x — восток, z — юг (как в three.js: x=east, z=south, y=up), округление 0.1 м.
Кроме исходных объектов OSM здесь же заранее считаются производные данные (чтобы не делать тяжёлую геометрию в браузере):
перекрёстки (зоны без разметки/бордюров), пешеходные переходы (пересечения тротуаров с дорогами), цепочки улиц
для трафика, светофоры, деревья вдоль улиц/в парках/во дворах, фонари, места парковки на тротуарах.
Все производные объекты — процедурные (детерминированный ГПСЧ), не данные OSM.
Названия: в выход попадают только названия улиц (подписи миникарты, логика трафика) и только в русской форме;
названия зданий/парков (магазины, банки, бренды) не сохраняются.
Запуск: python3 tools/geo_build.py
"""
import json, math, os, random, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/geo/source-city-local.json')
OUT = os.path.join(ROOT, 'assets/geo/almaty.json')

R1 = lambda v: round(v, 1)
LANE_W = 3.25

# road classes: 0 secondary, 1 tertiary, 2 residential, 3 living_street/unclassified, 4 service, 5 pedestrian
RCLS = {'primary': 0, 'secondary': 0, 'secondary_link': 0, 'tertiary': 1, 'tertiary_link': 1, 'residential': 2,
        'unclassified': 3, 'living_street': 3, 'service': 4, 'pedestrian': 5}
# footway classes: 0 footway, 1 cycleway, 2 steps, 3 path/corridor
FCLS = {'footway': 0, 'cycleway': 1, 'steps': 2, 'path': 3, 'corridor': 3}
# building kind codes
BK = {'yes': 0, 'apartments': 1, 'retail': 2, 'commercial': 3, 'office': 4, 'roof': 5, 'school': 6, 'university': 6, 'college': 6,
      'kindergarten': 6, 'hotel': 7, 'construction': 8, 'hospital': 9, 'dormitory': 1, 'garages': 10, 'garage': 10, 'service': 10,
      'church': 11, 'public': 4, 'house': 12}


def seg_dist2(px, pz, ax, az, bx, bz):
    ex, ez = bx - ax, bz - az
    L = ex * ex + ez * ez
    u = 0.0 if L < 1e-12 else max(0.0, min(1.0, ((px - ax) * ex + (pz - az) * ez) / L))
    qx, qz = ax + ex * u, az + ez * u
    return (px - qx) ** 2 + (pz - qz) ** 2, u


def pip(px, pz, pts):
    ins = False
    n = len(pts)
    j = n - 1
    for i in range(n):
        xi, zi = pts[i]
        xj, zj = pts[j]
        if (zi > pz) != (zj > pz) and px < (xj - xi) * (pz - zi) / (zj - zi + 1e-12) + xi:
            ins = not ins
        j = i
    return ins


def seg_x(a, b, c, d):
    """segment intersection a-b with c-d -> (t,u) or None"""
    rx, rz = b[0] - a[0], b[1] - a[1]
    sx, sz = d[0] - c[0], d[1] - c[1]
    den = rx * sz - rz * sx
    if abs(den) < 1e-9:
        return None
    qx, qz = c[0] - a[0], c[1] - a[1]
    t = (qx * sz - qz * sx) / den
    u = (qx * rz - qz * rx) / den
    if 0 <= t <= 1 and 0 <= u <= 1:
        return t, u
    return None


def simplify(pts, eps):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop()
        best, bi = 0, -1
        for i in range(a + 1, b):
            d, _ = seg_dist2(pts[i][0], pts[i][1], pts[a][0], pts[a][1], pts[b][0], pts[b][1])
            if d > best:
                best, bi = d, i
        if best > eps * eps and bi > 0:
            keep[bi] = True
            st.append((a, bi))
            st.append((bi, b))
    return [p for p, k in zip(pts, keep) if k]


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x0, z0 = pts[i]
        x1, z1 = pts[(i + 1) % len(pts)]
        s += x0 * z1 - x1 * z0
    return s / 2


class Grid:
    def __init__(self, cell=25.0):
        self.c = cell
        self.m = collections.defaultdict(list)

    def add_box(self, x0, z0, x1, z1, item):
        c = self.c
        for gx in range(int(math.floor(x0 / c)), int(math.floor(x1 / c)) + 1):
            for gz in range(int(math.floor(z0 / c)), int(math.floor(z1 / c)) + 1):
                self.m[(gx, gz)].append(item)

    def query(self, x, z, r=0.0):
        c = self.c
        out = []
        seen = set()
        for gx in range(int(math.floor((x - r) / c)), int(math.floor((x + r) / c)) + 1):
            for gz in range(int(math.floor((z - r) / c)), int(math.floor((z + r) / c)) + 1):
                for it in self.m.get((gx, gz), ()):
                    if id(it) not in seen:
                        seen.add(id(it))
                        out.append(it)
        return out


def main():
    src = json.load(open(SRC, encoding='utf-8'))
    B = src['bounds']
    feats = src['features']
    names = []
    nidx = {}

    def name_id(n):
        if not n:
            return -1
        if n not in nidx:
            nidx[n] = len(names)
            names.append(n)
        return nidx[n]

    buildings, roads, foot, greens, plazas = [], [], [], [], []
    poi = collections.defaultdict(list)
    for f in feats:
        p = f['properties']
        k = p['kind']
        g = f['geometry']
        t = p.get('tags', {})
        if k == 'building':
            ring = [tuple(c) for c in g['coordinates'][0]]
            if len(ring) > 1 and ring[0] == ring[-1]:
                ring = ring[:-1]
            ring = simplify(ring + [ring[0]], 0.2)[:-1]
            if len(ring) < 3 or abs(area(ring)) < 2:
                continue
            if area(ring) < 0:
                ring = ring[::-1]
            h = float(p.get('heightMeters') or 9)
            lv = t.get('building:levels')
            try:
                lv = int(float(str(lv).split(';')[0]))
            except Exception:
                lv = 0
            kind = BK.get(t.get('building'), 0)
            if t.get('amenity') == 'place_of_worship':
                kind = 11
            flags = 0
            if t.get('tourism') == 'attraction' or t.get('historic'):
                flags |= 1
            if p.get('heightSource', '').startswith('visual-default'):
                flags |= 2
            if t.get('shop') or t.get('amenity') in ('cafe', 'restaurant', 'fast_food', 'bank', 'pharmacy', 'bar', 'pub'):
                flags |= 4
            buildings.append({'id': p['osmId'], 'pts': ring, 'h': h, 'lv': lv, 'k': kind, 'f': flags, 'n': name_id(p.get('name'))})
        elif k == 'road':
            hw = t.get('highway')
            lines = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
            for ln in lines:
                pts = [tuple(c) for c in ln]
                if hw in RCLS:
                    cls = RCLS[hw]
                    lanes = t.get('lanes')
                    try:
                        lanes = int(str(lanes).split(';')[0])
                    except Exception:
                        lanes = 0
                    ow = 1 if t.get('oneway') in ('yes', 'true', '1') else (-1 if t.get('oneway') == '-1' else 0)
                    if ow == -1:
                        pts = pts[::-1]
                        ow = 1
                    if cls == 0:
                        if lanes <= 0:
                            lanes = 2 if ow else 4
                        if ow and lanes < 2:
                            lanes = 2
                    elif cls == 1:
                        if lanes <= 0:
                            lanes = 2 if ow else 4
                    elif cls == 2:
                        if lanes <= 0:
                            lanes = 2
                    elif cls == 3:
                        lanes = max(1, min(lanes or 2, 2))
                    elif cls == 4:
                        lanes = 1
                    else:
                        lanes = 0
                    wtag = t.get('width')
                    try:
                        wv = float(str(wtag).replace('m', '').split(';')[0])
                    except Exception:
                        wv = 0
                    if cls <= 3:
                        w = lanes * LANE_W + 0.6
                        if wv and cls >= 2:
                            w = max(wv, 4.5)
                    elif cls == 4:
                        w = max(wv, 3.6) if wv else 4.2
                    else:
                        w = max(wv, 4) if wv else 6.0
                    pts = simplify(pts, 0.15)
                    roads.append({'id': p['osmId'], 'cls': cls, 'lanes': lanes, 'ow': ow, 'w': round(w, 2), 'n': name_id(p.get('name')), 'pts': pts})
                elif hw in FCLS:
                    cls = FCLS[hw]
                    wtag = t.get('width')
                    try:
                        wv = float(str(wtag).replace('m', '').split(';')[0])
                    except Exception:
                        wv = 0
                    w = wv if wv else (2.4 if cls == 0 else 2.0 if cls == 1 else 2.5 if cls == 2 else 1.6)
                    w = max(1.2, min(w, 6))
                    pav = 1 if t.get('surface') in ('paving_stones', 'sett', 'concrete:plates') else 0
                    pts = simplify(pts, 0.15)
                    foot.append({'cls': cls, 'w': w, 'pav': pav, 'pts': pts})
        elif k == 'green':
            ring = [tuple(c) for c in g['coordinates'][0]]
            if ring[0] == ring[-1]:
                ring = ring[:-1]
            ring = simplify(ring + [ring[0]], 0.3)[:-1]
            if len(ring) < 3:
                continue
            if area(ring) < 0:
                ring = ring[::-1]
            kind = 0 if t.get('landuse') == 'grass' else 1 if t.get('leisure') == 'park' else 2 if t.get('leisure') == 'playground' else 3
            greens.append({'k': kind, 'n': name_id(p.get('name')), 'pts': ring})
        elif k == 'plaza':
            ring = [tuple(c) for c in g['coordinates'][0]]
            if ring[0] == ring[-1]:
                ring = ring[:-1]
            if len(ring) < 3:
                continue
            if area(ring) < 0:
                ring = ring[::-1]
            plazas.append({'pts': ring, 'pav': 1 if t.get('surface') == 'paving_stones' else 0})
        elif k == 'poi':
            x, z = g['coordinates'][:2]
            a = t.get('amenity')
            if a == 'bench':
                poi['bench'].append((x, z))
            elif a in ('waste_basket', 'waste_disposal', 'recycling'):
                poi['bin'].append((x, z))
            elif a in ('cafe', 'restaurant', 'fast_food', 'bar', 'pub', 'ice_cream') or t.get('shop'):
                poi['shop'].append((x, z))
            elif t.get('leisure') == 'playground':
                poi['play'].append((x, z))
            elif t.get('tourism') == 'artwork':
                poi['art'].append((x, z))
            elif a in ('atm', 'payment_terminal', 'parcel_locker', 'bicycle_rental', 'charging_station'):
                poi['box'].append((x, z))

    rng = random.Random(2049)

    # ---------- spatial indices ----------
    bgrid = Grid(25)
    for b in buildings:
        xs = [p[0] for p in b['pts']]
        zs = [p[1] for p in b['pts']]
        b['bb'] = (min(xs), min(zs), max(xs), max(zs))
        bgrid.add_box(min(xs), min(zs), max(xs), max(zs), b)
    rgrid = Grid(25)
    main_roads = [r for r in roads if r['cls'] <= 4]
    for r in roads:
        for i in range(len(r['pts']) - 1):
            a, c = r['pts'][i], r['pts'][i + 1]
            seg = (a, c, r)
            rgrid.add_box(min(a[0], c[0]) - 1, min(a[1], c[1]) - 1, max(a[0], c[0]) + 1, max(a[1], c[1]) + 1, seg)
    fgrid = Grid(25)
    for fw in foot:
        for i in range(len(fw['pts']) - 1):
            a, c = fw['pts'][i], fw['pts'][i + 1]
            fgrid.add_box(min(a[0], c[0]) - 1, min(a[1], c[1]) - 1, max(a[0], c[0]) + 1, max(a[1], c[1]) + 1, (a, c, fw))

    def in_building(x, z, pad=0.0):
        for b in bgrid.query(x, z, pad + 1):
            x0, z0, x1, z1 = b['bb']
            if x < x0 - pad or x > x1 + pad or z < z0 - pad or z > z1 + pad:
                continue
            if pip(x, z, b['pts']):
                return True
            if pad > 0:
                P = b['pts']
                for i in range(len(P)):
                    d, _ = seg_dist2(x, z, P[i][0], P[i][1], P[(i + 1) % len(P)][0], P[(i + 1) % len(P)][1])
                    if d < pad * pad:
                        return True
        return False

    def near_road(x, z, extra=0.0, maxcls=5):
        for a, c, r in rgrid.query(x, z, 14):
            if r['cls'] > maxcls:
                continue
            d, _ = seg_dist2(x, z, a[0], a[1], c[0], c[1])
            lim = r['w'] / 2 + extra
            if d < lim * lim:
                return True
        return False

    def near_foot(x, z, extra=0.0):
        for a, c, fw in fgrid.query(x, z, 6):
            d, _ = seg_dist2(x, z, a[0], a[1], c[0], c[1])
            lim = fw['w'] / 2 + extra
            if d < lim * lim:
                return True
        return False

    # ---------- intersections: nodes shared by roads (cls<=4) ----------
    key = lambda p: (round(p[0], 1), round(p[1], 1))
    node_roads = collections.defaultdict(list)
    for ri, r in enumerate(main_roads):
        for pi, p in enumerate(r['pts']):
            node_roads[key(p)].append((ri, pi))
    inters = []  # [x,z,radius,signal]
    road_cuts = collections.defaultdict(list)  # road index -> list of (s0,s1)
    # cumulative lengths
    for r in main_roads:
        s = [0.0]
        for i in range(1, len(r['pts'])):
            s.append(s[-1] + math.hypot(r['pts'][i][0] - r['pts'][i - 1][0], r['pts'][i][1] - r['pts'][i - 1][1]))
        r['s'] = s
    sig_nodes = []
    for kk, lst in node_roads.items():
        ris = set(ri for ri, _ in lst)
        if len(ris) < 2:
            continue
        # skip plain continuation (two ways of same name, degree 2)
        nm = set(main_roads[ri]['n'] for ri in ris)
        deg = sum(1 if (pi == 0 or pi == len(main_roads[ri]['pts']) - 1) else 2 for ri, pi in lst)
        if len(nm) == 1 and deg <= 2 and all(main_roads[ri]['cls'] <= 3 for ri in ris):
            continue
        hws = {ri: main_roads[ri]['w'] / 2 for ri in ris}
        for ri, pi in lst:
            r = main_roads[ri]
            others = [hws[o] for o in ris if o != ri and main_roads[o]['n'] != r['n'] or (o != ri and main_roads[o]['cls'] == 4)]
            if not others:
                others = [hws[o] for o in ris if o != ri]
            d = max(others) + 1.2
            if r['cls'] == 4:
                d = max(others) + 0.5
            road_cuts[ri].append((R1(r['s'][pi] - d), R1(r['s'][pi] + d)))
        mains = [main_roads[ri] for ri in ris if main_roads[ri]['cls'] <= 2]
        names_main = set(r['n'] for r in mains if r['n'] >= 0)
        rad = max(hws.values())
        big = [r for r in mains if r['cls'] <= 1 or r['lanes'] >= 4]
        sig = 1 if (len(names_main) >= 2 and len(big) >= 2 and deg >= 3) else 0
        if len(ris) >= 2 and any(main_roads[ri]['cls'] <= 3 for ri in ris) and len(set(main_roads[ri]['n'] for ri in ris)) >= 2:
            inters.append([R1(kk[0]), R1(kk[1]), R1(rad), sig])
    for i, r in enumerate(main_roads):
        cuts = sorted(road_cuts.get(i, []))
        merged = []
        for a, b in cuts:
            if merged and a <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], b)
            else:
                merged.append([a, b])
        r['cuts'] = merged

    def in_cut(r, s, pad=0):
        for a, b in r['cuts']:
            if a - pad <= s <= b + pad:
                return True
        return False

    # ---------- crossings: footways crossing roads ----------
    crossings = []
    for fw in foot:
        if fw['cls'] not in (0, 1):
            continue
        P = fw['pts']
        for i in range(len(P) - 1):
            a, c = P[i], P[i + 1]
            for ra, rc, r in rgrid.query((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, math.hypot(c[0] - a[0], c[1] - a[1]) / 2 + 2):
                if r['cls'] > 2:
                    continue
                hit = seg_x(a, c, ra, rc)
                if not hit:
                    continue
                t, u = hit
                x, z = a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t
                rdx, rdz = rc[0] - ra[0], rc[1] - ra[1]
                fdx, fdz = c[0] - a[0], c[1] - a[1]
                ln1 = math.hypot(rdx, rdz) or 1
                ln2 = math.hypot(fdx, fdz) or 1
                cosang = abs((rdx * fdx + rdz * fdz) / ln1 / ln2)
                if cosang > 0.6:
                    continue
                if any((x - q[0]) ** 2 + (z - q[1]) ** 2 < 8 * 8 for q in crossings):
                    continue
                crossings.append([R1(x), R1(z), round(math.atan2(rdx, rdz), 3), R1(r['w'])])

    # ---------- chains of streets for traffic ----------
    by_name = collections.defaultdict(list)
    for ri, r in enumerate(main_roads):
        if r['cls'] <= 3 and r['n'] >= 0:
            by_name[r['n']].append(ri)
    chains = []
    for n, lst in by_name.items():
        used = set()
        ends = collections.defaultdict(list)
        for ri in lst:
            r = main_roads[ri]
            ends[key(r['pts'][0])].append((ri, 0))
            ends[key(r['pts'][-1])].append((ri, 1))

        def follow(ri, rev):
            r = main_roads[ri]
            pts = list(r['pts'][::-1] if rev else r['pts'])
            segs = [(ri, rev)]
            used.add(ri)
            while True:
                end = key(pts[-1])
                best, bang = None, 1e9
                dx0, dz0 = pts[-1][0] - pts[-2][0], pts[-1][1] - pts[-2][1]
                for rj, which in ends[end]:
                    if rj in used:
                        continue
                    r2 = main_roads[rj]
                    if r2['ow'] != r['ow']:
                        continue
                    if which == 1 and r2['ow']:
                        continue  # oneway must start here
                    q = r2['pts'] if which == 0 else r2['pts'][::-1]
                    dx1, dz1 = q[1][0] - q[0][0], q[1][1] - q[0][1]
                    ang = abs(math.atan2(dx0 * dz1 - dz0 * dx1, dx0 * dx1 + dz0 * dz1))
                    if ang < 0.7 and ang < bang:
                        best, bang = (rj, which, q), ang
                if not best:
                    break
                rj, which, q = best
                used.add(rj)
                segs.append((rj, which == 1))
                pts.extend(q[1:])
            return pts, segs

        # start from segments whose start has no predecessor
        order = sorted(lst, key=lambda ri: (main_roads[ri]['pts'][0][0] + main_roads[ri]['pts'][0][1]))
        for ri in order:
            if ri in used:
                continue
            r = main_roads[ri]
            # walk backwards to find chain start
            cur, rev = ri, False
            guard = 0
            while guard < 50:
                guard += 1
                st = key((main_roads[cur]['pts'][-1] if rev else main_roads[cur]['pts'][0]))
                prev = None
                for rj, which in ends[st]:
                    if rj == cur or rj in used:
                        continue
                    r2 = main_roads[rj]
                    if r2['ow'] != r['ow']:
                        continue
                    if r2['ow'] and which != 1:
                        continue
                    prev = (rj, which == 0 if not r2['ow'] else False)
                    break
                if not prev:
                    break
                if prev[0] == ri:
                    break
                cur, rev = prev
                if guard > 40:
                    break
            pts, segs = follow(cur, rev)
            L = sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))
            if L < 60:
                continue
            lanes = collections.Counter(main_roads[s[0]]['lanes'] for s in segs).most_common(1)[0][0]
            cls = min(main_roads[s[0]]['cls'] for s in segs)
            chains.append({'n': n, 'cls': cls, 'ow': r['ow'], 'lanes': lanes, 'pts': [(R1(p[0]), R1(p[1])) for p in pts]})

    # ---------- street trees / lamps / parking ----------
    trees = []  # x,z,type,scale
    tgrid = Grid(10)

    def in_plaza(x, z):
        for pl in plazas:
            P = pl['pts']
            xs = [q[0] for q in P]; zs = [q[1] for q in P]
            if min(xs) - 1 < x < max(xs) + 1 and min(zs) - 1 < z < max(zs) + 1 and pip(x, z, P):
                return True
        return False

    def tree_ok(x, z, sp):
        if in_plaza(x, z):
            return False
        for q in tgrid.query(x, z, sp):
            if (q[0] - x) ** 2 + (q[1] - z) ** 2 < sp * sp:
                return False
        return True

    def add_tree(x, z, ty, sc):
        q = [R1(x), R1(z), ty, int(round(sc * 10))]
        trees.append(q)
        tgrid.add_box(x, z, x, z, q)

    lamps = []  # x,z,ang,type
    parks = []  # x,z,heading
    lgrid = Grid(15)
    for r in main_roads:
        if r['cls'] > 3:
            continue
        P = r['pts']
        hw = r['w'] / 2
        big = r['cls'] <= 1
        street_sp = 7.0 if big else 8.0
        s_acc = rng.random() * 5
        lamp_acc = rng.random() * 20
        park_acc = rng.random() * 8
        for i in range(len(P) - 1):
            a, c = P[i], P[i + 1]
            L = math.hypot(c[0] - a[0], c[1] - a[1])
            if L < 0.5:
                continue
            dx, dz = (c[0] - a[0]) / L, (c[1] - a[1]) / L
            rx, rz = -dz, dx
            s0 = r['s'][i]
            u = s_acc
            while u < L:
                s = s0 + u
                if not in_cut(r, s, 4):
                    for side in (-1, 1):
                        off = hw + 3.2 + rng.uniform(-0.3, 0.3)
                        x = a[0] + dx * u + rx * off * side
                        z = a[1] + dz * u + rz * off * side
                        if rng.random() < 0.12:
                            continue
                        if near_road(x, z, 1.2, 4) or in_building(x, z, 2.0) or not tree_ok(x, z, 4.5):
                            continue
                        roll = rng.random()
                        ty = 0 if roll < 0.34 else 1 if roll < 0.52 else 2 if roll < 0.74 else 5 if roll < 0.9 else 3
                        sc = rng.uniform(0.85, 1.2) if ty != 3 else rng.uniform(0.7, 0.95)
                        add_tree(x, z, ty, sc)
                u += street_sp + rng.uniform(-1.5, 1.5)
            s_acc = u - L
            # lamps
            u = lamp_acc
            while u < L:
                s = s0 + u
                if not in_cut(r, s, 2):
                    sides = (-1, 1) if (big or r['lanes'] >= 4) else ((1,) if int(s / 30) % 2 else (-1,))
                    for side in sides:
                        off = hw + 0.7
                        x = a[0] + dx * u + rx * off * side
                        z = a[1] + dz * u + rz * off * side
                        if in_building(x, z, 0.5) or near_road(x, z, 0.3, 4):
                            continue
                        ang = math.atan2(-rx * side, -rz * side)  # facing road
                        lamps.append([R1(x), R1(z), round(ang, 2), 0])
                        lgrid.add_box(x, z, x, z, (x, z))
                u += 31.0
            lamp_acc = u - L
            # parking on sidewalks (Almaty: half on the curb or fully on the pavement)
            if r['cls'] in (1, 2, 3) or (r['cls'] == 0 and r['lanes'] <= 4):
                u = park_acc
                while u < L:
                    s = s0 + u
                    if not in_cut(r, s, 5) and rng.random() < 0.42:
                        side = 1 if rng.random() < 0.6 else -1
                        mode = rng.random()
                        if mode < 0.6:
                            off = hw + 0.6
                            hd = math.atan2(dx, dz) if side > 0 else math.atan2(-dx, -dz)
                        else:
                            off = hw + 2.2
                            hd = math.atan2(rx * side, rz * side) + rng.uniform(-0.25, 0.25)  # perpendicular, nose to building
                        x = a[0] + dx * u + rx * off * side
                        z = a[1] + dz * u + rz * off * side
                        if not in_building(x, z, 2.2) and not near_road(x, z, 0.2, 4):
                            parks.append([R1(x), R1(z), round(hd, 2), 0 if mode < 0.6 else 1])
                    u += 6.2 + rng.uniform(0, 1.5)
                park_acc = u - L

    # ---------- park / courtyard trees ----------
    for gi, gr in enumerate(greens):
        P = gr['pts']
        A = abs(area(P))
        if A < 60:
            continue
        xs = [p[0] for p in P]
        zs = [p[1] for p in P]
        dens = 1 / 70.0 if gr['k'] == 1 else 1 / 90.0 if gr['k'] == 0 else 1 / 160.0
        n = int(A * dens) + 1
        for _ in range(n * 3):
            if n <= 0:
                break
            x = rng.uniform(min(xs), max(xs))
            z = rng.uniform(min(zs), max(zs))
            if not pip(x, z, P):
                continue
            if near_foot(x, z, 1.6) or near_road(x, z, 1.5) or in_building(x, z, 2.5) or not tree_ok(x, z, 5.5):
                continue
            roll = rng.random()
            if gr['k'] == 1:
                ty = 4 if roll < 0.22 else 0 if roll < 0.55 else 2 if roll < 0.75 else 1 if roll < 0.88 else 5
            else:
                ty = 4 if roll < 0.12 else 0 if roll < 0.4 else 2 if roll < 0.6 else 5 if roll < 0.8 else 3
            sc = rng.uniform(0.8, 1.25)
            add_tree(x, z, ty, sc)
            n -= 1
    # courtyards: sparse random trees away from roads/buildings
    for _ in range(9000):
        x = rng.uniform(B['minX'], B['maxX'])
        z = rng.uniform(B['minZ'], B['maxZ'])
        if near_road(x, z, 5.0) or near_foot(x, z, 1.5) or in_building(x, z, 3.0) or not tree_ok(x, z, 9.0):
            continue
        roll = rng.random()
        ty = 0 if roll < 0.3 else 2 if roll < 0.5 else 5 if roll < 0.75 else 4 if roll < 0.85 else 3
        add_tree(x, z, ty, rng.uniform(0.75, 1.15))
    # park lamps along footways inside parks
    for fw in foot:
        P = fw['pts']
        acc = 0
        for i in range(len(P) - 1):
            a, c = P[i], P[i + 1]
            L = math.hypot(c[0] - a[0], c[1] - a[1])
            if L < 0.5:
                continue
            dx, dz = (c[0] - a[0]) / L, (c[1] - a[1]) / L
            u = acc
            while u < L:
                x = a[0] + dx * u - dz * (fw['w'] / 2 + 0.5)
                z = a[1] + dz * u + dx * (fw['w'] / 2 + 0.5)
                ing = any(pip(x, z, g['pts']) for g in greens if g['k'] == 1 and g['pts'][0][0] - 600 < x < g['pts'][0][0] + 600)
                if ing and not any((q[0] - x) ** 2 + (q[1] - z) ** 2 < 14 * 14 for q in lgrid.query(x, z, 14)):
                    lamps.append([R1(x), R1(z), round(math.atan2(dz, -dx), 2), 1])
                    lgrid.add_box(x, z, x, z, (x, z))
                u += 24
            acc = u - L

    # ---------- names: only street names are used (minimap labels, street logic) ----------
    # building/park names (shops, banks, brands) are not written; Kazakh-language forms are skipped (signage is Russian only)
    KZ = set('ӘәҒғҚқҢңӨөҰұҮүҺһІі')
    onames, omap = [], {}

    def oname(i):
        if i < 0 or any(ch in KZ for ch in names[i]):
            return -1
        if i not in omap:
            omap[i] = len(onames)
            onames.append(names[i])
        return omap[i]
    for r in roads:
        r['on'] = oname(r['n'])
    for c in chains:
        c['on'] = oname(c['n'])

    out = {
        'v': 1,
        'attribution': src.get('attribution', '© OpenStreetMap contributors'),
        'license': src.get('license', 'ODbL-1.0'),
        'licenseUrl': 'https://opendatacommons.org/licenses/odbl/1-0/',
        'source': 'OpenStreetMap via github.com/farhat2222s/almaty60 (source-city-local.json, retrieved ' + src.get('source', {}).get('retrievedAt', '') + ')',
        'note': 'Buildings/roads/greens/plazas/POI: OSM (ODbL). Trees, lamps, parking, crossings, signals, chains: procedurally derived by tools/geo_build.py.',
        'origin': src['coordinateSystem']['origin'],
        'axes': 'x=east m, z=south m, y=up',
        'bounds': B,
        'names': onames,
        # buildings: [h, levels, kind, flags, nameIdx (-1: names not exported), [x,z,...]]
        'b': [[R1(b['h']), b['lv'], b['k'], b['f'], -1, [R1(v) for p in b['pts'] for v in p]] for b in buildings],
        # roads: [cls, lanes, oneway, width, nameIdx, [x,z,...], [cut s0,s1,...]]
        'r': [[r['cls'], r['lanes'], r['ow'], r['w'], r['on'], [R1(v) for p in r['pts'] for v in p], [v for c in r.get('cuts', []) for v in c]] for r in roads],
        # footways: [cls, width, paved, [x,z,...]]
        'f': [[fw['cls'], fw['w'], fw['pav'], [R1(v) for p in fw['pts'] for v in p]] for fw in foot],
        # greens: [kind(0 grass,1 park,2 playground,3 other), nameIdx (-1), [x,z,...]]
        'g': [[g['k'], -1, [R1(v) for p in g['pts'] for v in p]] for g in greens],
        'p': [[pl['pav'], [R1(v) for p in pl['pts'] for v in p]] for pl in plazas],
        # intersections [x,z,radius,signal]
        'x': inters,
        # crossings (zebras) [x,z,roadAngle,roadWidth]
        'c': crossings,
        # traffic chains [nameIdx, cls, oneway, lanes, [x,z,...]]
        'ch': [[c['on'], c['cls'], c['ow'], c['lanes'], [v for p in c['pts'] for v in p]] for c in chains],
        # generated: trees [x,z,type,scale*10,...] types: 0 elm,1 poplar,2 maple,3 young,4 spruce,5 karagach
        't': [v for q in trees for v in q],
        # lamps [x,z,angle,type,...] 0 street cobra, 1 park
        'l': [v for q in lamps for v in q],
        # parking spots [x,z,heading,mode,...]
        'pk': [v for q in parks for v in q],
        'poi': {k: [R1(v) for p in lst for v in p] for k, lst in poi.items()},
    }
    s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    open(OUT, 'w', encoding='utf-8').write(s)
    print('almaty.json', len(s.encode('utf-8')), 'bytes | buildings', len(buildings), 'roads', len(roads), 'foot', len(foot), 'greens', len(greens),
          'inters', len(inters), 'signals', sum(1 for i in inters if i[3]), 'crossings', len(crossings), 'chains', len(chains),
          'trees', len(trees), 'lamps', len(lamps), 'parking', len(parks))


if __name__ == '__main__':
    main()
