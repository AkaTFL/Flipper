## 9. Roadmap

> Date de départ : 23 février 2026  
> Date cible de soutenance : 12 juin 2026  
> Approche : roadmap par phases (durée variable selon complexité)

---

### Principes d'organisation

- Priorité au **MVP jouable et stable** avant les fonctionnalités avancées.
- Les tâches sont organisées par **dépendances techniques**, pas par semaine fixe.
- Chaque phase se termine avec un **livrable vérifiable**.
- Le module IA est traité comme un **bonus maîtrisé** après stabilisation du cœur du jeu.

---

### Rôles et responsabilités (référence)

- **Modestin** : Backend Go + logique métier + WebSocket
- **Charles** : IoT (ESP32 + MQTT + matériel)
- **Hugo** : Frontend 3D (Three.js + intégration gameplay)
- **Baptiste** : Art 3D + UI visuelle (Playfield / Backglass / DMD)
- **Raphael** : Tests + CI/CD + qualité + outillage

---

## Phase 1 — Fondations techniques (23 février → 13 mars, 3 semaines)

### Objectif
Poser une base exécutable pour backend, frontend et IoT avec pipeline de qualité minimal.

### Travaux par rôle

**Modestin**
- Initialiser la structure backend Go.
- Exposer un serveur WebSocket minimal.
- Définir le format d'événements (contrat JSON v1).

**Charles**
- Installer et configurer Mosquitto.
- Connecter un ESP32 au broker.
- Publier des événements de test sur des topics normalisés.

**Hugo**
- Initialiser l'application frontend Three.js.
- Mettre en place une scène de base (caméra, lumière, boucle render).
- Consommer un message WebSocket de test.

**Baptiste**
- Créer les premiers assets proxy (table, flippers, bumper placeholders).
- Définir une direction visuelle et une nomenclature d'assets.

**Raphael**
- Finaliser la CI GitHub Actions (build, lint, tests conditionnels).
- Ajouter les premiers checks qualité (lint Go/JS quand les projets existent).
- Définir la stratégie de branches et règles PR appliquées.

### Livrable de fin de phase
- Flux minimal validé : `ESP32/MQTT (mock ou réel) -> Backend Go -> WebSocket -> Frontend`.
- CI verte sur `main`.

### Tâches transverses si avance (capacité disponible)

**Charles**
- Préparer un guide de câblage (GPIO) et un plan de tests matériel pour la Phase 3.
- Créer des scripts de simulation MQTT pour aider Raphael sur les tests d'intégration.
- Aider Modestin à valider le schéma d'événements côté MQTT.

**Baptiste**
- Préparer des variantes d'assets légers pour faciliter les tests de performance frontend.

**Raphael**
- Mettre en place un template de rapport de test hebdomadaire partagé à l'équipe.

---

## Phase 2 — Boucle de jeu MVP clavier (16 mars → 10 avril, 4 semaines)

### Objectif
Livrer un flipper jouable au clavier, sans dépendance forte au matériel.

### Travaux par rôle

**Modestin**
- Implémenter le modèle de jeu (`Game`, `Player`, `GameState`).
- Gérer les états (`IDLE`, `INIT`, `PLAYING`, `BALL_LOST`, `GAME_OVER`).
- Ajouter la logique de score côté backend.

**Charles**
- Stabiliser le schéma MQTT (topics, payload, QoS par type d'événement).
- Construire un simulateur d'inputs MQTT pour accélérer les tests.

**Hugo**
- Intégrer la physique (Rapier) et la logique de collisions côté frontend.
- Implémenter les contrôles clavier (flippers, lancement bille).
- Afficher score et état de partie.

**Baptiste**
- Produire un pack d'assets MVP optimisés (low/medium poly).
- Intégrer les éléments UI minimaux (score, statut, messages).

**Raphael**
- Ajouter des tests unitaires backend (score, transitions d'état).
- Mettre en place des tests d'intégration WebSocket multi-clients.
- Activer la couverture et suivi de qualité dans CI.

### Livrable de fin de phase
- Prototype jouable complet au clavier avec score fiable.
- Documentation de test et checklist de non-régression.

### Tâches transverses si avance (capacité disponible)

**Charles**
- Participer aux tests de robustesse WebSocket avec Raphael (pannes réseau simulées).
- Préparer les drivers/procédures pour accélérer l'intégration matérielle de la Phase 3.

**Baptiste**
- Commencer les éléments visuels Backglass/DMD pour réduire la charge de la Phase 3.

**Raphael**
- Ajouter une base de tests de charge légère (smoke perf) backend/frontend.

---

## Phase 3 — Intégration IoT réelle et synchronisation multi-écrans (13 avril → 8 mai, 4 semaines)

### Objectif
Connecter le matériel réel et garantir la cohérence temps réel sur plusieurs vues.

### Travaux par rôle

**Modestin**
- Intégrer la réception MQTT réelle dans le moteur de jeu.
- Garantir l'ordre des événements et éviter les doublons.
- Gérer le broadcast structuré pour Playfield, Backglass et DMD.

**Charles**
- Mapper GPIO (boutons, capteurs, actionneurs).
- Piloter les solénoïdes/retours matériels avec contraintes de sécurité.
- Mesurer latence et stabilité du réseau local.

**Hugo**
- Synchroniser Playfield / Backglass / DMD côté frontend.
- Implémenter les réactions visuelles liées aux événements physiques.
- Optimiser le rendu (FPS stable sur machines cibles).

**Baptiste**
- Finaliser les assets visuels des 3 vues.
- Ajouter animations DMD/Backglass cohérentes avec le gameplay.

**Raphael**
- Déployer des tests end-to-end (chaîne complète MQTT -> Frontend).
- Exécuter tests de robustesse (déconnexions, pertes de messages, recharge client).
- Produire un tableau de suivi des défauts bloquants.

### Livrable de fin de phase
- MVP matériel fonctionnel en conditions réelles.
- Synchronisation valide sur 3 affichages.

### Tâches transverses si avance (capacité disponible)

**Charles**
- Documenter les incidents matériels et proposer des actions préventives pour la Phase 4.
- Contribuer au mode fallback (simulation) avec Modestin pour sécuriser la démo.

**Hugo**
- Préparer des profils graphiques (qualité/performance) selon les machines de démo.

**Raphael**
- Industrialiser les tests end-to-end pour exécution automatique en pré-release.

---

## Phase 4 — Stabilisation produit et qualité soutenance (11 mai → 29 mai, 3 semaines)

### Objectif
Passer de MVP à Release Candidate stable, démontrable et maintenable.

### Travaux par rôle

**Modestin**
- Optimiser concurrence backend (goroutines, mutex/channels).
- Renforcer la résilience en cas de pics d'événements.

**Charles**
- Fiabiliser firmware et reconnect automatique MQTT.
- Finaliser les procédures de setup matériel.

**Hugo**
- Optimiser performances frontend (FPS, mémoire, chargement assets).
- Ajuster ergonomie de jeu et feedback utilisateur.

**Baptiste**
- Polir la direction artistique finale et les transitions visuelles.
- Fournir exports optimisés et versionnés.

**Raphael**
- Monter la couverture de tests sur scénarios critiques.
- Vérifier pipeline complet avant gel.
- Préparer scripts de validation pré-demo.

### Livrable de fin de phase
- **Release Candidate** techniquement stable.
- Liste de risques résiduels et plans de contournement.

### Tâches transverses si avance (capacité disponible)

**Charles**
- Renforcer le plan de continuité matériel (matériel de secours, procédure de reprise rapide).

**Baptiste**
- Produire des packs d'assets "safe mode" (ultra légers) pour garantir la fluidité en soutenance.

**Raphael**
- Préparer une répétition CI "soutenance" (pipeline + checklist complète en une commande).

---

## Phase 5 — IA (optionnelle et cadrée) + soutenance (1 juin → 12 juin, 2 semaines)

### Objectif
Ajouter une couche IA uniquement si le socle est stable, puis finaliser la soutenance.

### Travaux par rôle

**Modestin**
- Exposer une interface backend pour consommer un service IA.
- Isoler l'IA pour ne pas impacter la boucle temps réel principale.

**Charles**
- Garantir la disponibilité des données capteurs utiles à l'IA.

**Hugo**
- Afficher les retours IA (insights, recommandations, mode assisté) sur DMD/UI.

**Baptiste**
- Concevoir les éléments visuels dédiés au feedback IA.

**Raphael**
- Mesurer l'impact perf/latence de l'IA.
- Valider un mode fallback sans IA pour la démo.
- Assurer la stabilité finale CI/CD et préparer le tag `v1.0.0`.

### Livrable de fin de phase
- Soutenance prête avec scénario principal stable.
- IA activée uniquement si les critères de performance sont respectés.

### Tâches transverses si avance (capacité disponible)

**Toute l'équipe**
- Répétition complète de la démo (conditions réelles) avec mesure du temps par séquence.
- Préparation d'un plan B strict : scénario sans IA, sans matériel ou sans réseau externe.

---

## Jalons de validation (Go / No-Go)

- **Jalon A (13 mars)** : socle technique et CI opérationnels.
- **Jalon B (10 avril)** : MVP jouable clavier validé.
- **Jalon C (8 mai)** : intégration IoT réelle et multi-écrans validées.
- **Jalon D (29 mai)** : Release Candidate stabilisée.
- **Jalon E (12 juin)** : soutenance et livraison finale.

---