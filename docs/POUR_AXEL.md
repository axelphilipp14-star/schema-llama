# Pour Axel — tâches en cours

Tâches proposées une fois. Rends ce que tu veux, quand tu veux, dans `docs/retours-axel/`.

> **24/11/2026 : les 4 tâches ci-dessous ont été faites par Claude, à la demande d'Axel.** Résultats : 1 → traces calculées sur GitHub Actions (au lieu de Kaggle) ; 2 → `scripts/sentences.json` (sans tes prédictions : c'était la partie exercice) ; 3 → `docs/analyses/bbycroft.md` ; 4 → `docs/analyses/lu-animatedllm.md`.

## ✅ 1. Ouvrir l'accès au modèle (30–45 min)
- **Quoi** : sur huggingface.co, ouvre `meta-llama/Llama-3.2-3B-Instruct` et accepte la licence (fais pareil pour `Llama-3.2-3B` et `Llama-3.2-1B-Instruct`). Crée un jeton « Read » (Settings → Access Tokens). Sur Kaggle : Settings → vérifie ton numéro de téléphone (nécessaire pour le GPU), puis dans un notebook : Add-ons → Secrets → `HF_TOKEN` = ton jeton.
- **Puis** : importer `notebooks/trace_llama32.ipynb` dans Kaggle (File → Import Notebook), Accelerator = **GPU T4 x2** ou T4, Internet = On, Run All. Télécharger `traces.zip` depuis l'onglet Output et le déposer dans `docs/retours-axel/`.
- **Pourquoi** : c'est la source des vrais nombres du 3B. Tu verras ce que « charger un modèle en fp16 » veut dire : 3,2 milliards de paramètres × 2 octets ≈ 6,4 Go sur le GPU.
- **Rendu** : `traces.zip` + une ligne : combien de temps ça a pris, la mémoire GPU affichée.

## ✅ 2. Choisir 5 phrases d'exemple (30 min)
- **Quoi** : 5 débuts de phrase courts (≤ 12 mots), au moins 2 en français et 2 en anglais. Une avec un pronom à résoudre (« Le satellite a perdu son antenne parce qu'elle »), une ambiguë, une IA × spatial. Pour chacune : quel mot tu penses que le modèle va prédire ensuite.
- **Pourquoi** : ce sont les phrases que tout le monde verra ; ta prédiction, comparée au vrai top-10, est un très bon exercice.
- **Rendu** : `docs/retours-axel/phrases.md`.

## ✅ 3. Comparer avec bbycroft.net/llm (20–30 min)
- **Quoi** : parcours le site. Note 5 choses qui t'aident à comprendre, 3 qui te perdent, et un endroit où tu n'as pas compris ce qui se passe.
- **Pourquoi** : ça fixe ce qu'on garde et ce qu'on fait mieux (lui montre un petit GPT ; nous, le vrai Llama 3.2 3B avec GQA, RMSNorm, SwiGLU).
- **Rendu** : `docs/retours-axel/bbycroft.md`.

## ✅ 4. Lire AnimatedLLM (Kasner & Dušek, 2026) — 45 min
- **Quoi** : le papier dont vient la méthode « traces calculées d'avance ». Fiche [lu] : la question, la méthode, ce qu'ils montrent, une limite.
- **Rendu** : `docs/retours-axel/lu-animatedllm.md`.
