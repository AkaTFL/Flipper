1. Le "Conventional Commits"
C'est la norme la plus répandue. Elle structure le message de commit pour qu'il soit compréhensible par les humains et les machines (pour générer des changelogs automatiques).

Structure : <type>(<scope>): <description>
feat : Ajout d'une nouvelle fonctionnalité
fix : Correction d'un bug.
docs : Modification de la documentation.
style : Changements cosmétiques (espace, formatage) sans modification de logique.
refactor : Modification du code qui n'ajoute rien et ne corrige rien.
test : Ajout ou correction de tests.
chore : Tâches de maintenance (mise à jour de dépendances, config build).
Exemple : feat(auth): ajouter la connexion via Google  

2. La règle des "50/72" pour les messages
Pour qu'un historique soit propre dans un terminal ou une interface web :

Sujet (1ère ligne) : Maximum 50 caractères. Il commence par une majuscule et n'a pas de point final. Utilisez l'impératif (ex: "Add" plutôt que "Added").
Corps (Optionnel) : Si le changement est complexe, sautez une ligne et expliquez le "pourquoi" (et non le "comment"). Limitez chaque ligne à 72 caractères.

3. Stratégies de branches (Git Flow vs GitHub Flow)
Le nommage des branches doit refléter leur utilité :

main / master : Le code de production stable.
develop : Le code en cours d'intégration (optionnel selon le flux).
feature/nom-de-la-feature : Pour les nouveaux développements.
hotfix/nom-du-bug : Pour les corrections urgentes en production.
release/v1.2.0 : Pour la préparation d'une mise en production.


**Document rédigé par** :[Bonnichon-Jaques Baptiste](https://github.com/lm-hg), [Hugo Martins](https://github.com/AkaTFL)
**Dernière mise à jour** : 17 février 2026  
**Version** : 0.1.0 
