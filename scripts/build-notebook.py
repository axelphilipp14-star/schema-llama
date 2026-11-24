"""Génère notebooks/trace_llama32.ipynb à partir de scripts/trace_core.py (une seule source de vérité)."""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
core = (root / "scripts" / "trace_core.py").read_text()

def md(s): return {"cell_type": "markdown", "metadata": {}, "source": s}
def code(s): return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": s}

cells = [
    md("""# Traces de Llama 3.2 pour le schéma 3D

Ce notebook fait tourner **Llama 3.2** sur quelques phrases et enregistre ce qui se passe à l'intérieur : tokens, embeddings, scores d'attention de chaque tête, sorties du MLP, probabilités finales. Le site rejoue ces fichiers : ce sont les « vrais nombres » du schéma.

**Avant de lancer** (une seule fois) :
1. Sur huggingface.co, accepter la licence de `meta-llama/Llama-3.2-3B-Instruct`, `meta-llama/Llama-3.2-3B` et `meta-llama/Llama-3.2-1B-Instruct`.
2. Créer un jeton *Read* (Settings → Access Tokens).
3. Ici, dans Kaggle : *Add-ons → Secrets* → ajouter `HF_TOKEN` avec ce jeton, et cocher la case pour ce notebook.
4. *Settings* à droite : **Accelerator = GPU T4** et **Internet = On**.

Puis *Run All*. Durée attendue : 10 à 20 min (surtout le téléchargement, ≈ 6,4 Go par modèle 3B).
À la fin, télécharger `traces.zip` dans l'onglet *Output* et le déposer dans `docs/retours-axel/` du projet.

**Ce que tu peux observer en passant** : la cellule 3 affiche la mémoire GPU utilisée. 3,2 milliards de paramètres × 2 octets (fp16) ≈ 6,4 Go."""),
    md("## 1. Les phrases à tracer\nModifie librement cette liste (phrases courtes, ≤ 16 tokens)."),
    code("""SENTENCES = {
    "en-satellite": "The satellite lost its antenna because it",
    "fr-satellite": "Le satellite a perdu son antenne parce qu'elle",
    "en-capital": "The capital of France is",
    "fr-capitale": "La capitale de la France est",
}
MODELS = {
    "3b-instruct": "meta-llama/Llama-3.2-3B-Instruct",   # modèle de référence du schéma
    "3b-base": "meta-llama/Llama-3.2-3B",                # pour montrer ce que change le fine-tuning
    "1b-instruct": "meta-llama/Llama-3.2-1B-Instruct",   # pour comparer avec le direct dans le navigateur
}"""),
    md("## 2. Connexion à Hugging Face et versions"),
    code("""import os, torch, transformers
from huggingface_hub import login
try:
    from kaggle_secrets import UserSecretsClient
    login(UserSecretsClient().get_secret("HF_TOKEN"))
except Exception as e:
    print("Pas de secret Kaggle HF_TOKEN :", e)
print("torch", torch.__version__, "· transformers", transformers.__version__)
print("GPU :", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "AUCUN — active GPU T4 dans Settings")"""),
    md("## 3. Le code de trace\nCopie exacte de `scripts/trace_core.py` du projet (généré automatiquement, ne pas modifier ici)."),
    code(core),
    md("## 4. Tracer chaque modèle sur chaque phrase\nChaque trace passe les contrôles E1 : dimensions = config, lignes d'attention qui somment à 1, softmax(QKᵀ) recalculé = attention du modèle, top-1 = génération gloutonne."),
    code("""import gc, time, json
from transformers import AutoModelForCausalLM, AutoTokenizer
os.makedirs("traces", exist_ok=True)
report = []
for key, mid in MODELS.items():
    t0 = time.time()
    tok = AutoTokenizer.from_pretrained(mid)
    model = AutoModelForCausalLM.from_pretrained(mid, dtype=torch.float16, attn_implementation="eager").to("cuda").eval()
    print(f"\\n== {mid} chargé en {time.time()-t0:.0f} s · mémoire GPU {torch.cuda.memory_allocated()/1e9:.2f} Go")
    for sid, prompt in SENTENCES.items():
        tr = trace_sentence(model, tok, prompt, mid)
        fails = check_trace(tr)
        raw, gz = save_trace(tr, f"traces/{key}-{sid}.json")
        top = [(t['t'], t['p']) for t in tr['output']['top10'][:5]]
        print(f"  {sid:14s} {len(tr['tokens']):2d} tokens · {gz/1e3:.0f} Ko gzip · E1 {'OK' if not fails else 'ÉCHEC ' + str(fails)} · {top}")
        report.append({"model": key, "sentence": sid, "fails": fails, "checks": tr["checks"], "gzip_bytes": gz})
    del model; gc.collect(); torch.cuda.empty_cache()
json.dump(report, open("traces/_rapport.json", "w"), ensure_ascii=False, indent=1)
print("\\nÉchecs E1 :", sum(bool(r["fails"]) for r in report), "sur", len(report))"""),
    md("## 5. Archive à télécharger"),
    code("""import shutil
shutil.make_archive("traces", "zip", "traces")
print("→ télécharge traces.zip dans l'onglet Output (à droite)")"""),
]
nb = {"cells": cells, "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
      "language_info": {"name": "python"}, "kaggle": {"accelerator": "gpu", "isInternetEnabled": True}},
      "nbformat": 4, "nbformat_minor": 5}
out = root / "notebooks" / "trace_llama32.ipynb"
out.write_text(json.dumps(nb, ensure_ascii=False, indent=1))
print("écrit", out)
