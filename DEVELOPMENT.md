# Guide de développement avec Docker

## Environnements

Le projet possède deux configurations :

- `docker-compose.yml` pour une exécution proche de la production ;
- `docker-compose.dev.yml` pour ajouter le volume nécessaire au hot reload du backend Go.

Les frontends sont des fichiers statiques servis par Nginx. Leurs dossiers sont montés dans les conteneurs : une actualisation du navigateur suffit après une modification.

## Développement

```bash
docker compose \
  --env-file .env.dev \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  up --build
```

Le backend utilise `air` et redémarre automatiquement après une modification d'un fichier Go.

Pour arrêter les services :

```bash
docker compose \
  --env-file .env.dev \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  down
```

## Production locale

```bash
docker compose up --build -d
```

Cette commande utilise les images de production et ne monte pas le code du backend sur son exécutable.

Pour arrêter les services :

```bash
docker compose down
```

## Services et ports

| Service | Port |
|---|---:|
| Jeu | `3001` |
| Backglass | `3002` |
| DMD | `3003` |
| Routeur kiosque | `32789` |
| Backend | `8080` |
| MQTT | `1883` |

Les ports peuvent être modifiés avec `FRONTEND_PORT`, `BACKGLASS_PORT`, `DMD_PORT` et `KIOSK_PORT`.

## Commandes utiles

```bash
docker compose ps
docker compose logs -f
docker compose logs -f backend
docker compose build backend
docker compose exec backend go test ./...
```

## Problèmes courants

### Le backend ne démarre pas

- vérifier les logs avec `docker compose logs backend` ;
- vérifier que le mode production n'utilise pas le volume `./backend:/app` ;
- relancer avec `docker compose up --build -d`.

### Le hot reload du backend ne fonctionne pas

- vérifier que `.air.toml` existe dans `backend` ;
- utiliser les deux fichiers Compose indiqués dans la commande de développement ;
- vérifier que `ENV=dev` est chargé depuis `.env.dev`.

### Un port est déjà utilisé

- arrêter une ancienne exécution avec `docker compose down` ;
- vérifier les valeurs présentes dans `.env` ;
- modifier uniquement la variable du service concerné.
