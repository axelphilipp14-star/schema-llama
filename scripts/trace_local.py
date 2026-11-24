# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = ["torch>=2.5", "transformers>=4.46", "accelerate"]
# ///
"""Trace de dev sur le Mac (CPU). Par défaut Llama 3.2 1B-Instruct.

  uv run scripts/trace_local.py                       # phrase par défaut
  uv run scripts/trace_local.py --prompt "..." --id fr-satellite
  uv run scripts/trace_local.py --model meta-llama/Llama-3.2-1B-Instruct

Dépôt officiel = gated (licence à accepter + `hf auth login`). Repli sans jeton :
`unsloth/Llama-3.2-1B-Instruct`, copie des mêmes poids (même licence Llama 3.2).
"""
import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import torch  # noqa: E402
from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: E402

from trace_core import check_trace, save_trace, trace_sentence  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--model", default="unsloth/Llama-3.2-1B-Instruct")
ap.add_argument("--prompt", default="The satellite lost its antenna because it")
ap.add_argument("--id", default="dev-1b-local")
ap.add_argument("--dtype", default="bfloat16", choices=["float32", "bfloat16"])
ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "public", "traces"))
a = ap.parse_args()

t0 = time.time()
tok = AutoTokenizer.from_pretrained(a.model)
model = AutoModelForCausalLM.from_pretrained(
    a.model, dtype=getattr(torch, a.dtype), attn_implementation="eager", low_cpu_mem_usage=True
)
model.eval()
print(f"chargé en {time.time() - t0:.1f} s")

t1 = time.time()
tr = trace_sentence(model, tok, a.prompt, a.model)
print(f"trace en {time.time() - t1:.1f} s — {len(tr['tokens'])} tokens")

fails = check_trace(tr)
print("contrôles E1 :", tr["checks"])
os.makedirs(a.out, exist_ok=True)
path = os.path.join(a.out, f"{a.id}.json")
raw, gz = save_trace(tr, path)
print(f"écrit {path} — {raw / 1e6:.2f} Mo brut, {gz / 1e6:.2f} Mo gzip")
print("top-10 :", [(t["t"], t["p"]) for t in tr["output"]["top10"]])
if fails:
    print("ÉCHEC E1 :", fails)
    sys.exit(1)
print("E1 OK")
