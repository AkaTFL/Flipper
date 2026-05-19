# Guide humain — Docker & Kubernetes (version actuelle)

## Pourquoi ce guide ?

L’objectif est de lancer Flipper rapidement, sans prise de tête.
Aujourd’hui, on se concentre sur ce qui est utile tout de suite : **Docker + Kubernetes**.

- Docker : pour avoir le même environnement pour tout le monde
- Kubernetes : pour orchestrer proprement quand on déploie


---

## Ce qui est prêt maintenant

- Un conteneur **backend Go** (WebSocket + `/health`) sur le port `8080`
- Un conteneur **frontend Nginx** sur le port `3000` (vers `80` dans le conteneur)
- Un fichier `docker-compose.yml` à la racine pour tout lancer d’un coup

---

## Lancer le projet en local (simple)

Depuis la racine du projet :

```bash
docker compose up --build
```

Ensuite :

- Frontend : http://localhost:3000
- Health backend : http://localhost:8080/health

Pour arrêter :

```bash
docker compose down
```

---

## Commandes utiles (au quotidien)

Relancer proprement :

```bash
docker compose down
docker compose up --build
```

Voir les logs backend :

```bash
docker compose logs -f backend
```

Voir les logs frontend :

```bash
docker compose logs -f frontend
```

---

## Vérifications rapides

1. Le frontend s’ouvre bien sur `localhost:3000`
2. Le backend répond bien sur `/health`
3. Les deux services passent en état `Up` dans `docker compose ps`

---

## Et Kubernetes dans tout ça ?

Kubernetes est maintenant intégré et opérationnel en local.

### Prérequis
- `kind` : cluster Kubernetes local (testé en v0.31.0)
- `kubectl` : client Kubernetes (testé en v1.32+)
- `docker` : moteur de conteneurs (les images locales seront chargées dans kind)

### Démarrage rapide Kubernetes

#### 1. Créer le cluster (une fois)
```bash
kind create cluster --name flipper --image kindest/node:v1.32.5
```

#### 2. Construire les images locales
```bash
docker build -t flipper-backend:local backend
docker build -t flipper-frontend:local frontend/flipper
docker build -t flipper-iot:local iot
```

#### 3. Charger les images dans kind
```bash
kind load docker-image flipper-backend:local --name flipper
kind load docker-image flipper-frontend:local --name flipper
kind load docker-image flipper-iot:local --name flipper
```

#### 4. Déployer l'application complète
```bash
kubectl apply -k k8s
```

Cela crée :
- **namespace** `flipper`
- **backend deployment** (1 replica, health probes HTTP GET `/health`)
- **frontend deployment** (1 replica, exposed via NodePort 30080)
- **iot deployment** (1 replica, Mosquitto MQTT)
- **3 services** (backend, frontend, iot)

#### 5. Vérifier le statut
```bash
kubectl get pods -n flipper
kubectl get deploy -n flipper
kubectl get svc -n flipper
```

Tous les pods doivent être `Running 1/1 Ready`.

#### 6. Accéder au frontend
Option A (port-forward) :
```bash
kubectl port-forward -n flipper svc/frontend-service 8088:80
# Puis : http://localhost:8088
```

Option B (NodePort direct) :
```bash
# Le service écoute sur localhost:30080
# http://localhost:30080
```

### Capacités Kubernetes démontrées

#### Auto-healing (Résilience)
```bash
# Supprimer un pod
kubectl delete pod <pod-name> -n flipper
# Kubernetes le recrée automatiquement en quelques secondes
```

#### Scaling horizontal
```bash
# Augmenter à 3 replicas
kubectl scale deployment backend-deployment -n flipper --replicas=3

# Vérifier les 3 pods
kubectl get pods -n flipper -l app=backend -o wide
```

#### Service Discovery (DNS interne)
Les pods peuvent communiquer entre eux via DNS interne :
```bash
# Depuis un pod backend, joindre iot-service
kubectl exec <backend-pod> -n flipper -- nslookup iot-service
# Résultat : Name: iot-service.flipper.svc.cluster.local
```

#### Health Probes
Chaque déploiement dispose de probes de liveness et readiness :
```bash
# Vérifier les probes
kubectl describe pod <pod-name> -n flipper
# Affiche : Liveness HTTP GET /health (delay 10s, period 10s)
#          Readiness HTTP GET /health (delay 5s, period 5s)
```

### Arrêter et nettoyer

Garder le cluster actif pour les tests :
```bash
# Supprimer juste les ressources Flipper
kubectl delete -k k8s
```

Détruire le cluster entièrement :
```bash
kind delete cluster --name flipper
```

### Structure Kubernetes du projet

```
k8s/
├── namespace.yaml          # Namespace flipper
├── backend.yaml            # Backend deployment + service
├── frontend.yaml           # Frontend deployment + service NodePort
├── iot.yaml                # IoT deployment (Mosquitto) + service
└── kustomization.yaml      # Point d'entrée (orchestrateur)
```

Déployer tout en une commande :
```bash
kubectl apply -k k8s
```

### Changements depuis la version Docker-only
- Images dockers taggées `flipper-*:local` pour Kubernetes
- Probes de santé HTTP intégrées (backend et readiness)
- Communication inter-pod via DNS Kubernetes (backend → iot-service)
- NodePort frontend pour accès externe (30080)
- Kustomize comme point d'entrée unique pour tous les manifests

---

