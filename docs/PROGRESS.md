# Journal de progression

## 2026-11-24 16:30 — Phase A · cadrage
- Fait : plan approuvé par Axel ; dépôt initialisé ; `CLAUDE.md`, `DESIGN.md`, `REPRISE.md`, `docs/00_CADRAGE.md` (exigences E1–E9, hypothèses H1–H6), `POUR_AXEL.md` (4 tâches), `A_TRANCHER.md` (Q1–Q3). Playwright MCP ajouté au projet (`.mcp.json`, actif au prochain démarrage de Claude Code).
- Preuve : fichiers dans le dépôt.
- Suivant : M0.

## 2026-11-24 16:40 — M0-a · trace de dev (1B, Mac)
- Fait : `scripts/trace_core.py` (trace + contrôles E1), `scripts/trace_local.py`. Trace `public/traces/dev-1b-satellite.json` (Llama 3.2 1B-Instruct, miroir unsloth sans jeton, bf16, CPU) : 8 tokens, 0,09 Mo gzip, chargement 2 s, trace 10 s.
- Écart : E1 en échec sur la somme des lignes d'attention (2,9e-3 > 1e-3) → **AN-001** : seuil mal posé (arrondi bf16), corrigé par calcul : eps(dtype)/2 + n·5e-5. Relance : E1 OK (somme 2,9e-3 ≤ 4,3e-3 ; recalcul softmax(QKᵀ) à 9,7e-3 ; top-1 = génération gloutonne).
- Résultat : top-1 « was » 53 %, puis « had » 7,2 %, « is » 4,9 %.
- Preuve : `docs/preuves/trace_local_run2.log`, `docs/preuves/AN-001_arrondi.txt`, `tests/trace.test.ts` (4 tests verts).
- Notebook Kaggle `notebooks/trace_llama32.ipynb` généré depuis `trace_core.py` (`scripts/build-notebook.py`) : 3 modèles × 4 phrases. À lancer par Axel (tâche 1).

## 2026-11-24 17:05 — M0-b · un bloc en 3D depuis la trace
- Fait : Vite + React + R3F. Un bloc : flux résiduel (un couloir par token, normes réelles en entrée/sortie), ① RMSNorm, ② attention (toutes les têtes, rangées par groupe K/V partagé), ③ addition, ④ RMSNorm, ⑤ MLP 2 048 → 8 192 → 2 048 avec les 16 neurones les plus actifs, ⑥ addition. Curseur de bloc, logit lens, top-10, survol = valeur exacte.
- Boucle visuelle : 6 captures. Corrigé : cadrage (cadrage automatique selon la fenêtre), panneau qui recouvrait la scène, libellés `<Html>` de drei qui provoquaient des erreurs React 19 (remplacés par une couche de libellés unique), couloirs écrasés (vue de trois quarts).
- Mesure : 144 i/s dans Chromium (Metal) à 1440×900 ; 0 erreur console. Survol vérifié : « tête 6, it → its : 2,37 % » = 0,0237 dans la trace.
- Preuve : `docs/preuves/m0b_bloc1.png`.

## 2026-11-24 17:50 — M0-c · direct dans le navigateur (WebGPU, Mac d'Axel)
- Fait : `live-test.html` + `scripts/live-run.mjs` (Chromium, GPU réel Metal, 2 passages : téléchargement puis cache). Écart au plan : Chromium piloté par Playwright au lieu du Chrome d'Axel ; même machine, même GPU.
- **1B-Instruct q4f16** : chargement 134 s (téléchargement) / **23 s** (cache), 1er passage avant 15 s (compilation des shaders), **18,6 tokens/s**. Top-10 : « was » 51,9 % (trace bf16 : 53,0 %), 8/10 en commun → E5 OK, E6 OK (à la limite).
- **3B-Instruct q4f16** : pas de plantage, 9,7–12,5 tokens/s, mais 117 s (cache) + 30 s = **147 s** avant le 1er résultat → E5 échoue → **AN-002**. Proposition : 1B par défaut, 3B en option (A_TRANCHER Q4).
- **Attention en direct : non.** Les graphes ONNX (1B et 3B) n'exposent que `logits` + cache K/V. Les scores d'attention viendront uniquement des traces.
- Preuve : `docs/preuves/M0c_Llama-3.2-1B-Instruct-ONNX.json`, `docs/preuves/M0c_Llama-3.2-3B-Instruct-ONNX.json`.

## Bilan M0 (critère : « les 3 marchent, ou on sait lequel ne marche pas et pourquoi »)
- a) trace : **marche** (1B local, E1 vert). Trace 3B : notebook prêt, en attente du lancement Kaggle par Axel (licence + jeton HF).
- b) 1 bloc en 3D depuis la trace : **marche** (144 i/s, 0 erreur).
- c) direct : **1B marche** (E5 OK) ; **3B tient mais trop lent** (AN-002) ; attention en direct impossible avec les exports standard.
- Suivant : M1 (le trajet d'un token, 28 blocs) sur la trace 1B, bascule sur la trace 3B dès réception.
