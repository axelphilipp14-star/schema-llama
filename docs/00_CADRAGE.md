# 00 — Cadrage

## Mission
Un schéma 3D interactif de Llama 3.2 3B, en ligne sur GitHub Pages, qui montre les 2 phases (fabriquer, répondre) avec de vrais nombres du modèle, un exemple modifiable et des fiches FR/EN tirées des enquêtes d'Axel.

## Exigences chiffrées
| # | Exigence | Seuil | Vérification |
|---|---|---|---|
| E1 | Trace fidèle au modèle | dims = `config.json` ; lignes d'attention somment à 1 ± 1e-3 ; top-1 de la trace = `generate()` glouton | essai (contrôles du script de trace + Vitest) |
| E2 | Nombres affichés = trace | 100 % des valeurs testées identiques à l'arrondi affiché | essai Playwright |
| E3 | Fluidité 3D | ≥ 50 i/s à 1440×900 sur le Mac d'Axel | démonstration (compteur i/s) |
| E4 | Chargement | page utilisable < 3 s sans modèle direct ; trace ≤ 2 Mo gzip | essai |
| E5 | Direct sur le Mac | 1er résultat < 60 s (modèle en cache), ≥ 5 tokens/s, pas de crash | essai sur le Mac |
| E6 | Direct cohérent | même phrase, même modèle : top-1 identique, ≥ 8/10 du top-10 commun avec la trace | essai |
| E7 | FR/EN complet | 100 % des clés dans les 2 langues | essai (test i18n) |
| E8 | Suivre un token | de bout en bout en ≤ 60 s | démonstration chronométrée |
| E9 | Coffre → site | 1 commande ; enquête modifiée ⇒ fiche à jour | essai |

## Sourcé vs hypothèse
| Valeur | Statut | Source / test |
|---|---|---|
| Dimensions 3B (28 couches, 3 072, 24/8 têtes, 8 192, 128 256) | sourcé | `config.json` HF, vérifié 24/11/2026 ; revérifié par E1 sur la trace |
| Dimensions 1B (16, 2 048, 32/8, 8 192) | sourcé | `config.json` HF ; revérifié par E1 |
| H1 — 3B q4f16 tient dans 8 Go en WebGPU | **hypothèse** | test M0-c (`live-test.html`) |
| H2 — 1B q4f16 (~1,2 Go) tient | **hypothèse** (probable) | test M0-c |
| H3 — l'export ONNX ne donne pas les scores d'attention | **hypothèse** | M0-c : lister `session.outputNames` |
| H4 — R3F tient 28 blocs instanciés à 50 i/s | **hypothèse** | compteur i/s, M1 |
| H5 — trace d'une phrase ≤ 16 tokens ≤ 2 Mo gzip | **hypothèse** | taille mesurée par le script de trace |
| H6 — q4f16 change peu le top-10 (E6) | **hypothèse** | comparaison trace fp16/fp32 vs direct |

## Phases et critères de passage
| Phase | Étape | Critère |
|---|---|---|
| A | Cadrage | ce fichier, CLAUDE.md, DESIGN.md, dépôt en ligne |
| B | M0 faisabilité | trace + 1 bloc 3D + direct : marchent, ou anomalie écrite |
| C | M1–M5 | critère de chaque étape (voir plan) |
| D | Campagne | E1–E9 rejoués, preuves dans `docs/preuves/` |
| E | M6 en ligne | GitHub Pages, « on oserait l'envoyer à un ingénieur » |
| F | Clôture | anomalies classées, LECONS.md |

## Risques
| Risque | Effet | Parade (exécutable) |
|---|---|---|
| Accès au modèle gated refusé / Kaggle indisponible | pas de trace 3B | trace 1B locale (`scripts/trace_local.py`) ; mirror non gated en dernier recours |
| 3B ne tient pas en direct | direct en 1B seulement | test M0-c ; l'interface dit quel modèle tourne |
| Pas d'attention en direct | attention seulement via traces | assumé et affiché dans l'interface |
| Scène trop lourde | < 50 i/s | InstancedMesh, compteur i/s, niveau de détail |
| Fiches périmées | contenu faux | hachage des sections sources dans `npm run content` |
