# DESIGN.md — règles visuelles

But : qu'un ingénieur du milieu reconnaisse l'architecture exacte au premier coup d'œil, et qu'Axel suive un token sans se perdre.

## Couleurs (fond sombre)
| Rôle | Couleur | Usage |
|---|---|---|
| Fond | `#0b0d12` | scène et page |
| Surface | `#141821` | panneaux, fiche |
| Trait / grille | `#2a3040` | contours, axes |
| Texte | `#e6e8ee` / secondaire `#8a93a6` | |
| Embeddings / tokens | `#4fb3ff` bleu | table d'embedding, vecteurs d'entrée |
| Attention | `#ff8a3d` orange | Q, K, V, scores |
| MLP | `#b07cff` violet | gate, up, down |
| Normalisation | `#7d8597` gris acier | RMSNorm |
| Flux résiduel | `#e6e8ee` blanc à 60 % | la « colonne vertébrale » |
| Sortie / probabilités | `#3ddc97` vert | logits, top-10, token choisi |
| Fabriquer (phase 1) | `#f2c14e` ambre | stations données → fine-tuning |
Valeurs numériques : négatif → bleu froid, positif → rouge chaud, échelle divergente centrée sur 0, jamais arc-en-ciel.

## Typographie
- Texte : **Inter** (400, 600). Nombres : **JetBrains Mono** (chiffres tabulaires).
- Tailles : titre 20 px, texte 14 px, nombres 13 px. Libellés 3D : 12–14 px équivalent écran, toujours face caméra.

## Règles 3D
1. **Le flux résiduel est l'axe.** Une ligne verticale traverse tout le modèle ; chaque bloc s'y branche (lecture → calcul → addition).
2. **Matrice = grille de cellules** (InstancedMesh), taille proportionnelle à la vraie forme (log si nécessaire, signalé).
3. **Une couleur = une famille d'opération** (tableau ci-dessus), jamais réutilisée pour autre chose.
4. **Caméra orbitale**, transitions de zoom de 600–900 ms, toujours un bouton « vue d'ensemble ».
5. **Jamais plus de ~8 nombres lisibles à l'écran** ; le reste en couleur. Survol = valeur exacte.
6. **Lumière douce** : une lumière ambiante + une directionnelle, pas d'ombres portées lourdes.
7. **Performance** : ≥ 50 i/s sur le Mac d'Axel (A18 Pro, 8 Go). InstancedMesh pour toute répétition, pas de géométrie par cellule.
8. **Poids ≠ activations** : les **poids** (appris une fois, identiques pour toute phrase : table d'embedding, tête de sortie, gains RMSNorm, matrices du MLP) sont en **fil de fer translucide** (`WeightSlab`) ; les **activations** (calculées pour la phrase : vecteurs, cases d'attention, neurones allumés, flux) sont des **volumes pleins**. Légende toujours visible dans la vue « Répondre ».
9. **Mini-carte 2D** en haut de la scène : le schéma de la vue en cours, l'étape active allumée, cliquable ; la 3D et la carte ne se contredisent jamais.
10. **Honnêteté** : chaque nombre indique sa source (trace / direct) ; une échelle compressée est signalée.
