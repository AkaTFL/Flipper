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
kind create cluster --name playfield --image kindest/node:v1.32.5
```

#### 2. Construire les images locales
```bash
docker build -t playfield-backend:local backend
docker build -t playfield-frontend:local frontend/playfield
docker build -t playfield-iot:local iot
docker build -t playfield-dmd:local frontend/dmd
```

#### 3. Charger les images dans kind
```bash
kind load docker-image playfield-backend:local --name playfield
kind load docker-image playfield-frontend:local --name playfield
kind load docker-image playfield-iot:local --name playfield
kind load docker-image playfield-dmd:local --name playfield
```

#### 4. Déployer l'application complète
```bash
kubectl apply -k k8s
```

Cela crée :
- **namespace** `playfield`
- **backend deployment** (1 replica, health probes HTTP GET `/health`)
- **frontend deployment** (1 replica, exposed via NodePort 30080)
- **iot deployment** (1 replica, Mosquitto MQTT)
- **3 services** (backend, frontend, iot)
 - **dmd deployment** (1 replica, affichage DMD)
 - **4 services** (backend, frontend, iot, dmd)

#### 5. Vérifier le statut
```bash
kubectl get pods -n playfield
kubectl get deploy -n playfield
kubectl get svc -n playfield
```

Tous les pods doivent être `Running 1/1 Ready`.

#### 6. Accéder au frontend
Option A (port-forward) :
```bash
kubectl port-forward -n playfield svc/frontend-service 8088:80
# Puis : http://localhost:8088
```

Option B (NodePort direct) :
```bash
# Le service écoute sur localhost:30080
# http://localhost:30080
```

#### Accéder au DMD
Option A (port-forward) :
```bash
kubectl port-forward -n playfield svc/dmd-service 8089:80
# Puis : http://localhost:8089
```

Option B (NodePort direct) :
```bash
# Le service DMD écoute sur localhost:30081
# http://localhost:30081
```

### Capacités Kubernetes démontrées

#### Auto-healing (Résilience)
```bash
# Supprimer un pod
kubectl delete pod <pod-name> -n playfield
# Kubernetes le recrée automatiquement en quelques secondes
```

#### Scaling horizontal
```bash
# Augmenter à 3 replicas
kubectl scale deployment backend-deployment -n playfield --replicas=3

# Vérifier les 3 pods
kubectl get pods -n playfield -l app=backend -o wide
```

#### Service Discovery (DNS interne)
Les pods peuvent communiquer entre eux via DNS interne :
```bash
# Depuis un pod backend, joindre iot-service
kubectl exec <backend-pod> -n playfield -- nslookup iot-service
# Résultat : Name: iot-service.playfield.svc.cluster.local
```

#### Health Probes
Chaque déploiement dispose de probes de liveness et readiness :
```bash
# Vérifier les probes
kubectl describe pod <pod-name> -n playfield
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
kind delete cluster --name playfield
```

### Structure Kubernetes du projet

```
k8s/
├── namespace.yaml          # Namespace playfield
├── backend.yaml            # Backend deployment + service
├── frontend.yaml           # Frontend deployment + service NodePort
├── iot.yaml                # IoT deployment (Mosquitto) + service
├── dmd.yaml                # DMD deployment + service NodePort
└── kustomization.yaml      # Point d'entrée (orchestrateur)
```

Déployer tout en une commande :
```bash
kubectl apply -k k8s
```

### Changements depuis la version Docker-only
- Images dockers taggées `playfield-*:local` pour Kubernetes
- Probes de santé HTTP intégrées (backend et readiness)
- Communication inter-pod via DNS Kubernetes (backend → iot-service)
- NodePort frontend pour accès externe (30080)
- Kustomize comme point d'entrée unique pour tous les manifests

---

