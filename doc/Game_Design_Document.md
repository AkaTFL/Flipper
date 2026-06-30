# Game Design Document — Flipper

---

## 1. Menu et lancement

- **Créer une partie** : lance une nouvelle partie.
- **Rejoindre une partie** : ouvre un menu listant les sauvegardes disponibles (parties déjà enregistrées). Uniquement en **local** ; maximum **4 sauvegardes**.
- **1v1** : hors périmètre MVP (voir roadmap / MVP).

---

## 2. Objectif et structure de la partie

- **But** : battre le **boss final**.
- La partie est structurée en **mondes / paliers** : 3 mondes principaux + un 4ᵉ où se trouve uniquement le boss final.
- Sur le **4ᵉ monde** se trouve uniquement le boss final.
- À la fin de **chaque monde principal** (1, 2 et 3), il y a un **boss de phase** à battre pour passer au monde suivant. Il faut avoir battu les 3 petits boss pour pouvoir affronter le boss final.

---

## 3. Phases, quêtes et boss (MVP)

- **3 phases de gameplay** (correspondant aux 3 premiers mondes), séparées par **3 quêtes** :
  - **Quête 1** : objectifs à accomplir en phase 1 → passage à la phase 2.
  - **Quête 2** : objectifs à accomplir en phase 2 → passage à la phase 3.
  - **Quête 3** : objectifs à accomplir en fin de phase 3 → accès au **boss final**.
- **Définition d’une quête** : objectifs à valider, par exemple :
  - atteindre un certain nombre de points ;
  - toucher des bumpers précis ;
  - autres objectifs à déterminer.
- **Boss de fin de phase** : se déclenche quand la quête de la phase en cours est terminée. Après la quête de fin de phase 3, le joueur arrive sur le boss final.
- **Lancement du combat boss** : le joueur doit **relancer la bille** (tirette / action de lancement) pour lancer la partie contre le boss.
- **Victoire** : battre le boss final = partie gagnée. Affichage d’une scène de victoire puis bouton « Retour au menu ».

---

## 4. Billes et vies

- **Billes de départ** : 3.
- **Récupération de billes** : +1 bille par boss de phase battu (les 3 petits boss des mondes 1, 2 et 3). Les billes **s’additionnent**.
- **Maximum** : 3 billes de base + 3 en plus = **6 billes** maximum.
- **Game over** : quand le joueur a **0 bille**. Propositions : bouton « Rejouer » ou « Retour menu ».

---

## 5. Sauvegarde et pause

- **Pause** : possible à tout moment en partie, avec option de **sauvegarder**.
- **Contenu de la sauvegarde** : la partie est sauvegardée au **début de la phase en cours**.
- **Sauvegarde pendant le boss** : si le joueur sauvegarde pendant le combat contre le boss, la sauvegarde fera **recommencer le boss au début** (pas reprise au milieu du combat).
- **Stockage** : sauvegardes **locales** uniquement ; max **4 sauvegardes**.

---

## 6. Affichage (MVP)

- **Score** : affiché dans le **DMD**.
- **Backglass (écran arrière)** : **animations**.
- **Écran à plat (flipper)** : **jeu** principal.

---

## 7. Contrôles et support (MVP)

- **Plateforme** : jouable sur **PC**.
- **Contrôles** : correspondance **touches clavier ↔ boutons** du flipper ; pas d’indication à l’écran des correspondances dans le jeu (documentation côté équipe).

---

## 8. Hors périmètre MVP

- Son (musiques, SFX) : pas dans le MVP.
- Mode 1v1, « Rejoindre une partie » en ligne.
- Les 4 mondes complets avec tout le contenu prévu au long terme.
- Module IA (analyse ou bot).
- Polish avancé (effets, musiques, équilibrage fin).

---

*Dernière mise à jour : février 2026*
