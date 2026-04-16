# Strategie de test

## Objectif
Mettre en place une base de qualite simple, rapide et evolutive pour securiser le projet Flipper pendant le developpement.

## Perimetre actuel
- Tests unitaires frontend sur la configuration physique et la logique de calcul isolee.
- Tests unitaires backend sur l'initialisation du hub et les flux de base de diffusion.
- Verification syntaxique des fichiers JavaScript du frontend et des tests.
- Execution automatique dans la CI sur les pull requests et sur `main`.

## Outils retenus
- `node:test` pour les tests frontend.
- `go test` pour les tests backend.
- Verification syntaxique via `node --check` pour une premiere barriere legere avant l'ajout d'un vrai linter.
- GitHub Actions pour l'execution automatique.

## Critere minimal pour une PR
- La CI doit passer.
- Aucun test existant ne doit casser.
- Toute logique metier nouvelle doit etre accompagnee d'au moins un test si elle est testable de maniere isolee.

## Prochaines etapes recommandees
- Ajouter des tests sur les objets frontend (`Ball`, `Wall`, `Palles`, `Bumper`).
- Ajouter des tests backend sur les handlers HTTP / WebSocket.
- Introduire un vrai linter JavaScript quand la structure frontend se stabilise.
- Ajouter un smoke test de chargement de `frontend/index.html`.
