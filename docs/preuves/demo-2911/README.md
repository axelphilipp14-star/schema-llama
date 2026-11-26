# Démo publique du 29/11 — preuves avant / après

Captures « avant » : commit `29c5802` (celui du site en ligne le 26/11), servi en local (le conteneur ne peut pas ouvrir github.io).
Captures « après » : build de production (`npm run build` + `vite preview`), Chromium sans GPU (rendu logiciel).

| Point | Avant | Après |
|---|---|---|
| 1. Cadrage de départ (1181×653, 1400×840, 1920×1080) | `1_repondre_*_avant.png` | `1_repondre_*_apres.png` |
| 2. Bandeau d'accueil (FR, EN, fermé) | — (absent) | `1_repondre_*_apres.png`, `2_accueil_en_apres.png`, `2_accueil_ferme_1400x840_apres.png` |
| 3. Panneau lisible | `1_repondre_1400x840_avant.png`, `4_bloc1_avant.png` | `3_panneau_tokens_apres.png`, `4_bloc1_apres.png` |
| 4. Note des premiers blocs (présente bloc 1, absente bloc 3) | `4_bloc1_avant.png` | `4_trajet_bloc1_apres.png`, `4_trajet_bloc3_apres.png`, `4_bloc1_apres.png` |
| 5. « schéma, pas à l'échelle » dans la scène | `5_fabriquer_avant.png` | `5_fabriquer_apres.png` |
| 6. Chargement du direct | `6_atoi_avant.png` | `6_atoi_apres.png`, `6_atoi_chargement_simule_apres.png`, `6_atoi_preparation_simulee_apres.png` |
| 7. Branche de chaque enquête | `7_enquetes_avant.png` | `7_enquetes_apres.png`, `7_enquete_12_apres.png` |
| 8. Aperçu de partage | — (pas d'image) | `public/og.png` (1200×630) |
| 9. Liens directs | — (aucun) | `9_lien_*_apres.png` |

**Point 6, limite** : ce conteneur n'a pas accès à Hugging Face, le chargement réel ne peut pas tourner ici. Les deux captures de chargement sont un état **simulé** (`__live.setState`) pour montrer la mise en page ; les durées affichées sont celles mesurées en M3 (`docs/preuves/M3_direct_*.json`, `M0c_*.json`).

GIF LinkedIn : `../demo-linkedin.gif` (1200 × 674, 19,9 s, 7,5 Mo, 10 i/s) — chargement → Lecture (4×) → bloc 5 (RMSNorm, scores Q·K, MLP) → probabilités finales.
