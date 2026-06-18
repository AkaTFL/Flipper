# Guide de Développement avec Hot Reload

## Configuration pour le développement

Le projet est configuré pour supporter le hot reload automatique des containers sans avoir à les redémarrer manuellement.

### Démarrage en mode développement

```bash
# Utiliser le fichier .env.dev pour activer le mode développement
ENV=dev docker-compose up --build

# Ou avec les arguments en ligne de commande
docker-compose --env-file .env.dev up --build
```

### Comment ça fonctionne

#### Backend (Go)
- **Tool**: `air` - Hot reload pour Go
- **Fichier de config**: `.air.toml`
- **Volumes**: Le dossier `./backend` est monté dans le container
- **Comportement**: Tout changement dans les fichiers `.go` redéclenche automatiquement la compilation et relance le serveur

```bash
# Les fichiers test.go sont ignorés pour éviter des recompilations inutiles
```

#### Frontend (Flipper, Backglass, DMD)
- **Mode dev**: Utilise `npm run dev` (Vite avec hot reload)
- **Mode production**: Build statique servie par Nginx
- **Volumes**: Le dossier source est monté, `node_modules` est isolé dans le container
- **Comportement**: Tout changement dans les fichiers JavaScript/Vue déclenche automatiquement le hot reload du navigateur

### Variables d'environnement

```env
ENV=dev              # "dev" pour développement, "production" pour production
FRONTEND_PORT=3001   # Port pour le frontend flipper (par défaut 3001)
DMD_PORT=3002        # Port pour les frontends backglass/dmd (par défaut 3002/3003)
```

### Commandes utiles

```bash
# Démarrer en mode développement
ENV=dev docker-compose up --build

# Arrêter les containers
docker-compose down

# Voir les logs en direct
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend_flipper

# Rebuild une image spécifique
docker-compose build backend

# Exécuter une commande dans un container
docker-compose exec backend go test ./...
docker-compose exec frontend_flipper npm run test
```

### Problèmes courants

#### Backend ne se recompile pas
- Vérifier que le `.air.toml` est à jour
- Vérifier les logs : `docker-compose logs backend`
- Relancer le container : `docker-compose restart backend`

#### Frontend ne se hot-reload pas
- Vérifier que `npm run dev` est défini dans `package.json`
- Vérifier les logs : `docker-compose logs frontend_flipper`
- S'assurer que les `node_modules` ne sont pas corrompus : `docker-compose down && docker-compose up --build`

#### Ports déjà utilisés
- Modifier les ports dans le docker-compose.yml ou avec les variables d'environnement
- Ou arrêter les containers existants : `docker-compose down`

### Architecture des Dockerfiles

Chaque Dockerfile utilise une architecture multi-stage avec `ARG ENV`:

- **Stage `dev`**: Utilisé en développement avec hot reload
- **Stage `build`**: Build du projet (frontend seulement)
- **Stage `production`**: Image légère pour la production
- **Stage `final`**: Étape finale qui est sélectionnée selon la variable `ENV`

Exemple pour le backend:
```dockerfile
FROM golang:1.25-alpine AS dev
# Configuration de développement avec air

FROM golang:1.25-alpine AS production
# Build slim pour la production
```

### Passage en production

Pour déployer en production:

```bash
# Avec docker-compose (sans .env.dev)
docker-compose up --build

# Ou explicitement
docker-compose --env-file .env up --build
```

Cela utilisera automatiquement les images optimisées pour la production.
