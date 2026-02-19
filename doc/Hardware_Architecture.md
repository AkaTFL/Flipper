# Architecture Hardware - Projet Flipper

**Date :** 19 février 2026  
**Auteurs :** Équipe Flipper

---

## Vue d'ensemble rapide

**Ce qu'on construit :** Un flipper virtuel avec contrôles physiques + affichage sur 3 écrans

**Comment ça fonctionne :**
1. Des **boutons et capteurs physiques** (ESP32) détectent les actions du joueur
2. Ces signaux passent par **Wi-Fi** vers un **serveur** (PC ou Raspberry Pi)
3. Le serveur envoie les mises à jour aux **3 écrans** via WebSocket
4. Three.js affiche le flipper 3D en temps réel

---

## Architecture simplifiée

```
[Boutons physiques] → [ESP32 via Wi-Fi] → [Serveur Go + MQTT] → [3 Écrans via WebSocket]
```

**Détails du flux :**
1. Joueur appuie sur bouton flipper → ESP32 détecte
2. ESP32 envoie signal MQTT au serveur via Wi-Fi
3. Serveur Go traite l'événement et met à jour le jeu
4. Serveur envoie mise à jour aux 3 écrans via WebSocket
5. Three.js actualise le flipper 3D en temps réel

---

## Ce dont on a besoin (liste complète)

### 🔧 Matériel électronique

#### 1. Microcontrôleurs ESP32
**C'est quoi ?** Petites cartes avec Wi-Fi intégré pour connecter les boutons/capteurs au serveur

**Modèle :** ESP32-WROOM-32 ou ESP32-DevKit V1  
**Quantité minimum :** 2 (un pour démarrer + un de backup)  
**Quantité recommandée :** 3 (répartir bumpers/boutons/LEDs)  
**Prix unitaire :** 4 € (AliExpress) ou 8 € (Amazon Prime)  
**Total :** 12 € (AliExpress) ou 24 € (Amazon)

**Où commander :**
- AliExpress : pas cher mais 15-30 jours de livraison
- Amazon : 2x plus cher mais livré en 24-48h

---

#### 2. Boutons flipper (contrôles joueur)
**C'est quoi ?** Gros boutons robustes pour actionner les flippers gauche/droit

**Type :** Boutons arcade LED 30mm  
**Quantité :** 2 minimum (gauche + droit), 3 idéal (+lanceur)  
**Prix unitaire :** 3-4 €  
**Total :** 9-12 €

**Exemple produit :** "Bouton arcade Sanwa" ou "Arcade button 30mm LED"

---

#### 3. Capteurs bumpers (obstacles du flipper)
**C'est quoi ?** Petits switches qui détectent quand la bille touche les obstacles

**Type :** Microswitches SPDT (comme Omron SS-5GL)  
**Quantité :** 6 minimum (3 par côté), 8 idéal  
**Prix unitaire :** 0,50-1 €  
**Total :** 3-8 €

---

#### 4. LEDs pour effets visuels
**C'est quoi ?** Lumières qui s'allument quand on marque des points

**Type :** Bande LED RGB WS2812B (contrôlables individuellement)  
**Quantité :** 1 bande de 1 mètre (16 LEDs) OU LEDs simples  
**Prix :** 5-8 € pour bande RGB, 1-2 € pour LEDs simples  
**Total :** 5-8 €

**Note :** Les LEDs RGB sont plus cool mais pas obligatoires

---

#### 5. Câbles et connecteurs
**C'est quoi ?** Fils pour connecter les boutons aux ESP32

**Type :** Kit jumper wires mâle-femelle  
**Quantité :** 1 kit de 40 fils  
**Prix :** 4-5 €  
**Total :** 4-5 €

**Optionnel :** Breadboard pour tester sans souder (3-5 €)

---

#### 6. Alimentation
**C'est quoi ?** Bloc secteur pour alimenter les ESP32

**Type :** Alimentation USB 5V 2-3A  
**Quantité :** 1 (peut alimenter 3 ESP32)  
**Prix :** 6-8 €  
**Total :** 6-8 €

**Alternative :** Utiliser ports USB du PC (pas besoin d'acheter si PC disponible)

---

### 💻 Infrastructure serveur

#### Option A : PC existant (RECOMMANDÉ pour démarrer)
**C'est quoi ?** Utiliser un laptop ou PC de l'équipe

**Coût :** 0 €  
**Configuration minimale :**
- 2 Go RAM minimum (4 Go recommandé)
- 2 cœurs CPU
- Wi-Fi ou Ethernet
- Windows/Linux/Mac (tous compatibles)

**Logiciels à installer (gratuits) :**
- Go 1.26+ (backend)
- Mosquitto (broker MQTT)
- Navigateur moderne (Chrome/Firefox/Edge)

**Avantages :** Gratuit, immédiat, puissant  
**Inconvénients :** Pas portable, occupe un PC

---

#### Option B : Raspberry Pi 4 (Pour démo finale)
**C'est quoi ?** Petit ordinateur autonome de la taille d'une carte bancaire

**Modèle :** Raspberry Pi 4 Model B (4 Go RAM)  
**Prix :** 60 € (carte seule)  
**Accessoires nécessaires :**
- Alimentation officielle USB-C : 10 €
- Carte microSD 32 Go : 8 €
- Boîtier de protection : 5 €
- **Total kit complet : 83 €**

**Avantages :** Portable, faible consommation, autonome  
**Inconvénients :** Coût supplémentaire

**Recommandation :** Commencer avec PC existant, acheter Raspberry Pi plus tard si nécessaire (avril-mai)

---

### 🖥️ Écrans d'affichage

**Besoin :** 3 écrans pour afficher le jeu

**Options :**
1. **Écrans PC du labo/école** (recommandé) : 0 €
2. **Écrans persos de l'équipe** : 0 €
3. **TV HDMI disponibles** : 0 €
4. **Achat écrans neufs** : 50-150 € × 3 = PAS RECOMMANDÉ

**Spécifications minimales :**
- Résolution : 1920×1080 (Full HD)
- Connectique : HDMI, DisplayPort ou USB-C
- Fréquence : 60 Hz

**Action :** Vérifier disponibilité d'écrans avant d'acheter quoi que ce soit

---

### 📶 Réseau Wi-Fi

**Besoin :** Réseau Wi-Fi 2.4 GHz pour les ESP32

**Coût :** 0 € (utiliser box internet existante ou Wi-Fi du labo)

**Configuration requise :**
- Bande 2.4 GHz activée (ESP32 ne fait pas du 5 GHz)
- DHCP activé (attribution IP automatique)
- Pas de restrictions MAC address

**Action :** Vérifier que le Wi-Fi 2.4 GHz est disponible

---

## Budgets détaillés

### 💰 Budget MINIMAL - Prototypage (15 €)
### 💰 Budget MINIMAL - Prototypage (15 €)

**Pour qui ?** Tester rapidement si ça fonctionne, valider le concept

| Composant | Qté | Prix | Total |
|-----------|-----|------|-------|
| ESP32 | 2 | 4 € | 8 € |
| Microswitches bumpers | 6 | 0,50 € | 3 € |
| Jumper wires | 1 lot | 4 € | 4 € |
| **TOTAL** | | | **15 €** |

**Serveur :** PC existant + Mosquitto gratuit  
**Écrans :** PC ou labo existants  
**Boutons :** Temporairement en clavier

**✅ Permet de :** Tester ESP32 → MQTT → Backend → Frontend  
**❌ Limites :** Pas de vrais boutons flipper, pas de LEDs

---

### 💰 Budget FONCTIONNEL - Complet (45 €)

**Pour qui ?** Avoir un prototype jouable avec tous les composants

| Composant | Qté | Prix | Total |
|-----------|-----|------|-------|
| ESP32 | 3 | 4 € | 12 € |
| Microswitches bumpers | 8 | 0,80 € | 6,40 € |
| Boutons arcade | 3 | 4 € | 12 € |
| Bande LED RGB (WS2812B) | 1m | 6 € | 6 € |
| Jumper wires + breadboard | 1 | 8 € | 8 € |
| **TOTAL** | | | **44,40 €** |

**Serveur :** PC existant  
**Écrans :** Existants  
**Alimentation :** Ports USB du PC

**✅ Permet de :** Jouer avec des vrais boutons, LEDs, tout fonctionne  
**❌ Limites :** Pas autonome (besoin du PC allumé)

---

### 💰 Budget AUTONOME - Avec Raspberry Pi (128 €)

**Pour qui ?** Système portable pour la soutenance, autonome

| Composant | Qté | Prix | Total |
|-----------|-----|------|-------|
| **Électronique (même que fonctionnel)** | | | **44,40 €** |
| Raspberry Pi 4 (4 Go) | 1 | 60 € | 60 € |
| Alimentation Pi + carte SD 32 Go | 1 kit | 18 € | 18 € |
| Boîtier Raspberry Pi | 1 | 5 € | 5 € |
| **TOTAL** | | | **127,40 €** |

**Écrans :** Existants (HDMI du Pi)  
**Avantages :** Portable, faible consommation, professionnel

---

## Plan d'action par phase

### 📅 Phase 1 : IMMÉDIAT (cette semaine)

**Objectif :** Valider la faisabilité technique

**À commander MAINTENANT :**
- 2× ESP32 (8 €)
- 6× microswitches (3 €)
- 1× kit jumper wires (4 €)
- **Total : 15 €**

**Fournisseur recommandé :** Amazon Prime (livraison 24-48h)  
**Alternative :** AliExpress (économise 50% mais 15-30 jours)

**À vérifier cette semaine :**
- [ ] Wi-Fi 2.4 GHz disponible (labo ou perso)
- [ ] 3 écrans disponibles (confirmé avec profs/labo)
- [ ] PC pour serveur disponible

**Test à réaliser (Semaine 1) :**
1. Connecter ESP32 au Wi-Fi
2. Installer Mosquitto sur PC
3. ESP32 envoie message MQTT quand on appuie sur switch
4. Backend Go reçoit le message
5. Frontend affiche l'événement

**✅ Si ce test fonctionne → Le projet est viable !**

---

### 📅 Phase 2 : Semaine 1-2 (23 fév - 8 mars)

**Objectif :** Prototype jouable avec vrais boutons

**À commander :**
- 1× ESP32 supplémentaire (4 €)
- 3× boutons arcade (12 €)
- 1× bande LED RGB (6 €)
- 2× microswitches supplémentaires (1,60 €)
- **Total : 23,60 €**

**Développement :**
- Connecter boutons flipper aux ESP32
- Programmer LEDs RGB qui s'allument
- Flux complet : bouton → serveur → écrans

---

### 📅 Phase 3 : Semaine 4-5 (si budget validé)

**Objectif :** Système autonome

**À décider :**
- Acheter Raspberry Pi (83 €) OU continuer avec PC

**Si Raspberry Pi commandé :**
- Installer Raspbian OS
- Compiler backend Go pour ARM
- Installer Mosquitto
- Tester le système autonome

---

### 📅 Phase 4 : OPTIONNEL (avril-mai)

**Objectif :** Effets haptiques avancés

**À commander (si budget) :**
- 4× solénoïdes 12V (16 €)
- 1× alimentation 12V (12 €)
- 4× transistors MOSFET (2 €)
- **Total : 30 €**

**Note :** **Pas prioritaire**, amélioration "nice to have"

---

## Schéma de connexion simplifié

### Comment connecter un bouton à l'ESP32

```
         ESP32                     Bouton
    ┌──────────────┐           ┌─────────┐
    │              │           │         │
    │  GPIO 12 ────┼───────────┤   []    │
    │              │           │         │
    │  GND     ────┼───────────┤   []    │
    │              │           │         │
    └──────────────┘           └─────────┘
```

**Principe :**
- Quand bouton **relâché** : GPIO 12 = HIGH (3.3V)
- Quand bouton **appuyé** : GPIO 12 = LOW (0V)
- L'ESP32 détecte le changement et envoie un message MQTT

**Code ESP32 (simplifié) :**
```cpp
if (digitalRead(GPIO_12) == LOW) {
  mqtt.publish("flipper/button/left", "pressed");
}
```

---

## Points de vigilance

### ⚠️ Délais de livraison
- **AliExpress :** 15-30 jours → Commander MAINTENANT si choisi
- **Amazon :** 1-2 jours → OK pour commander lundi

### ⚠️ ESP32 défectueux
- Taux de défaut : 5-10%
- **Solution :** Commander 1 ESP32 de spare (+4 €) pour sécurité

### ⚠️ GPIO à éviter
Sur ESP32, **NE PAS UTILISER** :
- GPIO 6-11 (Flash interne, bloque l'ESP32)
- GPIO 34-39 (input-only, ne peuvent pas contrôler LEDs)

**GPIO sûrs :** 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23

### ⚠️ Alimentation
- 1 ESP32 = ~200 mA
- 3 ESP32 = ~600 mA
- Bande LED = ~300 mA
- **Total : ~900 mA** → Alimentation 2A suffisante

---

## Décision à prendre MAINTENANT

### ✅ Checklist avant de commander

- [ ] **Budget validé :** Minimal (15 €) OU Fonctionnel (45 €) ?
- [ ] **Fournisseur choisi :** Amazon (rapide) OU AliExpress (économique) ?
- [ ] **Qui commande ?** Désigner 1 personne de l'équipe
- [ ] **Wi-Fi confirmé :** 2.4 GHz disponible ?
- [ ] **Écrans confirmés :** 3 écrans HDMI disponibles ?
- [ ] **PC serveur confirmé :** Qui prête son PC ?

---

## Recommandation finale

### 🎯 Pour démarrer CETTE SEMAINE :

**Commande immédiate (15 €) :**
- 2 ESP32 + 6 switches + jumper wires
- Fournisseur : Amazon Prime
- Livraison : avant vendredi

**Infrastructure (0 €) :**
- PC de l'équipe
- Mosquitto (gratuit)
- 3 écrans du labo/perso

**Plan :**
1. **Cette semaine :** Commander et tester ESP32
2. **Semaine 1-2 (23 fév) :** Commander boutons + LEDs
3. **Semaine 4-5 :** Décider Raspberry Pi selon budget
4. **Avril-mai :** Solénoïdes si budget OK


**Rédigé par :** Modestin  
**Date :** 19 février 2026  
**Version :** 1.0 - Simplifié  
**Statut :** Prêt pour décision
