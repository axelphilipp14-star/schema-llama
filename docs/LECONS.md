# Leçons (chacune renvoie à sa preuve)

1. **Une tolérance se dérive de la précision de ce qu'on mesure**, et le calcul s'écrit à côté du seuil. → AN-001 ; `scripts/trace_core.py` (`row_sum_tolerance`, tolérance 5 % des recalculs M2 justifiée).
2. **« Tient » et « est utilisable » sont deux exigences** ; une hypothèse de capacité matérielle se mesure en phase de faisabilité. → AN-002 ; le 3B tient mais met 2 minutes.
3. **Un instrument de mesure se calibre sur un cas dont on connaît la réponse** : la durée calculée de l'animation a démasqué trois défauts de l'outil. → AN-003.
4. **Même une métadonnée banale (une heure) est une mesure** : sans instrument (`date`, `git log`), ne pas l'écrire. → AN-004.
5. **La capture d'écran trouve ce que les tests ne cherchent pas** : collision de classe CSS, arcs d'attention vus par la tranche, vocabulaire invisible, carte qui masque la tête zoomée. → `docs/PROGRESS.md` (M1, M2, M4).
6. **Les tests trouvent ce que la capture ne voit pas** : titres d'encadrés perdus, régressions `location`/`index.json`, mauvais sélecteur. Les deux boucles sont nécessaires.
7. **Ne jamais remplacer une valeur publiée par une recomposition maison** (somme de valeurs arrondies 830 000 contre 833 000 publiés) ; quand la source se contredit, afficher la source et le dire. → M4.
8. **Un nombre affiché sans source n'est pas une valeur par défaut acceptable** : `rope_theta` manquant aurait affiché 500 000 tapé en dur ; corrigé en lisant la config officielle, provenance notée. → `scripts/fill-rope.py`.
9. **Pousser seulement si les tests passent** : une chaîne de commandes sans arrêt sur échec a poussé un test rouge ; la publication l'a bloqué (garde-fou utile), la chaîne a été corrigée. → commits M6.
