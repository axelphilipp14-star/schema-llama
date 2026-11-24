# Reprise — consigne autoportante

**Projet** : schéma 3D interactif de Llama 3.2 3B (voir `CLAUDE.md`, plan complet dans `docs/00_CADRAGE.md`).
**Méthode** : skill `projet-autonome-long`. Axel n'est sollicité qu'aux points de décision ; ses tâches sont dans `docs/POUR_AXEL.md`, ses rendus dans `docs/retours-axel/`.

## Où on en est
Voir la dernière entrée de `docs/PROGRESS.md`.

## Avant de toucher au code
1. Lire `docs/PROGRESS.md`, `docs/anomalies/`, `docs/A_TRANCHER.md`, `docs/retours-axel/`.
2. Traiter chaque retour d'Axel (corriger franchement, intégrer, cocher la tâche).
3. `npm install` puis `npm test` : doit être vert.
4. `npx vite` puis `node scripts/shot.mjs` : la capture doit être propre et sans erreur console.

## Si `docs/retours-axel/traces.zip` est arrivé
Dézipper dans `public/traces/`, `npm test` (E1 sur les nouvelles traces), basculer la trace par défaut de `src/App.tsx` sur `3b-instruct-en-satellite`, reprendre les captures.

## Ce qui reste
M0 → M6, voir le tableau des étapes dans `docs/00_CADRAGE.md` et le plan.

## Règles de travail
- Un changement par essai, puis capture/mesure.
- Tout échec : `docs/anomalies/AN-XXX.md`. Toute preuve : `docs/preuves/`.
- Étape finie : tests verts → commit + push → `docs/PROGRESS.md` → une ligne sous « Journal du projet » dans `~/Desktop/AI x spatial/Schéma du modèle.md` (seule modification permise dans le coffre).
