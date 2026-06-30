# Définition du MVP - Most valuable product

## 1. Problème + utilisateur (3 lignes)
Le projet cible des joueurs d’arcade et des équipes pédagogiques qui veulent une expérience de flipper moderne, visuelle et interactive.  
Le problème actuel est l’absence d’un prototype unique combinant gameplay 3D, synchronisation temps réel et contrôles physiques simples.  
Le MVP doit prouver qu’un joueur peut lancer et terminer une partie fluide avec score fiable, d’abord en clavier puis avec entrée IoT basique.

## 2. MVP (5 bullets max)
- Une partie solo complète avec états `IDLE -> PLAYING -> GAME_OVER`.
- Contrôles jouables au clavier (flippers + lancement de bille).
- Score mis à jour en temps réel et affiché côté interface.
- Backend Go + WebSocket opérationnel avec diffusion des événements de jeu.
- Intégration MQTT/ESP32 minimale validée sur au moins un événement physique.

## 3. Critères de succès mesurables (3)
- 95% des parties de test (20 runs) se terminent sans crash backend/frontend.
- Au moins 95% des événements/requêtes `MQTT/entrée -> UI` doivent être traités en moins de 120 ms en réseau local.
- Synchronisation correcte du score et de l’état sur 3 clients WebSocket dans 100% des tests de validation.

## 4. Contraintes
- **Autonomie** : la démo doit rester fonctionnelle en mode clavier si le matériel IoT est indisponible.
- **Latence** : temps de réponse faible requis pour conserver une sensation de gameplay arcade.
- **Budget** : limitation à un setup matériel minimal (ESP32 + broker local + postes existants).
- **Environnement** : dépendance à un réseau local stable et à la disponibilité ponctuelle du flipper physique.

## 5. Top 3 risques + plan B
- **Risque 1 - Défaillance de câblage ou connectique** : si un bouton/capteur câblé ne remonte plus correctement, remappage immédiat vers un bouton physique de secours, affichage d'un message d'alerte à l'écran, puis remplacement du module/câble défectueux.
- **Risque 2 - Désynchronisation multi-clients** : si les clients divergent, le backend devient source unique de vérité et force un resync périodique.
- **Risque 3 - Performance frontend insuffisante** : si le rendu chute sous la cible FPS, activer un profil visuel allégé (assets et effets réduits).
