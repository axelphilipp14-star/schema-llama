# [lu] AnimatedLLM — Kasner & Dušek (tâche 4, faite par Claude à la demande d'Axel, 24/11/2026)

**Référence** : Zdeněk Kasner, Ondřej Dušek (Université Charles, Prague), *AnimatedLLM: Explaining LLMs with Interactive Visualizations*, arXiv:2601.04213 (v1 14/12/2025, v2 30/01/2026) ; atelier TeachNLP 2026 (ACL), p. 1–6. Code MIT : github.com/kasnerz/animated-llm. Lu en entier (version HTML v2) le 24/11/2026.

## La question
Comment expliquer le fonctionnement d'un LLM à un public **non technique** ? Les supports existants sont soit statiques (Alammar, 3Blue1Brown), soit techniques (Bycroft 2023). But affiché : « démystifier l'architecture » — tokenisation, embeddings, attention, génération mot à mot, entraînement à prédire le mot suivant.

## La méthode
- **Traces calculées d'avance** : sorties complètes du modèle sur des phrases choisies à la main (tokens, distributions de probabilité), sauvées en **JSON** ; l'application tourne **entièrement dans le navigateur** (React, site statique). Scripts Python fournis pour tracer d'autres modèles.
- **Modèles** (Hugging Face Transformers) : Olmo 3, Aya Expanse, **Llama 3.2**, Qwen 3, GPT-2 — tailles non précisées.
- **Quatre vues** : génération simple · génération détaillée (des embeddings à la distribution de sortie) · pré-entraînement simple (prédiction comparée au token cible) · pré-entraînement détaillé (lien avec la rétropropagation).
- **Interaction** : choisir une phrase, lecture / pause / pas à pas, raccourcis clavier ; ordinateur et mobile ; 5 langues (dont le français).

## Ce qu'ils montrent
Un outil plutôt qu'un résultat : pas d'étude utilisateur. Seule preuve : des essais lors de journées portes ouvertes pour lycéens, retours « généralement positifs », **sans chiffres**.

## Une limite
Pas de section « limites ». Les phrases sont figées (pas de phrase libre, pas de température), le papier ne dit pas si l'attention est stockée dans les traces, et l'architecture réelle (GQA, RoPE, RMSNorm) n'est jamais nommée : le niveau reste celui du schéma de principe.

## Ce que ça change pour notre projet
| AnimatedLLM | Notre schéma |
|---|---|
| Traces JSON calculées d'avance, app 100 % navigateur | **Même méthode** (c'est d'eux qu'elle vient) |
| Distributions de sortie (attention non documentée) | Attention complète par tête, Q/K/V, RMSNorm, SwiGLU, logit lens — chaque calcul revérifié (tests) |
| Phrases figées | Phrases tracées **+ phrase libre et température en direct** (WebGPU) |
| Vue pré-entraînement, plus tard le tokenizer | Notre M4 « fabriquer » prévoit données → tokenizer → pré-entraînement → fine-tuning : leur découpage en vue simple / vue détaillée est une bonne idée à reprendre |
| Pas d'évaluation chiffrée | À faire mieux : mesurer si quelqu'un suit un token en ≤ 60 s (E8) avec de vrais testeurs |
| Public : lycéens | Public : Axel et des pros de l'IA — d'où l'architecture exacte |

Confiance : élevée sur le contenu du papier (lu en entier) ; le dépôt GitHub (format exact des traces) n'a pas été lu.
