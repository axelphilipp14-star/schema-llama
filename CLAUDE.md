# CLAUDE.md — schema-llama

Schéma 3D interactif de **Llama 3.2 3B** : fabriquer (données → tokenizer → pré-entraînement → fine-tuning) et répondre (tokens → embeddings → 28 blocs → token de sortie). Pour Axel (apprend l'IA, pas ingénieur) et pour le montrer à des pros. Méthode : skill `projet-autonome-long`.

## À chaque reprise
Lire dans l'ordre : `REPRISE.md`, `docs/PROGRESS.md`, `docs/anomalies/`, `docs/A_TRANCHER.md`, `docs/retours-axel/`. Puis `npm test` doit être vert avant de toucher au code.

## Stack
Vite · React · TypeScript · React Three Fiber + drei · zustand · `@huggingface/transformers` (Web Worker, WebGPU) · Vitest · Playwright · GitHub Actions → GitHub Pages.

## Commandes
| Commande | Effet |
|---|---|
| `npm run dev` | serveur local (http://localhost:5173/schema-llama/) |
| `npm test` | Vitest : invariants des traces, contenu, i18n |
| `npm run e2e` | Playwright : captures + nombres affichés = trace |
| `npm run content` | lit le coffre (lecture seule) → `content/fr.json`, `content/en.json`, `content/a-traduire.json` |
| `npm run content:check` | vérifie que le contenu publié est à jour (code 1 sinon) |
| `npm run build` | build de production dans `dist/` |
| `uv run scripts/trace_local.py` | trace de dev (Llama 3.2 1B, CPU du Mac) |

## Chiffres du modèle (config.json officiel, vérifié 24/11/2026)
| Pièce | Llama 3.2 3B | Llama 3.2 1B |
|---|---|---|
| Couches | 28 | 16 |
| Dimension | 3 072 | 2 048 |
| Têtes query | 24 | 32 |
| Paires K/V (GQA) | 8 | 8 |
| Dimension d'une tête | 128 | 64 |
| MLP (intermediate) | 8 192 | 8 192 |
| Vocabulaire | 128 256 | 128 256 |
| Contexte max | 131 072 | 131 072 |
| Tie embeddings | oui | oui |
Le code ne met **jamais** ces nombres en dur : tout vient de `trace.config`.

## Règles
- **Coffre Obsidian** (`~/Desktop/AI x spatial/`) : lecture seule. Seule exception : ajouter une ligne datée sous `## Journal du projet` de `Schéma du modèle.md` à chaque étape finie.
- **Vrais nombres** : tout nombre affiché vient d'une trace (`public/traces/`) ou du modèle en direct, et l'interface dit lequel. Aucun nombre inventé, aucune maquette.
- **bbycroft.net/llm** : référence visuelle seulement, aucun code copié.
- **Licence Llama** : afficher « Built with Llama » sur le site.
- À chaque étape finie : tests verts → commit + push → `docs/PROGRESS.md` → ligne dans le Journal du projet du coffre.
- Une étape n'est montrée à Axel que propre en capture (boucle Playwright).
- Tout échec → `docs/anomalies/AN-XXX.md` (5 pourquoi). Traces brutes → `docs/preuves/`.
- Design : voir `DESIGN.md`.
- **Fiches (M5)** : repères dans `content/pieces.json`, texte recopié tel quel. Anglais dans `content/translations.json` (empreinte de la phrase FR → traduction) : après `npm run content`, traduire chaque entrée de `content/a-traduire.json` et l'ajouter à `translations.json`. Ne jamais publier une section « Mes notes » ni une note `auteur: axel`.
