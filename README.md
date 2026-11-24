# Llama 3.2 3B en 3D

**Site : https://axelphilipp14-star.github.io/schema-llama/** · [English](https://axelphilipp14-star.github.io/schema-llama/?lang=en)

Schéma 3D interactif de **Llama 3.2 3B** : comment il est **fabriqué** (données → tokenizer → pré-entraînement → fine-tuning) et comment il **répond** (tokens → embeddings → 28 blocs → token de sortie), avec les **vrais nombres** du modèle.

- **Répondre** : suivre un token de bout en bout (≈ 43 s), entrer dans un bloc et dérouler le calcul en 9 étapes (RMSNorm, Q/K/V avec RoPE, scores, softmax, mélange des V, GQA, SwiGLU) avec les nombres de la trace.
- **À toi** : ta phrase découpée en tokens en direct, la température, et Llama 3.2 1B (ou 3B) qui tourne dans le navigateur (WebGPU).
- **Fabriquer** : chiffres officiels de Meta et calculs refaits depuis les traces (paramètres, perte, modèle de base contre Instruct).
- **Fiches et enquêtes** : le texte vient des enquêtes d'Axel (coffre Obsidian), en français et en anglais.

## D'où viennent les nombres
Traces calculées d'avance (méthode d'[AnimatedLLM](https://arxiv.org/abs/2601.04213)) : `scripts/trace_core.py`, exécuté sur GitHub Actions (`.github/workflows/trace.yml`). Chaque trace passe des contrôles (somme des attentions, softmax(Q·K) recalculé, Σ p·V, RMSNorm, SwiGLU, top-1 = génération) et des tests revérifient les nombres publiés et affichés (`npm test`, `npm run e2e`). Détails et limites : page « À propos » du site.

## Commandes
`npm run dev` · `npm test` · `npm run e2e` · `npm run content` (lit le coffre) · `npm run build`

Journal, exigences, anomalies : [`docs/`](docs/). Built with Llama — licence communautaire Llama 3.2.
