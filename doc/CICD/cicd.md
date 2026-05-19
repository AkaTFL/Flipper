# Documentation CI/CD

## Objectif
Documenter l'état de la chaîne CI/CD et tracer les travaux de déploiement Kubernetes local opérationnel.

## État actuellement opérationnel (19 mai 2026)

### Kubernetes local (kind) - LIVE 
- **Cluster** : `flipper` créé avec kind v0.31.0 
- **Namespace** : `flipper` dédié
- **Déploiements** : backend, frontend, iot — tous en Running 1/1 Ready
- **Services** : 
  - backend (ClusterIP 8080)
  - frontend (NodePort 30080 → 80)
  - iot (ClusterIP 1883)
- **Images** : flipper-backend:local, flipper-frontend:local, flipper-iot:local

### Capacités Kubernetes validées 
1. **Auto-healing** : suppression de pod → recréation automatique en <5s
2. **Scaling** : `kubectl scale --replicas=3` → 3 pods backend déployés
3. **Service Discovery** : DNS interne `iot-service.flipper.svc.cluster.local` résolu
4. **Health Probes** : Liveness/Readiness HTTP GET `/health` actives
5. **Exposition externe** : Frontend accessible via NodePort 30080 (ou port-forward)

## Artefacts de déploiement

### Fichiers Kubernetes (k8s/)
```
k8s/
├── namespace.yaml         # Namespace flipper
├── backend.yaml           # Backend deployment + service ClusterIP
├── frontend.yaml          # Frontend deployment + service NodePort
├── iot.yaml               # IoT deployment + service ClusterIP
└── kustomization.yaml     # Point d'entrée Kustomize
```

### Commandes clés de déploiement
```bash
# Build des images locales
docker build -t flipper-backend:local backend
docker build -t flipper-frontend:local frontend/flipper
docker build -t flipper-iot:local iot

# Chargement dans kind
kind load docker-image flipper-backend:local --name flipper
kind load docker-image flipper-frontend:local --name flipper
kind load docker-image flipper-iot:local --name flipper

# Déploiement complet
kubectl apply -k k8s

# Vérifications
kubectl get pods -n flipper -o wide
kubectl get deploy -n flipper
kubectl get svc -n flipper

# Port-forward pour accès frontend
kubectl port-forward -n flipper svc/frontend-service 8088:80
# http://localhost:8088
```

### Modifications aux manifests
- Images : `ghcr.io/OWNER/REPO/*:latest` → `flipper-*:local` (IfNotPresent)
- Frontend Service : ClusterIP → **NodePort 30080**
- Tous les pods ont des probes de santé HTTP

## État de la branche CI/CD (avant fusion)
La branche technique `chore/ci-cd-hardening` couvrait :
- Dossier k8s avec manifests de base
- Dockerfile IoT pour Mosquitto custom
- Workflow CD hardening

**État actuel** : Les manifests k8s sont validés et déployés avec succès en local.

## Sécurité et secrets requis pour CI/CD distant
Secrets GitHub à configurer pour déploiement en production :
- `GITHUB_TOKEN` (fourni automatiquement)
- `KUBE_CONFIG` (kubeconfig du cluster distant)

## Prochaines étapes (post-fusion sur develop)
1. ✅ Valider déploiement Kubernetes local
2. ⏳ Mettre à jour workflow GitHub Actions pour CI/CD complet
3. ⏳ Configurer secrets pour déploiement distant
4. ⏳ Tests de rollout progressif (rolling updates)
5. ⏳ Documentation des probes et monitoring


Kubernetes est **entièrement fonctionnel en local** avec :
- Déploiement complet en une commande
- Résilience et scaling validés
- Communication inter-services fonctionnelle
- Accès frontend stable


