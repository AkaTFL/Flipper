# Documentation CI/CD

## Objectif
Documenter l'état de la chaîne CI/CD et tracer les travaux récents réalisés pour rendre le déploiement Kubernetes complet.

## État de la branche documentation
Sur cette branche, les workflows existants couvrent:
- CI backend et frontend.
- CD backend et frontend vers GHCR + déploiement Kubernetes.

Limites connues sur cette branche:
- Pas de dossier k8s versionné.
- Pas de déploiement IoT dans le workflow CD.
- Déploiement Kubernetes basé sur rollout restart sans alignement explicite des images sur le SHA du commit.

## Travaux réalisés sur la branche technique CI/CD
Une branche dédiée a été créée pour implémenter les manques: chore/ci-cd-hardening.

Travaux effectués:
- Ajout du dossier Kubernetes avec manifests de base:
	- namespace flipper
	- backend deployment + service
	- frontend deployment + service
	- iot deployment + service
- Ajout d'un Dockerfile IoT pour builder une image Mosquitto custom.
- Extension du workflow CD pour:
	- builder et push les images backend, frontend et iot
	- appliquer les manifests Kubernetes
	- fixer explicitement les images déployées sur le tag SHA
	- attendre le succès des rollouts backend, frontend et iot

## Sécurité et secrets requis
Secrets GitHub requis:
- GITHUB_TOKEN (fourni automatiquement par GitHub Actions)
- KUBE_CONFIG (kubeconfig du cluster cible)

## Stratégie de finalisation
Pour finaliser la CI/CD complète:
- merger les changements de chore/ci-cd-hardening
- vérifier les droits du token pour push sur GHCR
- exécuter un test de déploiement complet sur une branche de validation
- confirmer que les trois déploiements Kubernetes passent en rollout status

## Résultat attendu
Après intégration, la chaîne CI/CD doit couvrir:
- CI backend + frontend + IoT smoke
- CD backend + frontend + IoT
- Déploiement Kubernetes traçable via tags SHA
