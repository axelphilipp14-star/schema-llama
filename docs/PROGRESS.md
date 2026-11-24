# Journal de progression

> Heures = heure du commit git de l'étape (corrigées le 24/11 à 18:20, voir AN-004).

## 2026-11-24 16:46 (commit) — Phase A · cadrage
- Fait : plan approuvé par Axel ; dépôt initialisé ; `CLAUDE.md`, `DESIGN.md`, `REPRISE.md`, `docs/00_CADRAGE.md` (exigences E1–E9, hypothèses H1–H6), `POUR_AXEL.md` (4 tâches), `A_TRANCHER.md` (Q1–Q3). Playwright MCP ajouté au projet (`.mcp.json`, actif au prochain démarrage de Claude Code).
- Preuve : fichiers dans le dépôt.
- Suivant : M0.

## 2026-11-24 16:46 (commit) — M0-a · trace de dev (1B, Mac)
- Fait : `scripts/trace_core.py` (trace + contrôles E1), `scripts/trace_local.py`. Trace `public/traces/dev-1b-satellite.json` (Llama 3.2 1B-Instruct, miroir unsloth sans jeton, bf16, CPU) : 8 tokens, 0,09 Mo gzip, chargement 2 s, trace 10 s.
- Écart : E1 en échec sur la somme des lignes d'attention (2,9e-3 > 1e-3) → **AN-001** : seuil mal posé (arrondi bf16), corrigé par calcul : eps(dtype)/2 + n·5e-5. Relance : E1 OK (somme 2,9e-3 ≤ 4,3e-3 ; recalcul softmax(QKᵀ) à 9,7e-3 ; top-1 = génération gloutonne).
- Résultat : top-1 « was » 53 %, puis « had » 7,2 %, « is » 4,9 %.
- Preuve : `docs/preuves/trace_local_run2.log`, `docs/preuves/AN-001_arrondi.txt`, `tests/trace.test.ts` (4 tests verts).
- Notebook Kaggle `notebooks/trace_llama32.ipynb` généré depuis `trace_core.py` (`scripts/build-notebook.py`) : 3 modèles × 4 phrases. À lancer par Axel (tâche 1).

## 2026-11-24 16:46 (commit) — M0-b · un bloc en 3D depuis la trace
- Fait : Vite + React + R3F. Un bloc : flux résiduel (un couloir par token, normes réelles en entrée/sortie), ① RMSNorm, ② attention (toutes les têtes, rangées par groupe K/V partagé), ③ addition, ④ RMSNorm, ⑤ MLP 2 048 → 8 192 → 2 048 avec les 16 neurones les plus actifs, ⑥ addition. Curseur de bloc, logit lens, top-10, survol = valeur exacte.
- Boucle visuelle : 6 captures. Corrigé : cadrage (cadrage automatique selon la fenêtre), panneau qui recouvrait la scène, libellés `<Html>` de drei qui provoquaient des erreurs React 19 (remplacés par une couche de libellés unique), couloirs écrasés (vue de trois quarts).
- Mesure : 144 i/s dans Chromium (Metal) à 1440×900 ; 0 erreur console. Survol vérifié : « tête 6, it → its : 2,37 % » = 0,0237 dans la trace.
- Preuve : `docs/preuves/m0b_bloc1.png`.

## 2026-11-24 16:59 (commit) — M0-c · direct dans le navigateur (WebGPU, Mac d'Axel)
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

## 2026-11-24 17:19 (commit) — M1 · le trajet d'un token
- Fait : scène « trajet » (`src/scene/Journey.tsx`) : tokens et leurs numéros → **vraie ligne de chaque token** dans la table d'embedding (position = id / 128 256) → 16 premières valeurs réelles du vecteur → L blocs (attention orange | MLP violet) → RMSNorm finale → tête de sortie, reliée à la table d'entrée par un arc « même table » (`tie_embeddings`) → top-10. Impulsion animée par token ; seule celle du dernier token va jusqu'à la sortie.
- À chaque bloc, avec les vrais nombres : arcs d'attention du dernier token (moyenne des têtes ; ⟨début⟩, le « puits », dessiné à part), **logit lens** (barre verte = top-1 lu à la sortie du bloc, vert si c'est le token final). Panneau synchronisé, liste « la prédiction se forme » (cliquable). Clic sur un bloc → vue détaillée de M0 ; retour au même bloc.
- Frise : lecture/pause, pas à pas (← → espace), vitesse, « suivre le token » / « vue d'ensemble » (cadrage calculé sur les coins projetés de la scène). FR/EN pour toute la vue trajet (`src/i18n.ts`). Libellés : masquage automatique des chevauchements par priorité.
- Boucle visuelle : ~14 captures. Corrigé : vue de face trop plate (→ diagonale), caméra de suivi trop basse (arcs vus par la tranche), arcs écrasés par le puits d'attention, chevauchement des noms, frise recouverte, ⟨début⟩ non traduit, plantage des libellés JSX.
- **Mesures (écran Retina ×2, 1440×900)** : E8 = **30,1 s** (16 blocs) et **43,3 s** (28 blocs, trace de charge) ≤ 60 s ✅ ; E3 = min **131 i/s** ✅ ; 0 erreur. → **AN-003** : l'outil de mesure a d'abord donné 45,6 / 120,8 / 48,3 s (rechargement Vite, vrai bug de fin de lecture, détection en retard) ; corrigé et recalé sur la valeur calculée.
- E2 : `tests/e2e/numbers.spec.ts` — logit lens des 16 blocs, top-3 de chaque étape et top-10 final affichés = trace ✅.
- Reste pour E7 : les libellés 3D de la vue « dans un bloc » sont encore en français → refaits en M2.
- Preuve : `docs/preuves/M1_*.png`, `docs/preuves/M1_mesure_1b.json`, `docs/preuves/M1_mesure_charge28.json`.
- Suivant : M2 (zoom attention et MLP).

## 2026-11-24 17:34 (commit) — M2 · zoom dans le bloc : attention et MLP, avec les vrais nombres
- **Trace enrichie (schéma 2)** : V et sortie de chaque tête (8 dims), détail des deux RMSNorm (x, RMS, poids, y), norme du flux après l'attention. Nouveaux contrôles dans le script de trace : RMSNorm recalculée (1,0 %), Σ p·V recalculé (0,3 %), silu(gate)·up recalculé (0,6 %) — tolérance 5 % **dérivée** de l'arrondi bf16 (leçon AN-001). Trace 1B régénérée (0,13 Mo gzip), notebook Kaggle régénéré (même code).
- **Vue « dans un bloc »** : 9 étapes (① RMSNorm, ② Q K V, ③ scores Q·K, ④ softmax + masque, ⑤ mélange des V, ⑥ toutes les têtes / GQA, ⑦ addition, ⑧ MLP SwiGLU, ⑨ addition). Caméra qui vole vers la partie de l'étape (cadrage dans la moitié haute de l'écran, la carte occupe le bas). Partie active en avant, reste atténué. Tête sélectionnable (clic sur une grille ou curseur) ; groupe K/V partagé en pointillés ; ligne du dernier token en vert.
- **Carte de calcul** (nombres en HTML, révélés ligne par ligne) avec les vrais nombres et l'étiquette « trace » ou « calculé ici ». Exemple réel (bloc 10, tête 1) : « it » regarde « satellite » à **32,03 %** (⟨début⟩ 24,41 %) — le pronom va chercher son antécédent.
- FR/EN complet, y compris les libellés 3D du bloc (dette E7 de M1 soldée).
- Boucle visuelle : ~12 captures. Corrigé : carte qui masquait la tête zoomée (→ cadrage dans une région de l'écran), carte transparente, **collision de classe CSS `calc`** (une ligne recalculée se superposait à la ligne « satellite »), étape « addition » vide en 3D (→ barres de norme réelles après l'attention), libellés tronqués.
- **Tests** : `tests/m2-math.test.ts` (4 calculs refaits sur le JSON publié = trace), `tests/i18n.test.ts` (E7 : mêmes clés, rien de vide, anglais ≠ français hors 24 termes techniques listés), `tests/e2e/block.spec.ts` (E2 : RMSNorm, softmax, sortie de tête, MLP affichés = trace). 11 tests unitaires + 2 e2e verts.
- **E3 vue bloc** (dpr 2) : 3 séries, minimum 56 / 60 / 60 i/s, médiane 141–143 → OK. Chutes ponctuelles à 60 i/s non liées à une étape (sonde : chaque étape seule tient 144 i/s) : fréquence d'affichage de la fenêtre de test, pas la scène.
- Preuve : `docs/preuves/M2_*.png`, `docs/preuves/M2_mesure_fps.json`.
- Suivant : M3 (exemple modifiable : ta phrase, la température, modèle en direct).

## 2026-11-24 17:48 (commit) — M5 · le coffre alimente le schéma, FR/EN (M3 et M4 laissés pour plus tard, à la demande d'Axel)
- **Extracteur** `scripts/build-content.mjs` (lecture seule du coffre) + repères `content/pieces.json` : 12 fiches (7 « répondre » : tokens, embeddings, attention, flux résiduel, RMSNorm, MLP, sortie ; 5 « fabriquer » : données, tokenizer, pré-entraînement, lois d'échelle, fine-tuning). Chaque fiche : question, en clair, image, piège, mots à retenir (définitions de `Lexique/`), liens vers les enquêtes (Obsidian + artifact s'il existe). Texte **recopié tel quel** ; seules retouches : syntaxe Obsidian retirée, étiquette « → La réponse. » retirée, majuscule initiale. « Mes notes » jamais lu.
- Fine-tuning : l'enquête #18 n'existe pas encore → fiche « en attente », qui se remplira seule. Les 5 fiches « fabriquer » sont prêtes pour M4.
- 3 itérations sur les repères (passages coupés au milieu d'un gras, mauvais paragraphe choisi, définitions absentes du Lexique → remplacées par des termes définis : « GELU - SwiGLU », « Ratio Chinchilla », « Fenêtre de contexte » ; aucune définition inventée).
- **Anglais** : 124 phrases traduites (Claude Code, en session, cf. A_TRANCHER Q2), rangées par empreinte de la phrase FR dans `content/translations.json` (FR et EN côte à côte, relisibles). Structure vérifiée (mêmes lignes, même gras).
- **Interface** : fiche dépliable dans le panneau, liée à l'étape du trajet et à l'étape du bloc. Capture FR + EN.
- **E9** `tests/content.test.ts` (faux coffre de test, le vrai n'est jamais touché) : modifier une analogie → `npm run content` met la fiche FR à jour, la phrase anglaise correspondante repasse « à traduire » (pas d'anglais périmé), les autres traductions restent ; « Mes notes » n'est jamais publié ; `npm run content:check` détecte le contenu périmé ✅. **E7** : test i18n vert, 0 phrase à traduire ✅.
- Tests : 13 unitaires + 2 e2e verts ; build OK.
- Nouvelle question : A_TRANCHER Q5 (que voit un visiteur public quand il clique « lire l'enquête » ?).
- Preuve : `docs/preuves/M5_fiche_fr.png`, `docs/preuves/M5_fiche_en.png`.
- Suivant : selon Axel — M3 (exemple modifiable), M4 (fabriquer) ou M6 (en ligne).

## 2026-11-24 17:56 (commit) — Pages « enquête » (décision Axel, A_TRANCHER Q5)
- `npm run content` génère aussi **une page par enquête** (18) depuis le coffre : `public/enquetes/<n>.html` + index `content/enquetes.json`. Route `#/enquete/13`, sommaire `#/enquetes`, lien depuis chaque fiche et depuis le pied du panneau.
- Conversion Obsidian → web : liens entre enquêtes → liens internes ; termes du `Lexique/` → soulignés, définition au survol ; liens vers des notes non publiées (Prospection, projets) → texte simple ; encadrés → citations titrées ; intégrations `![[…]]` retirées ; **aucun HTML brut des notes interprété**.
- **Suivi personnel non publié** (liste modifiable `content/pages.json`) : « Mon/Ton hypothèse », « Bilan », « Questions de vérification », quiz, « Page de carnet », « Ce que tu me renvoies », mode d'emploi, corrigés, « Mes notes ».
- Schémas Mermaid des enquêtes dessinés (7/8) ; bibliothèque chargée seulement sur ces pages. **Le schéma de l'enquête 12 a une erreur de syntaxe dans la note** (ligne 6 : `V"VOCABULAIRE…"` au lieu de `V["VOCABULAIRE…"]`) → code affiché avec une mention ; se dessinera dès la note corrigée.
- Bug trouvé par le test : les titres des encadrés disparaissaient (marqueur HTML avalé par le parseur) → corrigé.
- Tests : `tests/content.test.ts` (pages : sections personnelles absentes, liens, Lexique, HTML neutralisé), `tests/e2e/pages.spec.ts` (fiche → page → Mermaid → retour). 14 unitaires + 3 e2e verts.
- Preuve : `docs/preuves/M5_page_enquete13.png`, `docs/preuves/M5_mermaid14.png`.

## 2026-11-24 18:03 (commit) — M3 · exemple modifiable : ta phrase, la température, le modèle en direct
- Onglet **« À toi »** dans le panneau : phrase libre ; **tokenizer en direct** (Llama 3, dans un Web Worker, sans GPU) avec numéros des tokens — mêmes numéros que la trace pour la phrase tracée (128000, 791, 24088…) ; **température** 0–2 ; **token suivant** ; **tirage au hasard** + « ajouter à la phrase » ; liste des **phrases tracées** (`public/traces/index.json`, `npm run traces:index`).
- **Température sur la trace** (sans modèle) : exacte à T = 1 (log Z = logit₁ − ln p₁, déduit de la trace) et à T → 0 ; approximation signalée ailleurs (renormalisée sur les 50 meilleurs tokens gardés). Les barres 3D de la sortie suivent la température (échelle absolue). `tests/temperature.test.ts` : T = 1 redonne le top-10 de la trace, T → 0 glouton, entropie croissante avec T (sur les 50 — sur le seul top-10 elle n'a pas à l'être : mon test initial était faux, corrigé).
- **Direct** (`src/live/worker.ts`, Transformers.js + WebGPU, Web Worker) : 1B par défaut, 3B en option « lent » (A_TRANCHER Q4 appliqué). **Passe de chauffe** au chargement (leçon AN-002).
- **Mesures via l'interface réelle** (`scripts/measure-m3.mjs`, Mac d'Axel, modèle en cache) :
  - **1B** : chargement 19,1 s + chauffe 5,0 s → **1er résultat 25 s après le clic** (M0 : 38 s) → **E5 ✅** ; passe avant 0,5–0,7 s. **E6 ✅** : même phrase que la trace → top-1 identique, 8/10 en commun. T = 0,5 → « was » 96 %. Phrase FR nouvelle (12 tokens) : « a » 28,5 %, « était » 26,0 %.
  - **3B** : 63 s + 33 s → 1er résultat **107 s** (E5 non tenu, cohérent avec AN-002 : d'où « lent ») ; 4–11 s par phrase. E6 3B en attente de la trace Kaggle.
- Régressions attrapées par les tests et corrigées : `location` lu au démarrage du store (cassait les tests Node), `index.json` lu comme une trace.
- Tests : 17 unitaires + 3 e2e verts ; build OK (worker séparé, 546 Ko).
- Preuve : `docs/preuves/M3_direct_1b.json`, `docs/preuves/M3_direct_3b.json`, `docs/preuves/M3_*.png`.
- Suivant : M4 (fabriquer) puis M6 (en ligne).

## 2026-11-24 18:22 (date) — Note de suivi dans Obsidian (autorisation d'Axel)
- `npm run obsidian` (`scripts/sync-obsidian.mjs`) écrit **« Schéma du modèle — Suivi »** dans le coffre : tâches d'Axel, questions à trancher, étapes faites, dernière étape en détail ; chemins du dépôt → liens GitHub, chemins de rendus → dossier local. Note entièrement générée, à relancer à chaque étape. Lien ajouté en tête du « Journal du projet » de `Schéma du modèle.md`.
- **AN-004** : heures de ce journal inventées (jusqu'à « 25/11 00:40 » alors qu'il était 18:16 le 24/11) → remplacées par les heures des commits ; date M3 corrigée dans le coffre ; règle « heures lues avec `date`/`git log` » ajoutée à `CLAUDE.md`.
- Non fait : la ligne de trace dans `Journal.md` du coffre (règle 8 du coffre) — refusée par le contrôle des permissions ; laissée à la décision d'Axel.

## 2026-11-24 21:42 (commit) — Tâches d'Axel faites par Claude, à sa demande ; vraies traces du 3B
- **Tâche 1 (traces)** : pas d'accès au compte HF/Kaggle d'Axel → traces calculées sur **GitHub Actions** (CPU, 16 Go, gratuit en dépôt public) avec `scripts/trace_batch.py` et `.github/workflows/trace.yml`, à partir des copies publiques `unsloth/…` des poids officiels (même licence Llama 3.2). **15 traces** (3B Instruct, 3B base, 1B Instruct × 5 phrases), **E1 vert 15/15**, 1,4–2,0 s par phrase pour le 3B. Run : https://github.com/axelphilipp14-star/schema-llama/actions/runs/45482108528 · rapport `docs/preuves/traces_github_actions_rapport.json`.
- `rope_theta` absent des traces (transformers récent : `rope_parameters`) → correctif dans `trace_core.py` ; traces existantes complétées depuis le `config.json` officiel (`scripts/fill-rope.py`, provenance notée dans `meta.rope_source`). Aucun nombre tapé en dur.
- **Tâche 2 (phrases)** : `scripts/sentences.json` — pronom EN/FR, fait (« The capital of France is »), ambiguïté (« La souris… »), IA × spatial (« To cool a data center in orbit… »). 6 à 12 tokens. Sans les prédictions d'Axel (c'était l'exercice).
- **Tâche 3** : `docs/analyses/bbycroft.md` → idée retenue tout de suite : **RoPE** expliqué dans l'étape ② du bloc (Q, K après rotation) — manque qu'un pro aurait vu.
- **Tâche 4** : fiche [lu] `docs/analyses/lu-animatedllm.md` (arXiv 2601.04213, lu en entier).
- **Le schéma passe au vrai 3B** (trace par défaut `3b-instruct-en-satellite`, 28 blocs) ; trace de dev 1B retirée (remplacée par la trace 1B du serveur).
- **Mesures sur le 3B** : E8 = **43,3 s** ✅ ; E3 trajet min 59 i/s, bloc min 57 i/s ✅ (écran à 60 Hz) ; **E6 3B** ✅ top-1 identique, 8/10 ; E5 3B 118,9 s ✗ (attendu, AN-002, option « lent »). Tests : **129 unitaires** (invariants et recalculs sur les 15 traces) + 3 e2e verts.
- Observation pour M4 : « The capital of France is » → « Paris » **69,9 %** (Instruct) contre **24,6 %** (base) : l'effet du fine-tuning, chiffré.
- Preuve : `docs/preuves/3B_*.png`, `docs/preuves/M1_mesure_3b.json`, `docs/preuves/M2_mesure_fps_3b.json`, `docs/preuves/M3_direct_3b.json`.

## 2026-11-24 21:51 (commit) — M4 · fabriquer : données → tokenizer → pré-entraînement → fine-tuning
- Sélecteur **1 Fabriquer / 2 Répondre** en tête du panneau. Scène 3D à 4 stations (caméra qui vole d'une station à l'autre, vue d'ensemble), panneau avec les **chiffres et leur source** (étiquettes Meta / calculé / trace) et les fiches tirées des enquêtes (données, tokenizer, pré-entraînement + lois d'échelle, fine-tuning).
- Chiffres officiels vérifiés sur la fiche Meta de Llama 3.2 3B (24/11/2026) → `content/fabriquer.json` : jusqu'à 9 000 milliards de tokens, données jusqu'à déc. 2023, 460 000 h de GPU H100 pour le 3B, 133 t CO₂eq, distillation depuis Llama 3.1 8B/70B après élagage, tours SFT + RS + DPO. **Incohérence de la source signalée** (916 000 h annoncées en texte, tableau 370 000 + 460 000 + 86 000) : on affiche le tableau et on le dit.
- **Calculé dans le navigateur, à partir des traces** : paramètres recalculés depuis la config = **3,21 Md** (Meta : 3,21 B ; 1B : 1,24 Md) — `tests/fabriquer.test.ts` ; tokens par paramètre ≈ 2 801 (Chinchilla ≈ 20) ; 6·N·D ≈ 1,7 × 10²³ FLOP ; tokens par mot sur nos 5 phrases : 1,05 (EN) contre 1,33 (FR) ; perte −ln p du modèle de base sur « The capital of France is » → « Paris » (24,6 %) = 1,40.
- **Station fine-tuning** : base contre Instruct sur les 5 phrases (vraies traces) — le premier choix de l'Instruct gagne à chaque fois : Paris 24,6 → 69,9 %, souris 17,7 → 35,0 %…
- Station tokenizer : les 128 256 tokens en 36 × 36 cubes (1 cube = 99 tokens), les tokens de la phrase s'allument à leur vraie place. Entonnoir des données signalé « schéma, pas à l'échelle » (Meta ne publie pas les volumes par étage).
- Boucle visuelle : 10 captures ; corrigé : vocabulaire invisible, tableau écrasé, notation scientifique, somme d'heures recalculée à tort (je remplaçais une valeur publiée par mon addition de valeurs arrondies).
- Tests : 131 unitaires + 4 e2e (`tests/e2e/make.spec.ts` : pourcentages base/Instruct affichés = traces) verts.
- Preuve : `docs/preuves/M4_*.png`.

## (heure du commit) — M6 · en ligne ; phases D et F
- **Site publié** : https://axelphilipp14-star.github.io/schema-llama/ (`.github/workflows/pages.yml` : tests unitaires puis build puis déploiement, à chaque push). Page **À propos** (sources des nombres, ce qui est vérifié, limites, licence, inspirations), meta description, compteur i/s masqué en production (`?fps` pour l'afficher), lien Obsidian masqué hors du Mac d'Axel.
- **E4** sur le site publié : utilisable en 2,4 s (1re visite), trace 196 Ko gzip, 0 erreur ; vues vérifiées : trajet, À propos, enquête 13, fabriquer, anglais.
- **Non vérifié** : le direct (WebGPU) sur le site publié — test interrompu à la demande d'Axel pendant le téléchargement ; à refaire.
- **Phase D** : `docs/RAPPORT.md` (E1–E9 : valeur mesurée, preuve, statut ; ce qui n'est pas fait). **Phase F** : `docs/LECONS.md`, anomalies classées par cause racine (spécification et mesure, pas code).
- Incident : un push avec un test rouge (chaîne de commandes sans arrêt sur échec) ; la publication l'a refusé ; corrigé.
