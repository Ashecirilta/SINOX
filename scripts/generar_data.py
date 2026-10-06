import json, random, urllib.request, urllib.parse, time
from pathlib import Path

UA = {"User-Agent": "SINOX/1.0 (GitHub Action)"}
OUT = Path("data.js")
TARGET_AIC = 50
TARGET_MET = 50

def get_json(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

def category_from(text):
    s = (text or "").lower()
    rules = [
        ("Fotografía", ["photo", "photograph"]),
        ("Escultura", ["sculpt", "statue"]),
        ("Cerámica", ["ceramic", "pottery", "porcelain", "vase"]),
        ("Textil / moda", ["textile", "costume", "dress", "garment", "fashion"]),
        ("Mobiliario", ["furniture", "chair", "table", "cabinet"]),
        ("Grabado / obra en papel", ["print", "drawing", "etch", "lithograph", "woodblock"]),
        ("Diseño / objeto", ["design", "decorative", "object"]),
        ("Pintura", ["paint"]),
    ]
    for label, keys in rules:
        if any(k in s for k in keys):
            return label
    return "Arte / objeto"

def aic_items():
    # AIC allows up to 100 per request. We take several pages and then sample,
    # always requiring public domain + an image_id.
    pool = []
    fields = "id,title,image_id,artist_display,date_display,artwork_type_title,department_title,is_public_domain"
    for page in (1, 2, 3, 4):
        params = urllib.parse.urlencode({
            "query[term][is_public_domain]": "true",
            "limit": 100, "page": page, "fields": fields
        })
        data = get_json("https://api.artic.edu/api/v1/artworks/search?" + params)
        base = data.get("config", {}).get("iiif_url", "https://www.artic.edu/iiif/2")
        for x in data.get("data", []):
            if not x.get("image_id") or not x.get("is_public_domain"):
                continue
            pool.append({
                "id": f"aic-{x['id']}",
                "category": category_from((x.get("artwork_type_title") or "")+" "+(x.get("department_title") or "")),
                "title": x.get("title") or "Sin título",
                "author": x.get("artist_display") or "Autor desconocido",
                "date": x.get("date_display") or "",
                "museum": "Art Institute of Chicago",
                "image": f"{base}/{x['image_id']}/full/843,/0/default.jpg"
            })
    rnd = random.Random("SINOX-AIC-PRUEBA-1")
    rnd.shuffle(pool)
    return pool[:TARGET_AIC]

def met_items():
    # Multiple searches create variety instead of 50 near-identical paintings.
    queries = ["painting", "sculpture", "ceramic", "furniture", "textile",
               "photograph", "drawing", "print", "vase", "costume"]
    candidates = []
    for q in queries:
        params = urllib.parse.urlencode({
            "hasImages": "true", "isPublicDomain": "true", "q": q
        })
        data = get_json("https://collectionapi.metmuseum.org/public/collection/v1/search?" + params)
        ids = data.get("objectIDs") or []
        # Spread across each result set.
        rnd = random.Random("SINOX-MET-" + q)
        ids = ids[:]
        rnd.shuffle(ids)
        candidates.extend(ids[:18])

    seen, out = set(), []
    for oid in candidates:
        if oid in seen:
            continue
        seen.add(oid)
        try:
            x = get_json(f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{oid}")
        except Exception:
            continue
        if not x.get("isPublicDomain"):
            continue
        img = x.get("primaryImageSmall") or x.get("primaryImage")
        if not img:
            continue
        desc = " ".join(str(x.get(k) or "") for k in ("objectName","classification","department"))
        out.append({
            "id": f"met-{oid}",
            "category": category_from(desc),
            "title": x.get("title") or "Sin título",
            "author": x.get("artistDisplayName") or x.get("culture") or "Autor desconocido",
            "date": x.get("objectDate") or "",
            "museum": "The Metropolitan Museum of Art",
            "image": img
        })
        if len(out) >= TARGET_MET:
            break
        time.sleep(0.08)
    return out

aic = aic_items()
met = met_items()
items = aic + met

if len(aic) != TARGET_AIC or len(met) != TARGET_MET:
    raise SystemExit(f"No se alcanzaron 100 obras: AIC={len(aic)}, MET={len(met)}")

if len({x["id"] for x in items}) != 100:
    raise SystemExit("Hay IDs duplicados")

# Alternate museums, then shuffle lightly but deterministically.
mixed = []
for i in range(50):
    mixed.extend([aic[i], met[i]])
rnd = random.Random("SINOX-PRUEBA-100-REAL-1")
for start in range(0, 100, 10):
    block = mixed[start:start+10]
    rnd.shuffle(block)
    mixed[start:start+10] = block

OUT.write_text(
    "const SINOX_ITEMS=" + json.dumps(mixed, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8"
)
print("OK: data.js generado con 100 obras únicas")
print("Art Institute of Chicago:", len(aic))
print("The Met:", len(met))
