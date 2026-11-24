"""Traces de plusieurs modèles × plusieurs phrases (GitHub Actions, CPU 16 Go, ou toute machine).

  python scripts/trace_batch.py --out traces --models 3b-instruct=unsloth/Llama-3.2-3B-Instruct ...

Mêmes calculs et mêmes contrôles E1 que trace_local.py et le notebook (scripts/trace_core.py).
Les dépôts `unsloth/…` sont des copies publiques des poids officiels meta-llama (même licence Llama 3.2).
"""
import argparse, gc, json, os, shutil, sys, time

sys.path.insert(0, os.path.dirname(__file__))
import torch  # noqa: E402
from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: E402
from trace_core import check_trace, save_trace, trace_sentence  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--out", default="traces")
ap.add_argument("--models", nargs="+", required=True, help="clé=dépôt")
ap.add_argument("--sentences", default=os.path.join(os.path.dirname(__file__), "sentences.json"))
ap.add_argument("--dtype", default="bfloat16")
ap.add_argument("--clear-cache", action="store_true", help="efface le cache HF après chaque modèle (disque limité)")
a = ap.parse_args()

sentences = {k: v for k, v in json.load(open(a.sentences)).items() if not k.startswith("_")}
os.makedirs(a.out, exist_ok=True)
report = []
torch.set_num_threads(os.cpu_count() or 4)
for spec in a.models:
    key, repo = spec.split("=", 1)
    t0 = time.time()
    tok = AutoTokenizer.from_pretrained(repo)
    model = AutoModelForCausalLM.from_pretrained(repo, dtype=getattr(torch, a.dtype), attn_implementation="eager", low_cpu_mem_usage=True).eval()
    print(f"\n== {repo} chargé en {time.time() - t0:.0f} s", flush=True)
    for sid, prompt in sentences.items():
        t1 = time.time()
        tr = trace_sentence(model, tok, prompt, repo)
        fails = check_trace(tr)
        raw, gz = save_trace(tr, os.path.join(a.out, f"{key}-{sid}.json"))
        top = [(x["t"], x["p"]) for x in tr["output"]["top10"][:3]]
        print(f"  {sid:14s} {len(tr['tokens']):2d} tok · {time.time() - t1:5.1f} s · {gz / 1e3:4.0f} Ko gz · E1 {'OK' if not fails else 'ÉCHEC ' + str(fails)} · {top}", flush=True)
        report.append({"model": key, "repo": repo, "sentence": sid, "fails": fails, "checks": tr["checks"], "gzip_bytes": gz, "top3": top})
    del model
    gc.collect()
    if a.clear_cache:
        shutil.rmtree(os.path.expanduser("~/.cache/huggingface/hub"), ignore_errors=True)
json.dump(report, open(os.path.join(a.out, "_rapport.json"), "w"), ensure_ascii=False, indent=1)
n_fail = sum(bool(r["fails"]) for r in report)
print(f"\nÉchecs E1 : {n_fail} sur {len(report)}")
