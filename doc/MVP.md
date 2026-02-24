# MVP (Minimum Viable Product) — Flipper

---

## 1. Matériel et intégration

- **Liaison PC ↔ matériel** : Aucun problème entre l'ordinateur et les boutons, solénoïdes ou tirette. Tous les signaux sont reçus/émis de façon fiable via MQTT.
- **Board fonctionnel** : Plateau physique opérationnel. Collisions, bumpers, flippers et solénoïdes réagissent comme attendu.
- **Physique des éléments** : Comportement physique cohérent côté logiciel (Rapier) et côté matériel. Bille, obstacles et réactions prévisibles, sans bug majeur.

---

## 2. Boucle de jeu

- **Menu** : Bouton « Lancer une partie » et bouton « Rejoindre une partie » présents et fonctionnels.
- **Lancer une partie** : Nouvelle partie depuis le menu. La bille est en jeu, le score s'affiche.
- **Rejoindre une partie** : Ouvre un menu listant les sauvegardes présentes en local (sauvegarde locale uniquement, pas de multijoueur en ligne). Maximum 4 sauvegardes.
- **Pause et sauvegarde** : En partie, pause possible à tout moment avec option de sauvegarder. La sauvegarde enregistre la partie au début de la phase en cours. Si le joueur est en combat contre le boss et sauvegarde, la sauvegarde fera reprendre au début du boss (pas au milieu du combat).
- **Game over** : Déclenché quand le joueur a 0 billes. Affichage clair avec bouton « Rejouer » ou « Retour menu ».

---

## 3. Gameplay MVP

- **3 phases de gameplay** et **3 quêtes** :
  - Quête 1 : accomplie → passage de la phase 1 à la phase 2.
  - Quête 2 : accomplie → passage de la phase 2 à la phase 3.
  - Quête 3 : accomplie (en fin de phase 3) → accès au **boss**.
- **Quêtes** : objectifs à accomplir pour valider une quête, par exemple : atteindre un certain nombre de points, toucher des bumpers précis, ou autres objectifs à déterminer.
- **Boss** : Après avoir terminé la quête de fin de phase 3, le joueur arrive sur le boss. Il doit **relancer la bille** (tirette / action de lancement) pour lancer le combat contre le boss. Victoire sur le boss final = partie gagnée.
- **Billes** :
  - 3 billes au départ.
  - +1 bille récupérable par boss de phase (les 3 petits boss des phases 1, 2 et 3). Les billes s’additionnent : 3 de base + max 3 en plus = **6 billes maximum**.
- **Victoire** : Après le boss final, scène de victoire affichée avec bouton « Retour au menu ».

---

## 4. Affichage MVP

- **Score** : affiché dans le DMD.
- **Backglass (écran arrière)** : animations.
- **Écran à plat (playfield)** : jeu principal.

---

## 5. Contrôles et support MVP

- **Plateforme** : jouable sur PC.
- **Contrôles clavier** : des touches du clavier correspondent aux boutons du flipper (équivalent physique). Aucune indication à l’écran des correspondances touches ↔ bouton dans le jeu ; l’équipe dispose des correspondances en documentation.

---

## 6. Checklist MVP

- [ ] Liaison ordinateur ↔ boutons, solénoïdes, tirette fiable (MQTT).
- [ ] Board physique fonctionnel et physique des éléments cohérente.
- [ ] Menu avec « Lancer une partie » et « Rejoindre une partie » opérationnels.
- [ ] Sauvegardes locales : max 4, pause + sauvegarde en cours de partie (début de phase ; en boss = redémarrage du boss).
- [ ] Une partie se lance et se joue sans bug bloquant.
- [ ] Game over à 0 billes avec boutons Rejouer / Retour menu.
- [ ] 3 phases, 3 quêtes (objectifs à définir), 1 boss final ; relance de la bille pour lancer le combat boss.
- [ ] Système de billes : 3 de base, +1 par boss de phase (max 6).
- [ ] Score dans le DMD ; animations backglass ; jeu sur écran à plat.
- [ ] Scène de victoire après le boss final + retour au menu.

---