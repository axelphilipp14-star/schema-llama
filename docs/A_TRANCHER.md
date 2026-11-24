# À trancher (questions non urgentes)

| # | Question | Options | Recommandation | Bloque quoi |
|---|---|---|---|---|
| Q1 | Modèle des traces « répondre » | 3B-Instruct (défaut) · 3B base | Instruct (vient après le fine-tuning, c'est lui qui « répond ») ; base tracé aussi pour M4 | rien (défaut appliqué) |
| Q2 | Traduction anglaise des fiches | Claude Code en session (gratuit) · API Claude automatique (payant, clé à fournir) | en session | rien avant M5 |
| Q3 | Lancer Kaggle moi-même | Axel lance le notebook (défaut) · Axel me donne une clé API Kaggle (`~/.kaggle/kaggle.json`) et je pousse le notebook | Axel le lance (tâche 1, il apprend) | trace 3B réelle |
| Q4 | Modèle du direct (AN-002) | — | **Appliqué en M3 (défaut recommandé, sans objection d'Axel)** : 1B par défaut, 3B en option « lent ». Mesures : 1B 1er résultat 25 s, 3B 107 s. Réversible. | — |
| Q5 | ~~Lien « lire l'enquête » pour les visiteurs~~ | — | **Tranché par Axel le 24/11/2026 : une page par enquête, générée depuis le coffre** (sections de suivi personnel exclues, liste dans `content/pages.json`). | — |
