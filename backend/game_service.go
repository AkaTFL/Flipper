package main

import (
	"encoding/json"
	"log"
	"time"
)

// GameService encapsule la logique métier des messages WebSocket
type GameService struct {
	hub *Hub
}

// NewGameService crée une nouvelle instance du service de jeu
func NewGameService(hub *Hub) *GameService {
	return &GameService{hub: hub}
}

// HandleMessage route et traite les messages WebSocket selon leur type
// Retourne une réponse optionnelle à envoyer au client et un booléen indiquant si c'est une réponse directe
func (gs *GameService) HandleMessage(msg Message, messageBytes []byte) ([]byte, bool) {
	switch msg.Type {
	case "ping":
		return NewPongMessage(), true

	case "flipper_action":
		gs.handleFlipperAction(messageBytes)
		return nil, false

	case "impact":
		gs.handleImpact(msg.Payload)
		return nil, false

	case "game_state":
		gs.handleGameState(messageBytes)
		return nil, false

	case "start_game":
		gs.handleStartGame()
		return nil, false

	case "save_game":
		gs.handleSaveGame(msg.Payload)
		return nil, false

	case "load_game":
		gs.handleLoadGame(msg.Payload)
		return nil, false

	case "boss_fight_started":
		gs.handleBossFightStarted()
		return nil, false

	case "boss_fight_toggled":
		gs.handleBossFightToggled()
		return nil, false

	case "boss_attack_test", "player_damage_test":
		gs.handlePlayerDamageTest()
		return nil, false

	case "ball_lost":
		gs.handleBallLost()
		return nil, false

	default:
		log.Printf("Type de message inconnu: %s", msg.Type)
		return nil, false
	}
}

// handleFlipperAction traite les actions flipper (broadcast uniquement)
func (gs *GameService) handleFlipperAction(messageBytes []byte) {
	log.Printf("Action flipper reçue: %s", string(messageBytes))
	gs.hub.broadcast <- messageBytes
}

// handleImpact traite les impacts (scoring, MQTT, boss damage)
func (gs *GameService) handleImpact(payload json.RawMessage) {
	var impact ImpactPayload
	if err := json.Unmarshal(payload, &impact); err != nil {
		log.Printf("Erreur parsing impact: %v", err)
		return
	}

	log.Printf("Impact reçu sur %s (%s)", impact.ObjectID, impact.ObjectType)

	// Publier impact via MQTT
	if gs.hub.mqtt != nil {
		gs.hub.mqtt.PublishImpact(impact)
	}

	// Broadcaster l'impact
	gs.hub.broadcast <- NewImpactMessage(payload)

	// Appliquer le calcul de score
	if scoreUpdate, ok := gs.hub.scorer.ApplyImpact(impact); ok {
		gs.hub.broadcast <- NewScoreUpdateMessage(scoreUpdate)

		shouldStartBoss := false
		if !gs.hub.boss.IsActive() {
			questUpdate, ok := gs.hub.quests.UpdateAfterImpact(scoreUpdate, impact)
			if ok {
				gs.hub.broadcast <- NewQuestUpdateMessage(questUpdate)
				if questUpdate.BossFightTriggered {
					shouldStartBoss = true
				}
			}
		}

		// Appliquer les dégâts au boss
		if bossUpdate, ok := gs.hub.boss.ApplyScoreDamage(scoreUpdate.Delta); ok {
			gs.hub.broadcast <- NewBossStateUpdateMessage(bossUpdate)
			if bossUpdate.Defeated {
				if questUpdate, ok := gs.hub.quests.AdvanceToNextPhase(time.Now().UnixMilli()); ok {
					gs.hub.broadcast <- NewQuestUpdateMessage(questUpdate)
				}
				gs.hub.broadcast <- NewBossStateUpdateMessage(gs.hub.boss.ResetForGameStart())
			}
		}

		if shouldStartBoss {
			gs.hub.broadcast <- NewBossStateUpdateMessage(gs.hub.boss.StartBossFight())
		}
	}
}

// handleGameState traite les mises à jour d'état de jeu (broadcast uniquement)
func (gs *GameService) handleGameState(messageBytes []byte) {
	gs.hub.broadcast <- messageBytes
}

// handleStartGame traite le démarrage du jeu (reset des scores et boss)
func (gs *GameService) handleStartGame() {
	log.Println("Nouvelle partie démarrée")

	// Publier signal LED
	if gs.hub.mqtt != nil {
		gs.hub.mqtt.PublishLEDFlash()
	}

	// Broadcaster la confirmation de démarrage
	gs.hub.broadcast <- NewGameStartedMessage()

	// Vérifier si une partie a été chargée
	hasLoadedGame := gs.hub.lastLoadSlot >= 0

	// Ne pas réinitialiser si une partie a été chargée
	if !hasLoadedGame {
		// Broadcaster reset score
		gs.hub.broadcast <- NewScoreUpdateMessage(gs.hub.scorer.Reset())

		// Broadcaster reset boss
		gs.hub.broadcast <- NewBossStateUpdateMessage(gs.hub.boss.ResetForGameStart())
	} else {
		// Partie chargée : juste marquer le démarrage sans reset
		log.Println("Démarrage avec partie chargée du slot", gs.hub.lastLoadSlot)
		// Réinitialiser le flag pour la prochaine partie
		gs.hub.lastLoadSlot = -1
	}

	// Broadcaster reset joueur
	gs.hub.broadcast <- NewPlayerStateUpdateMessage(gs.hub.player.ResetForGameStart())

	// Broadcaster les quêtes tirées pour cette partie
	gs.hub.broadcast <- NewQuestUpdateMessage(gs.hub.quests.ResetForGameStart(time.Now().UnixMilli()))
	gs.hub.startQuestTimer()
}

func (gs *GameService) handleSaveGame(payload json.RawMessage) {
	slot, ok := parseGameSlot(payload)
	if !ok {
		gs.hub.broadcast <- NewGameSaveStatusMessage(GameSaveStatusPayload{
			Slot:    0,
			Action:  "error",
			Message: "slot de sauvegarde invalide",
		})
		return
	}

	entry, err := gs.hub.saveStore.Save(slot, gs.hub.captureSnapshot())
	if err != nil {
		gs.hub.broadcast <- NewGameSaveStatusMessage(GameSaveStatusPayload{
			Slot:    slot,
			Action:  "error",
			Message: err.Error(),
		})
		return
	}

	gs.hub.broadcast <- NewGameSaveStatusMessage(GameSaveStatusPayload{
		Slot:    slot,
		Action:  "saved",
		SavedAt: entry.SavedAt,
	})
}

func (gs *GameService) handleLoadGame(payload json.RawMessage) {
	slot, ok := parseGameSlot(payload)
	if !ok {
		gs.hub.broadcast <- NewGameSaveStatusMessage(GameSaveStatusPayload{
			Slot:    0,
			Action:  "error",
			Message: "slot de chargement invalide",
		})
		return
	}

	entry, found := gs.hub.saveStore.Load(slot)
	if !found {
		gs.hub.broadcast <- NewGameSaveStatusMessage(GameSaveStatusPayload{
			Slot:    slot,
			Action:  "error",
			Message: "aucune sauvegarde sur ce slot",
		})
		return
	}

	// Marquer que une partie a été chargée
	gs.hub.lastLoadSlot = slot

	restore := gs.hub.restoreSnapshot(entry.Snapshot)
	gs.hub.broadcast <- NewScoreUpdateMessage(restore.Score)
	gs.hub.broadcast <- NewBossStateUpdateMessage(restore.Boss)
	gs.hub.broadcast <- NewPlayerStateUpdateMessage(restore.Player)
	gs.hub.broadcast <- NewQuestUpdateMessage(restore.Quests)
	gs.hub.broadcast <- NewGameSaveStatusMessage(GameSaveStatusPayload{
		Slot:    slot,
		Action:  "loaded",
		SavedAt: entry.SavedAt,
	})
}

// handleBossFightStarted traite l'activation du combat de boss
func (gs *GameService) handleBossFightStarted() {
	log.Println("Boss fight activé")
	gs.hub.broadcast <- NewBossStateUpdateMessage(gs.hub.boss.StartBossFight())
}

// handleBossFightToggled traite le toggle du combat de boss
func (gs *GameService) handleBossFightToggled() {
	log.Println("Boss fight toggle")
	gs.hub.broadcast <- NewBossStateUpdateMessage(gs.hub.boss.ToggleBossFight())
}

// handlePlayerDamageTest simule une attaque du boss tant que les vraies attaques ne sont pas branchées
func (gs *GameService) handlePlayerDamageTest() {
	log.Println("Dégâts joueur test")
	playerUpdate := gs.hub.player.ApplyDamage(defaultBossAttackDamage)
	gs.hub.broadcast <- NewPlayerStateUpdateMessage(playerUpdate)

	if playerUpdate.LastBallLost {
		if questUpdate, ok := gs.hub.quests.ResetSurvivalQuestForNewBall(time.Now().UnixMilli()); ok {
			gs.hub.broadcast <- NewQuestUpdateMessage(questUpdate)
		}
	}
}

// handleBallLost simule une perte de balle
func (gs *GameService) handleBallLost() {
	log.Println("Perte de balle")
	gs.hub.broadcast <- NewPlayerStateUpdateMessage(gs.hub.player.LoseBall())
	if questUpdate, ok := gs.hub.quests.ResetSurvivalQuestForNewBall(time.Now().UnixMilli()); ok {
		gs.hub.broadcast <- NewQuestUpdateMessage(questUpdate)
	}
}

func parseGameSlot(payload json.RawMessage) (int, bool) {
	if len(payload) == 0 {
		return 0, false
	}

	var request GameSlotRequestPayload
	if err := json.Unmarshal(payload, &request); err != nil {
		return 0, false
	}

	if request.Slot < 1 || request.Slot > maxSaveSlots {
		return 0, false
	}

	return request.Slot, true
}
