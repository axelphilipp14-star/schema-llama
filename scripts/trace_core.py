"""Trace d'un passage avant de Llama 3.2 → JSON compact pour le schéma 3D.

Utilisé tel quel par scripts/trace_local.py (Mac, CPU) et recopié dans
notebooks/trace_llama32.ipynb (Kaggle, GPU T4). Aucune valeur de dimension en dur :
tout vient de model.config.

Ce qui est exporté (voir docs/00_CADRAGE.md, E1) :
- tokens, embeddings (norme, 16 premières dimensions, projection 3D par ACP)
- par couche : normes du flux résiduel, attention complète [têtes × n × n],
  détail Q·K du dernier token (8 premières dimensions après RoPE, scores bruts),
  MLP (norme de sortie, top-16 neurones du dernier token : gate, up, silu(gate)·up),
  logit lens (top-5 lu à cette couche pour le dernier token)
- sortie : top-50 logits, top-10 probabilités, entropie
- contrôles E1 : dims, somme des lignes d'attention, softmax(QKᵀ) recalculé = attention
  du modèle, top-1 = generate() glouton
"""
from __future__ import annotations

import datetime as _dt
import gzip
import json
import math

import torch

R = 4  # décimales gardées


def rnd(x, r=R):
    if isinstance(x, torch.Tensor):
        x = x.detach().float().cpu().tolist()
    if isinstance(x, list):
        return [rnd(v, r) for v in x]
    return round(float(x), r)


def tok_text(tok, i):
    return tok.decode([int(i)])


@torch.no_grad()
def trace_sentence(model, tok, prompt: str, model_id: str, *, max_tokens=16, add_bos=True):
    from transformers.models.llama.modeling_llama import apply_rotary_pos_emb

    cfg = model.config
    L = cfg.num_hidden_layers
    H = cfg.num_attention_heads
    KV = cfg.num_key_value_heads
    D = cfg.hidden_size
    hd = getattr(cfg, "head_dim", None) or D // H
    dev = next(model.parameters()).device

    enc = tok(prompt, return_tensors="pt", add_special_tokens=add_bos)
    ids = enc["input_ids"][:, :max_tokens].to(dev)
    n = ids.shape[1]

    layers = model.model.layers
    cap: dict[str, list] = {k: [None] * L for k in ("q", "k", "v", "ctx", "ln1_out", "ln2_out", "attn_out", "mlp_out", "act", "gate", "up")}
    hooks = []
    for li, layer in enumerate(layers):
        a = layer.self_attn
        hooks.append(a.q_proj.register_forward_hook(lambda m, i, o, li=li: cap["q"].__setitem__(li, o)))
        hooks.append(a.k_proj.register_forward_hook(lambda m, i, o, li=li: cap["k"].__setitem__(li, o)))
        hooks.append(a.v_proj.register_forward_hook(lambda m, i, o, li=li: cap["v"].__setitem__(li, o)))
        hooks.append(a.o_proj.register_forward_hook(lambda m, i, o, li=li: cap["ctx"].__setitem__(li, i[0])))
        hooks.append(layer.input_layernorm.register_forward_hook(lambda m, i, o, li=li: cap["ln1_out"].__setitem__(li, o)))
        hooks.append(layer.post_attention_layernorm.register_forward_hook(lambda m, i, o, li=li: cap["ln2_out"].__setitem__(li, o)))
        hooks.append(a.register_forward_hook(lambda m, i, o, li=li: cap["attn_out"].__setitem__(li, o[0])))
        hooks.append(layer.mlp.register_forward_hook(lambda m, i, o, li=li: cap["mlp_out"].__setitem__(li, o)))
        hooks.append(layer.mlp.gate_proj.register_forward_hook(lambda m, i, o, li=li: cap["gate"].__setitem__(li, o)))
        hooks.append(layer.mlp.up_proj.register_forward_hook(lambda m, i, o, li=li: cap["up"].__setitem__(li, o)))
        hooks.append(layer.mlp.down_proj.register_forward_hook(lambda m, i, o, li=li: cap["act"].__setitem__(li, i[0])))
    try:
        out = model(ids, output_attentions=True, output_hidden_states=True, use_cache=False)
    finally:
        for h in hooks:
            h.remove()

    hs = out.hidden_states  # L+1 tenseurs [1, n, D] : entrée de chaque couche, puis sortie finale (après norme)
    attn = out.attentions  # L tenseurs [1, H, n, n]
    norm = model.model.norm
    lm_head = model.lm_head
    pos = torch.arange(n, device=dev)[None]
    cos, sin = model.model.rotary_emb(hs[0], pos)

    checks = {"attn_row_sum_max_err": 0.0, "qk_recompute_max_err": 0.0, "norm_recompute_max_err": 0.0,
              "ctx_recompute_max_err": 0.0, "silu_recompute_max_err": 0.0}
    eps = cfg.rms_norm_eps

    def norm_detail(x_last, w, y_last):
        """RMSNorm du dernier token : y = x / sqrt(moyenne(x²) + eps) × w. 8 premières dimensions."""
        rms = (x_last.pow(2).mean() + eps).sqrt()
        y_re = x_last / rms * w.float()
        err = float(((y_re - y_last).abs() / (y_last.abs() + 1e-2)).max())
        checks["norm_recompute_max_err"] = max(checks["norm_recompute_max_err"], err)
        return {"x8": rnd(x_last[:8]), "rms": rnd(rms, 6), "w8": rnd(w[:8]), "y8": rnd(y_last[:8])}

    # Embeddings
    emb = model.model.embed_tokens(ids)[0].float()
    centered = emb - emb.mean(0, keepdim=True)
    U, S, Vh = torch.linalg.svd(centered, full_matrices=False)
    pca3 = (centered @ Vh[:3].T) if Vh.shape[0] >= 3 else torch.zeros(n, 3)
    pca3 = pca3 / (pca3.abs().max() + 1e-9)

    wdtype = lm_head.weight.dtype

    def lens(h_last):
        logits = lm_head(norm(h_last.to(wdtype)[None, None]))[0, 0].float()
        p = torch.softmax(logits, -1)
        v, ix = p.topk(5)
        return [{"id": int(i), "t": tok_text(tok, i), "p": rnd(pv)} for pv, i in zip(v, ix)]

    out_layers = []
    for li in range(L):
        h_in = hs[li][0].float()
        A = attn[li][0].float()  # [H, n, n]
        checks["attn_row_sum_max_err"] = max(checks["attn_row_sum_max_err"], float((A.sum(-1) - 1).abs().max()))

        # Recalcul Q·Kᵀ (après RoPE) pour le contrôle E1 et le détail du dernier token
        q = cap["q"][li].view(1, n, H, hd).transpose(1, 2)
        k = cap["k"][li].view(1, n, KV, hd).transpose(1, 2)
        q, k = apply_rotary_pos_emb(q, k, cos, sin)
        q, k = q[0].float(), k[0].float()  # [H, n, hd], [KV, n, hd]
        k_rep = k.repeat_interleave(H // KV, dim=0)
        scores = q @ k_rep.transpose(-1, -2) / math.sqrt(hd)
        mask = torch.triu(torch.ones(n, n, dtype=torch.bool, device=scores.device), 1)
        scores_m = scores.masked_fill(mask, float("-inf"))
        A_re = torch.softmax(scores_m, -1)
        checks["qk_recompute_max_err"] = max(checks["qk_recompute_max_err"], float((A_re - A).abs().max()))

        attn_out = cap["attn_out"][li][0].float()
        mlp_out = cap["mlp_out"][li][0].float()
        h_mid = h_in + attn_out
        h_out = h_mid + mlp_out

        # V et contexte de chaque tête (dernier token) : ctx_h = Σ_k p[h, k] · v[groupe(h), k]
        v = cap["v"][li][0].float().view(n, KV, hd).transpose(0, 1)  # [KV, n, hd]
        ctx = cap["ctx"][li][0, -1].float().view(H, hd)  # [H, hd]
        ctx_re = torch.einsum("hk,hkd->hd", A[:, -1, :], v.repeat_interleave(H // KV, dim=0))
        checks["ctx_recompute_max_err"] = max(checks["ctx_recompute_max_err"], float(((ctx_re - ctx).abs() / (ctx.abs().max() + 1e-6)).max()))
        layer = layers[li]
        n1 = norm_detail(h_in[-1], layer.input_layernorm.weight.detach().cpu().to(h_in.device), cap["ln1_out"][li][0, -1].float())
        n2 = norm_detail(h_mid[-1], layer.post_attention_layernorm.weight.detach().cpu().to(h_in.device), cap["ln2_out"][li][0, -1].float())

        gate = cap["gate"][li][0, -1].float()
        up = cap["up"][li][0, -1].float()
        act = cap["act"][li][0, -1].float()
        top_v, top_i = act.abs().topk(16)
        silu_re = torch.nn.functional.silu(gate[top_i]) * up[top_i]
        checks["silu_recompute_max_err"] = max(checks["silu_recompute_max_err"], float(((silu_re - act[top_i]).abs() / (act[top_i].abs() + 1e-2)).max()))

        out_layers.append({
            "resid_in_norm": rnd(h_in.norm(dim=-1)),
            "rms_in_last": rnd(h_in[-1].pow(2).mean().sqrt()),
            "attn": rnd(A),
            "attn_out_norm": rnd(attn_out.norm(dim=-1)),
            "mid_norm": rnd(h_mid.norm(dim=-1)),
            "norm1": n1,
            "norm2": n2,
            "last": {
                "q8": rnd(q[:, -1, :8]),  # [H, 8]
                "k8": rnd(k[:, :, :8]),  # [KV, n, 8]
                "scores": rnd(scores[:, -1, :]),  # [H, n] scores bruts (÷√d), avant masque
                "v8": rnd(v[:, :, :8]),  # [KV, n, 8]
                "ctx8": rnd(ctx[:, :8]),  # [H, 8] sortie de chaque tête avant o_proj
            },
            "mlp": {
                "out_norm": rnd(mlp_out.norm(dim=-1)),
                "top": [{"i": int(i), "gate": rnd(gate[i]), "up": rnd(up[i]), "act": rnd(act[i])} for i in top_i],
                "act_l2": rnd(act.norm()),
            },
            "resid_out_norm": rnd(h_out.norm(dim=-1)),
            "lens": lens(h_out[-1]),
        })

    # Sortie
    logits = out.logits[0, -1].float()
    probs = torch.softmax(logits, -1)
    lv, li_ = logits.topk(50)
    pv, pi = probs.topk(10)
    entropy = float(-(probs * torch.log(probs.clamp_min(1e-12))).sum())

    gen = model.generate(ids, max_new_tokens=1, do_sample=False, attention_mask=torch.ones_like(ids))
    greedy_id = int(gen[0, -1])
    checks["greedy_matches_top1"] = greedy_id == int(pi[0])
    checks["dims_match_config"] = (len(out_layers) == L and attn[0].shape[1] == H and hs[0].shape[-1] == D)

    import transformers

    return {
        "schema": 2,
        "meta": {
            "model_id": model_id,
            "dtype": str(next(model.parameters()).dtype).replace("torch.", ""),
            "device": str(dev),
            "date": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "rounding": R,
            "note": "Valeurs réelles du passage avant. pca3 = projection des embeddings de CETTE phrase sur ses 3 axes principaux, normalisée à [-1, 1].",
        },
        "config": {
            "n_layers": L, "d_model": D, "n_heads": H, "n_kv_heads": KV, "head_dim": hd,
            "d_mlp": cfg.intermediate_size, "vocab": cfg.vocab_size,
            "max_ctx": cfg.max_position_embeddings, "rope_theta": getattr(cfg, "rope_theta", None),
            "rms_eps": cfg.rms_norm_eps, "tie_embeddings": bool(cfg.tie_word_embeddings),
        },
        "prompt": prompt,
        "tokens": [{"id": int(i), "t": tok_text(tok, i)} for i in ids[0]],
        "embeddings": {
            "norm": rnd(emb.norm(dim=-1)),
            "first16": rnd(emb[:, :16]),
            "pca3": rnd(pca3, 3),
        },
        "layers": out_layers,
        "output": {
            "final_norm_last": rnd(hs[-1][0, -1].float().norm()),
            "top50_logits": [{"id": int(i), "t": tok_text(tok, i), "logit": rnd(v)} for v, i in zip(lv, li_)],
            "top10": [{"id": int(i), "t": tok_text(tok, i), "p": rnd(v)} for v, i in zip(pv, pi)],
            "entropy": rnd(entropy),
            "greedy_id": greedy_id,
        },
        "checks": {**checks, "row_sum_tol": row_sum_tolerance(str(next(model.parameters()).dtype).replace("torch.", ""), n)},
    }


EPS = {"float32": 2**-23, "float16": 2**-10, "bfloat16": 2**-7}


def row_sum_tolerance(dtype: str, n: int) -> float:
    """|Σ p − 1| attendu au plus : eps/2 (probabilités stockées dans ce format) + n × 5e-5 (arrondi JSON)."""
    return EPS[dtype] / 2 + n * 0.5 * 10**-R


def check_trace(tr) -> list[str]:
    """Contrôles E1. Renvoie la liste des échecs (vide = OK)."""
    c = tr["checks"]
    fails = []
    if not c["dims_match_config"]:
        fails.append("dimensions ≠ config")
    # Tolérance calculée (AN-001) : arrondi du format de calcul (eps/2) + arrondi JSON à 4 décimales.
    tol = row_sum_tolerance(tr["meta"]["dtype"], len(tr["tokens"]))
    if c["attn_row_sum_max_err"] > tol:
        fails.append(f"somme des lignes d'attention : erreur {c['attn_row_sum_max_err']:.2e} > {tol:.2e}")
    # fp16/bf16 : tolérance large sur le recalcul
    if c["qk_recompute_max_err"] > 2e-2:
        fails.append(f"softmax(QKᵀ) recalculé ≠ attention du modèle : {c['qk_recompute_max_err']:.2e}")
    # Recalculs du détail M2. Tolérance relative 5e-2, dérivée (AN-001) : chaque recalcul enchaîne ≤ 6 opérations
    # arrondies au format du modèle ; en bf16 (eps/2 = 3,9e-3) → ≤ 2,3 %, doublé pour l'arrondi JSON des petites valeurs.
    for key, lim in (("norm_recompute_max_err", 5e-2), ("ctx_recompute_max_err", 5e-2), ("silu_recompute_max_err", 5e-2)):
        if c.get(key, 0) > lim:
            fails.append(f"{key} = {c[key]:.2e} > {lim}")
    if not c["greedy_matches_top1"]:
        fails.append("top-1 de la trace ≠ generate() glouton")
    return fails


def save_trace(tr, path):
    raw = json.dumps(tr, ensure_ascii=False, separators=(",", ":"))
    with open(path, "w", encoding="utf-8") as f:
        f.write(raw)
    return len(raw.encode()), len(gzip.compress(raw.encode()))
