"""Complète config.rope_theta des traces calculées avant le correctif (transformers récent : rope_parameters).
Source : config.json du dépôt du modèle (meta.model_id). La provenance est notée dans meta.rope_source."""
import json, sys
from transformers import AutoConfig
cache = {}
for path in sys.argv[1:]:
    tr = json.load(open(path))
    if tr["config"].get("rope_theta"):
        continue
    mid = tr["meta"]["model_id"]
    if mid not in cache:
        c = AutoConfig.from_pretrained(mid)
        cache[mid] = getattr(c, "rope_theta", None) or (getattr(c, "rope_parameters", None) or {}).get("rope_theta")
    tr["config"]["rope_theta"] = cache[mid]
    tr["meta"]["rope_source"] = f"config.json de {mid} (complété après coup, scripts/fill-rope.py)"
    json.dump(tr, open(path, "w"), ensure_ascii=False, separators=(",", ":"))
    print(path, cache[mid])
