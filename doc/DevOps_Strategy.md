# Présentation DevOps – Flipper

## Objectif

L’idée est simple : mettre en place une approche DevOps **pragmatique**, qui colle à notre projet Flipper et à notre rythme.

On ne cherche pas à tout faire d’un coup, mais à avancer étape par étape :

* **Aujourd’hui** : fiabiliser nos déploiements avec Docker et Kubernetes
* **Plus tard** : aller plus loin avec Terraform et Ansible quand on aura le temps et le besoin

---

## Vision actuelle

### Docker : une base solide

Docker nous aide surtout à éviter les mauvaises surprises.

Concrètement, ça nous permet de :

* travailler tous avec le même environnement (local, CI, prod)
* éviter les fameux “ça marche chez moi”
* livrer des versions stables et reproductibles

Pour Flipper :

* une image dédiée pour le backend Go (WebSocket)
* des builds propres et reproductibles via la CI
* des versions d’images alignées avec nos branches et releases

---

### Kubernetes : déployer sans stress

Kubernetes vient compléter Docker en gérant le déploiement.

Avec lui, on peut :

* déployer et mettre à l’échelle facilement
* redémarrer automatiquement si quelque chose plante
* exposer nos services proprement
* préparer plusieurs environnements (dev, staging, prod)

On reste volontairement simples au début, avec :

* un `Deployment` pour le backend
* un `Service` pour l’exposer
* des `ConfigMap` pour la config
* des `Secret` pour les données sensibles
* des endpoints de santé (`/health`) pour surveiller

---

## CI/CD à court terme

L’objectif est d’avoir un pipeline clair et fiable :

1. Lint + tests
2. Build de l’image Docker
3. Push dans le registre
4. Déploiement sur Kubernetes
5. Vérification que tout fonctionne

Ce que ça nous apporte :

* des retours rapides quand on code
* moins de bugs en production
* une traçabilité claire entre code et déploiement

---

## Roadmap

### Terraform : gérer l’infra comme du code

Quand l’infrastructure deviendra plus importante, Terraform nous aidera à :

* versionner notre infra
* recréer des environnements facilement
* sécuriser les changements avec des reviews

---

### Ansible : automatiser les opérations

Ansible sera utile pour :

* configurer des machines en dehors de Kubernetes
* automatiser certaines tâches d’exploitation
* rendre nos procédures plus fiables et répétables

---

## Plan progressif

### Maintenant

* finaliser les Dockerfiles
* intégrer le build et le push dans la CI

### Prochaine étape

* déployer sur Kubernetes avec des healthchecks
* bien séparer dev / staging / prod
* ajouter un minimum d’observabilité (logs + métriques)
* sécuriser les images et les secrets

### Plus tard

* ajouter Terraform quand ce sera nécessaire
* introduire Ansible si on en a besoin
* documenter les procédures (runbooks)

---

## En résumé

On avance de façon simple et efficace :

* **Docker + Kubernetes** pour stabiliser rapidement
* **Terraform + Ansible** plus tard, quand ça deviendra utile

L’objectif n’est pas d’avoir une stack parfaite, mais une stack **qui nous aide vraiment au quotidien**.
