# Rapport — schéma 3D de Llama 3.2 3B (phases D et F)

**Site : https://axelphilipp14-star.github.io/schema-llama/** · code : https://github.com/axelphilipp14-star/schema-llama · état au 24/11/2026, campagne rejouée en entier à 22:33.

## Exigences : valeur mesurée, preuve
| # | Exigence | Seuil | Mesuré (sur le vrai 3B sauf mention) | Statut | Preuve |
|---|---|---|---|---|---|
| E1 | Trace fidèle au modèle | dims = config ; Σ attention = 1 à la précision du format ; softmax(QKᵀ) = attention ; top-1 = génération | **15/15 traces** (3B Instruct, 3B base, 1B × 5 phrases) ; + recalculs RMSNorm, Σ p·V, SwiGLU | ✅ (seuil corrigé par calcul, AN-001) | `docs/preuves/traces_github_actions_rapport.json`, `tests/trace.test.ts`, `tests/m2-math.test.ts` |
| E2 | Nombres affichés = trace | 100 % des valeurs testées | logit lens 28 blocs, top-3 par étape, top-10 ; cartes RMSNorm, softmax, sortie de tête, MLP ; base/Instruct | ✅ | `tests/e2e/numbers.spec.ts`, `block.spec.ts`, `make.spec.ts` |
| E3 | Fluidité 3D | ≥ 50 i/s, 1440×900, écran Retina | trajet min **59**, bloc min **57** (écran 60 Hz ; 131–144 i/s sur écran 144 Hz) | ✅ | `docs/preuves/M1_mesure_3b.json`, `M2_mesure_fps_3b.json` |
| E4 | Chargement | utilisable < 3 s ; trace ≤ 2 Mo gzip | site publié : **1,2 à 2,4 s** (1re visite selon le réseau), 0,4–1,2 s ensuite ; trace **196 Ko** gzip | ✅ | `docs/preuves/M6_site_publie.json` |
| E5 | Direct sur le Mac (8 Go) | 1er résultat < 60 s (cache), ≥ 5 tokens/s, pas de crash | **1B : 25 s en local, 30,4 s sur le site publié** (1re visite avec téléchargement de 1,1 Go : 310 s), 0,6–0,8 s par phrase ✅ · 3B : 119 s ✗ (option « lent ») | ✅ 1B / ✗ 3B (AN-002) | `docs/preuves/M3_direct_1b.json`, `M3_direct_1b_site_publie.json`, `M3_direct_1b_site_publie_telechargement.json`, `M3_direct_3b.json` |
| E6 | Direct cohérent avec la trace | top-1 identique, ≥ 8/10 en commun | 1B : ✓, 8/10 · **3B : ✓, 8/10** (« was » 49,7 % direct / 46,6 % trace) | ✅ (à la limite : quantification 4 bits) | idem |
| E7 | FR/EN complet | 100 % des clés | 0 clé manquante, 0 phrase à traduire ; 30 termes identiques listés | ✅ | `tests/i18n.test.ts` |
| E8 | Suivre un token | ≤ 60 s | **43,3 s** (28 blocs) | ✅ | `docs/preuves/M1_mesure_3b.json` |
| E9 | Coffre → site | 1 commande ; enquête modifiée ⇒ fiche à jour | `npm run content` ; test sur faux coffre : FR à jour, EN repasse « à traduire », suivi personnel jamais publié | ✅ | `tests/content.test.ts` |

Tests : **131 unitaires + 4 e2e**, verts ; la publication sur GitHub Pages ne se fait que si les tests unitaires passent (`.github/workflows/pages.yml`).

## Ce qui n'est pas fait (ou pas vérifié)
- Le 3B en direct n'a été mesuré qu'en local (même code que le 1B, vérifié sur le site publié).
- **Première visite** : le modèle en direct (1,1 Go) met ≈ 5 minutes à se télécharger avant le premier résultat ; ensuite il est en cache (30 s). La page le dit pendant le chargement, mais n'annonce pas la durée.
- ~~Schéma Mermaid de l'enquête 12~~ : réparé le 25/11. Ce n'était pas la note : `build-content.mjs` convertissait `[[…]]` jusque dans les blocs de code (diagnostic d'abord faux, corrigé en lisant le message d'erreur réel).
- Fiche fine-tuning : pas d'enquête #18 (décision d'Axel, 25/11) ; la station s'appuie sur la fiche technique Meta, les traces base/Instruct et le Lexique.
- Ligne de trace dans `Journal.md` du coffre : refusée par le contrôle des permissions, laissée à Axel.
- Idées tirées de bbycroft non faites : poids et activations distingués visuellement, comparaison 1B/3B côte à côte, mini-carte 2D (`docs/analyses/bbycroft.md`).
- E8 est mesuré en lecture automatique ; pas encore chronométré avec de vrais lecteurs.

## Anomalies, classées par cause racine
| Famille | Anomalies | Part |
|---|---|---|
| Exigence mal posée (seuil ou hypothèse non calculés) | AN-001 (tolérance fixée sans dériver de la précision du format), AN-002 (« tient en 8 Go » jamais mesuré) | 2/4 |
| Instrument de mesure non calibré | AN-003 (outil de mesure E8 : rechargement, bug de fin, détection en retard) | 1/4 |
| Donnée présentée comme mesure sans instrument | AN-004 (heures du journal estimées) | 1/4 |
| Bug de programmation pur | aucun rapport : les bugs (classe CSS `calc` en collision, titres d'encadrés perdus, libellés JSX, `location` dans les tests, `rope_theta` mal lu) ont été attrapés par les captures ou les tests et corrigés dans l'étape | — |
Comme sur le projet de référence de la méthode : les causes racines sont des erreurs de **spécification et de mesure**, pas de code.
