# Sprint CDC technique

## Objectif
Compiler votre Cahier des Charges technique complet, le faire relire par une autre equipe, et preparer la presentation finale (10 min).

## Consignes

### Phase 1 : Compiler le CDC (30 min)

Votre `docs/cdc-technique.md` doit contenir **au minimum** ces sections :

1. **Vision**
2. **Objectifs et perimetre**
3. **Use cases**
4. **Architecture technique**
5. **Diagrammes UML**
6. **Stack technique**
7. **Risques et contraintes**
8. **Conventions equipe**
9. **Roadmap et questions ouvertes**

> Cette liste n'est pas exhaustive. Si votre projet necessite d'autres sections (securite, accessibilite, protocoles de communication, modele de donnees...), ajoutez-les.

Verifiez que tout y est, completez ce qui manque. Voici ce qu'on attend pour chaque section :

---

#### 1. Vision

Une phrase. Qui, quoi, pourquoi.

```markdown
Flipper est un flipper virtuel multijoueur qui combine une simulation
physique realiste (Three.js/Cannon.js) avec des controleurs physiques
(ESP32) pour offrir une experience arcade moderne jouable sur 3 ecrans.
```

#### 2. Objectifs et perimetre

3-5 objectifs, 3 non-objectifs, 2 personas.

```markdown
### Objectifs
1. Simuler une table de flipper avec physique realiste
2. Synchroniser 3 ecrans en temps reel via WebSocket
3. Permettre le controle via web ET controleurs physiques (ESP32)

### Non-objectifs
1. Pas de mode multijoueur en ligne
2. Pas d'editeur de table personnalise

### Personas
**Lea**, 22 ans, etudiante dev web — veut un projet fun combinant front et IoT.
```

#### 3. Use cases

Tableau recapitulatif + 2 use cases detailles (scenario nominal, extensions, postconditions).

```markdown
| ID | Nom | Acteur | But |
|----|-----|--------|-----|
| UC-01 | Lancer une partie | Joueur | Demarrer une nouvelle partie |
| UC-02 | Connecter controleur | Joueur | Associer un ESP32 |
| ...  | ... | ... | ... |

### UC-01 : Lancer une partie (detaille)
Acteurs : Joueur (via web ou ESP32)
Preconditions : Serveur WS demarre, au moins 1 ecran connecte
Scenario nominal :
1. Le systeme reinitialise le score a 0
2. La bille est placee dans le lanceur
3. ...
Extensions :
- 1a. Partie en cours → confirmation avant reinitialisation
```

#### 4. Architecture technique

Schema des composants et leurs interactions. Texte ou ASCII, peu importe, tant que c'est clair.

```markdown
┌──────────┐  WebSocket  ┌──────────┐
│ UI Web   │◄───────────►│ Serveur  │
│ (Three.js)│            │ (Node.js)│
└──────────┘             └────┬─────┘
                              │ Serial
                         ┌────▼─────┐
                         │  ESP32   │
                         └──────────┘
```

#### 5. Diagrammes UML

Liens ou contenu des diagrammes (use case, sequence, etat). Au minimum 3.

```markdown
(voir uml/use-case-diagram.puml)
(voir uml/sequence-lancer-partie.puml)
(voir uml/state-partie.puml)
... (101lignes restantes)