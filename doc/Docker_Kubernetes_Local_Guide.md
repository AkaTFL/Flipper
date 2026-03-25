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

Kubernetes reste la suite logique pour les environnements plus proches de la prod :

- `Deployment` pour déployer
- `Service` pour exposer
- `ConfigMap`/`Secret` pour la configuration
- healthchecks pour fiabiliser les redémarrages

Mais pour le développement quotidien, **Docker Compose suffit largement**.

---

