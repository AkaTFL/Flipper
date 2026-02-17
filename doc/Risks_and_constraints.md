## 7. Risques et contraintes  

### 7.1 Risques techniques et organisationnels  

#### Complexité multi-protocoles (WebSocket + MQTT)

L’architecture repose sur deux protocoles temps réel distincts :
- WebSocket pour la communication frontend ↔ backend
- MQTT pour la communication IoT ↔ backend

La gestion simultanée de ces flux peut introduire des problèmes de latence cumulée, d’ordre des événements ou de surcharge côté serveur.

**Mesures prévues :**
- Centraliser toute logique métier dans le serveur Go.
- Mettre en place une gestion stricte des événements (event dispatcher).
- Tester la latence bout-en-bout (capteur → MQTT → Go → WebSocket → Frontend).

---

#### Risque de concurrence mal maîtrisée (Goroutines)

Le backend Go utilise des goroutines pour gérer des événements simultanés.
Une mauvaise gestion des accès concurrents (race conditions) peut provoquer des incohérences de score ou d’état.

**Mesures prévues :**
- Utilisation de mutex ou channels pour protéger les données critiques.
- Tests de charge simulant plusieurs événements simultanés.
- Activation du race detector de Go en phase de test.

---

#### Désynchronisation multi-écrans

Les trois écrans doivent afficher un état parfaitement cohérent.
Un problème d’ordre des messages WebSocket pourrait créer des différences visibles entre écrans.

**Mesures prévues :**
- Utilisation d’un modèle d’événement séquentiel.
- Broadcast contrôlé côté serveur.
- Tests avec plusieurs clients connectés simultanément.

---

#### Instabilité du moteur physique (Rapier - WebAssembly)

Rapier étant exécuté via WebAssembly, des comportements inattendus peuvent apparaître :
- collisions imprécises
- instabilité à haute vitesse
- surcharge CPU navigateur

**Mesures prévues :**
- Ajustement précis des paramètres physiques.
- Limitation du nombre d’objets dynamiques simultanés.
- Tests sur différentes machines pour vérifier la stabilité.

---

#### Risque lié à MQTT (QoS et latence réseau)

Même si MQTT est léger, un mauvais choix de QoS peut :
- créer des doublons d’événements
- introduire un délai inutile
- saturer le broker Mosquitto

**Mesures prévues :**
- Définir clairement les niveaux QoS selon le type d’événement.
- Isoler le broker sur un réseau local stable.
- Monitorer les topics via MQTT Explorer pendant les tests.

---

#### Disponibilité limitée du flipper physique

Le matériel réel ne sera accessible que certains jours.
Un problème d’intégration découvert tardivement pourrait compromettre la soutenance.

**Mesures prévues :**
- Développer une simulation complète en mode clavier.
- Préparer les sessions matérielles avec scénarios de test définis.
- Vérifier la compatibilité MQTT et GPIO avant intégration finale.

---

#### Intégration du module IA

Le module IA (analyse ou bot joueur) peut :
- introduire une surcharge CPU
- perturber la logique temps réel
- complexifier la synchronisation

**Mesures prévues :**
- Isoler le module IA dans une couche indépendante.
- Implémenter d’abord une analyse simple (statistiques).
- Ajouter le comportement autonome uniquement après stabilisation.

---

#### Risque organisationnel (équipe de 5)

La répartition des tâches (Frontend, Backend, IoT, IA) peut créer des dépendances fortes.

**Mesures prévues :**
- Définition claire des responsabilités.
- Intégration progressive et continue.
- Revue de code régulière via Gitflow.

---

### 7.2 Contraintes du projet  

#### Contraintes temporelles  
- Livraison avant fin juin.
- Planning contraint avec phases d’intégration complexes.
- Temps limité pour les tests sur matériel réel.

#### Contraintes techniques  
- Trois applications synchronisées en temps réel.
- Backend haute performance requis.
- Intégration WebAssembly + MQTT + WebSocket.
- Implémentation d’un module IA.

#### Contraintes matérielles  
- Flipper physique disponible uniquement certains jours.
- Configuration multi-machines obligatoire.
- Dépendance au réseau local pour MQTT et WebSocket.

#### Contraintes organisationnelles  
- Équipe de 5 personnes.
- Coordination inter-modules nécessaire.
- Documentation et soutenance obligatoires.