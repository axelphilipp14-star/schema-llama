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

## Ce qu'on en tire pour notre schéma (fait le 24/11/2026, à la demande d'Axel)
| Idée | Où | Effort |
|---|---|---|
| ✅ Montrer **RoPE** : la position entre dans Q et K (étape ② du bloc) | M2, carte « Q, K, V » | fait |
| ✅ Distinguer **poids** (fil de fer) et **activations** (plein), légende dans la scène | DESIGN.md règle 8, `WeightSlab` | fait |
| ✅ **Comparer 1B et 3B** : onglet « 1B ↔ 3B » (dimensions, paramètres, premier choix, bande du logit lens par bloc) | `src/ui/CompareTab.tsx` | fait |
| ✅ **Mini-carte 2D** synchronisée et cliquable (trajet, bloc, fabrication) | `src/ui/MiniMap.tsx` | fait |
Ce qu'on garde d'avance : le vrai modèle (Llama 3.2 3B), l'architecture actuelle, FR/EN, la phrase libre et la température en direct.
