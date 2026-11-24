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
