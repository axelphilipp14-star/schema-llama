# Comparaison avec bbycroft.net/llm (tâche 3, faite par Claude à la demande d'Axel, 24/11/2026)

Site visité le 24/11/2026 (captures : `docs/preuves/bbycroft_accueil.png`, `docs/preuves/bbycroft_embedding.png`). Référence visuelle seulement : aucun code repris.

## Ce que fait le site
Parcours guidé en chapitres (Embedding, Layer Norm, Self Attention, Projection, MLP, Transformer, Softmax, Output). Texte à gauche, 3D à droite, synchronisés paragraphe par paragraphe (« Press Space to continue »). Modèle principal : **nano-gpt, 85 584 paramètres**, entraîné à trier 6 lettres (« CBABBC » → « ABBBCC »). Boutons GPT-2 small / XL / GPT-3 pour comparer les tailles.

## 5 choses qui aident
1. **Texte et 3D synchronisés** : chaque paragraphe déplace la caméra et allume la partie dont il parle.
2. **Code couleur constant** : vert = nombres en cours de calcul (activations), bleu = poids. On sait toujours ce qu'on regarde.
3. **Comparer les tailles** : passer de nano-gpt à GPT-3 fait sentir l'échelle d'un coup.
4. **Une mini-carte 2D** de l'architecture en haut du texte, qui situe la partie 3D en cours.
5. **Sommaire en chapitres** : on peut revenir à « Self Attention » sans tout rejouer.

## 3 choses qui perdent
1. **Un modèle jouet** : 85 000 paramètres qui trient des lettres. Ce n'est pas un LLM qui écrit, et un pro le voit tout de suite.
2. **Architecture GPT-2 (2019)** : LayerNorm, table de positions apprise, MLP GELU, attention multi-têtes classique. Les modèles actuels (Llama 3) ont RMSNorm, RoPE, SwiGLU, GQA.
3. **Beaucoup de texte, en anglais seulement, et pas d'exemple modifiable** : on ne peut pas taper sa phrase ni changer la température.

## Un endroit où l'on ne comprend pas ce qui se passe
La « Position Embed » : chez lui, la position est une table ajoutée à l'entrée. Le lecteur ne voit pas *pourquoi* le modèle a besoin de la position, ni que d'autres modèles font autrement. **Notre schéma a le défaut inverse : Llama encode la position par RoPE (une rotation de Q et K dans l'attention), et notre schéma ne le montre nulle part.** À corriger.

## Ce qu'on en tire pour notre schéma (à faire)
| Idée | Où | Effort |
|---|---|---|
| Montrer **RoPE** : la position entre dans Q et K (étape ② du bloc ; nos q8/k8 sont déjà après RoPE) | M2, carte « Q, K, V » + fiche | faible |
| Distinguer **poids** et **activations** par la forme ou la couleur (règle DESIGN.md) | DESIGN.md + scène | moyen |
| **Comparer 1B et 3B** sur la même phrase (16 vs 28 blocs, 2 048 vs 3 072) : les traces existent | onglet « À toi » | faible |
| **Mini-carte 2D** du trajet synchronisée avec la 3D | frise | moyen |
Ce qu'on garde d'avance : le vrai modèle (Llama 3.2 3B), l'architecture actuelle, FR/EN, la phrase libre et la température en direct.
