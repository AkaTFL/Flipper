# MVP (Minimum Viable Product) — Flipper

---

## 1. Matériel et intégration

- **Liaison PC ↔ matériel** : Aucun problème entre l’ordinateur et les boutons, solénoïdes ou tirette. Tous les signaux sont reçus/émis de façon fiable via MQTT.
- **Board fonctionnel** : Plateau physique opérationnel. Collisions, bumpers, flippers et solénoïdes réagissent comme attendu.
- **Physique des éléments** : Comportement physique cohérent côté logiciel (Rapier) et côté matériel. Bille, obstacles et réactions prévisibles, sans bug majeur.

---

## 2. Boucle de jeu

- **Menu** : Bouton « Lancer une partie » présent et fonctionnel.
- **Démarrage de partie** : Une partie se lance depuis le menu sans bug. La bille est en jeu, le score s’affiche.
- **Game over** : Fin de partie déclenchée correctement (perte des vies/billes). Retour au menu ou relance possible.

---

## 3. Gameplay MVP

- **3 phases de gameplay** séparées par **2 quêtes**.
- Une quête accomplie → passage à la phase suivante.
- Après la **phase 3** : affrontement contre un **boss**. Victoire sur le boss = partie gagnée.

---

## 4. Hors périmètre MVP

- Mode 1v1.
- Option « Rejoindre une partie ».
- Les 4 mondes complets du GDD.
- Module IA (analyse ou bot).
- Polish avancé (effets, musiques, équilibrage fin).

---

## 5. Checklist MVP

- [ ] Liaison ordinateur ↔ boutons, solénoïdes, tirette fiable (MQTT).
- [ ] Board physique fonctionnel et physique des éléments cohérente.
- [ ] Menu avec « Lancer une partie » opérationnel.
- [ ] Une partie se lance et se joue sans bug bloquant.
- [ ] Game over fonctionnel (fin de partie claire, retour menu ou relance).
- [ ] 3 phases de gameplay, 2 quêtes, 1 boss.

---

*Dernière mise à jour : février 2026*
