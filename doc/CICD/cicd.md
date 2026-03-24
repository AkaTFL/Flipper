🚀 Documentation du Pipeline CD (Kubernetes)
Ce workflow GitHub Actions automatise le déploiement de l'application Flipper sur un cluster Kubernetes.

🛰️ Fonctionnement Global
Le pipeline s'active à chaque push sur la branche main.

[Image of CI/CD pipeline for Kubernetes with Docker and GitHub Actions]


1. Build & Push (Docker)

• Le code est récupéré via `actions/checkout`.

• Connexion au registre d'images GitHub (GHCR.io).

• Construction des images Docker pour le Backend et le Frontend.

• Envoi des images avec deux tags : `:latest` et le `SHA` du commit (pour la traçabilité).



2. Déploiement (Kubernetes)

• Connexion au cluster via le secret `KUBE_CONFIG`.

• Application des fichiers de configuration situés dans le dossier `k8s/`.

• Relance forcée des pods (`rollout restart`) pour garantir que les nouvelles images sont bien utilisées.

🔐 Configuration Requise (Secrets GitHub)
Pour que le déploiement fonctionne, les secrets suivants doivent être configurés :

• `GITHUB_TOKEN` : Géré automatiquement par GitHub.

• `KUBE_CONFIG` : Le fichier de config du cluster (nécessaire pour `kubectl`).

---
