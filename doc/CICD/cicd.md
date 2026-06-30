# Documentation CI/CD

## Objectif
Documenter l'état de la chaîne CI/CD et tracer les travaux de déploiement Kubernetes local opérationnel.

## État actuellement opérationnel (19 mai 2026)

### Kubernetes local (kind) - LIVE 
- **Cluster** : `playfield` créé avec kind v0.31.0 
- **Namespace** : `playfield` dédié
- **Déploiements** : backend, frontend, iot — tous en Running 1/1 Ready
- **Services** : 
  - backend (ClusterIP 8080)
  - frontend (NodePort 30080 → 80)
  - iot (ClusterIP 1883)
- **Images** : playfield-backend:local, playfield-frontend:local, playfield-iot:local
 - **Déploiements** : backend, frontend, iot, dmd — tous en Running 1/1 Ready
 - **Services** : 
   - backend (ClusterIP 8080)
   - frontend (NodePort 30080 → 80)
   - iot (ClusterIP 1883)
   - dmd (NodePort 30081 → 80)
 - **Images** : playfield-backend:local, playfield-frontend:local, playfield-iot:local, playfield-dmd:local

### Capacités Kubernetes validées 
1. **Auto-healing** : suppression de pod → recréation automatique en <5s
2. **Scaling** : `kubectl scale --replicas=3` → 3 pods backend déployés
3. **Service Discovery** : DNS interne `iot-service.playfield.svc.cluster.local` résolu
4. **Health Probes** : Liveness/Readiness HTTP GET `/health` actives
5. **Exposition externe** : Frontend accessible via NodePort 30080 (ou port-forward)

## Artefacts de déploiement

### Fichiers Kubernetes (k8s/)
```
k8s/
├── namespace.yaml         # Namespace playfield
├── backglass.yaml         # backglass deployment + service NodePort
├── backend.yaml           # Backend deployment + service ClusterIP
├── frontend.yaml          # Frontend deployment + service NodePort
├── iot.yaml               # IoT deployment + service ClusterIP
└── kustomization.yaml     # Point d'entrée Kustomize
├── dmd.yaml               # DMD deployment + service NodePort
```

### Commandes clés de déploiement
```bash
# Build des images locales
docker build -t playfield-backend:local backend
docker build -t playfield-frontend:local frontend/playfield
docker build -t playfield-iot:local iot
docker build -t playfield-dmd:local frontend/dmd
docker build -t playfield-backglass:local frontend/backglass

# Chargement dans kind
kind load docker-image playfield-backend:local --name playfield
kind load docker-image playfield-frontend:local --name playfield
kind load docker-image playfield-iot:local --name playfield
kind load docker-image playfield-dmd:local --name playfield
kind load docker-image playfield-backglass:local --name playfield

# Déploiement complet
kubectl apply -k k8s

# Vérifications
kubectl get pods -n playfield -o wide
kubectl get deploy -n playfield
kubectl get svc -n playfield

# Port-forward pour accès frontend
kubectl port-forward -n playfield svc/frontend-service 8088:80
# http://localhost:8088
```

### Modifications aux manifests
- Images : `ghcr.io/OWNER/REPO/*:latest` → `playfield-*:local` (IfNotPresent)
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
- `DOCKERHUB_USERNAME` (login docker)
- `DOCKERHUB_TOKEN`
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


