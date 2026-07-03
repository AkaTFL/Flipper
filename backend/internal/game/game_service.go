package game

import (
	"encoding/json"
	"log"
	"time"
)

// GameService encapsule la logique métier des messages WebSocket
type GameService struct {
	hub      *Hub
	handlers map[string]messageHandler
}

type messageHandler interface {
	Handle(gs *GameService, msg Message, messageBytes []byte) ([]byte, bool)
}

type messageHandlerFunc func(gs *GameService, msg Message, messageBytes []byte) ([]byte, bool)

func (f messageHandlerFunc) Handle(gs *GameService, msg Message, messageBytes []byte) ([]byte, bool) {
	return f(gs, msg, messageBytes)
}

// NewGameService crée une nouvelle instance du service de jeu
func NewGameService(hub *Hub) *GameService {
	gs := &GameService{
		hub:      hub,
		handlers: make(map[string]messageHandler),
	}
	gs.registerHandlers()
	return gs
}

// HandleMessage route et traite les messages WebSocket selon leur type
// Retourne une réponse optionnelle à envoyer au client et un booléen indiquant si c'est une réponse directe
func (gs *GameService) HandleMessage(msg Message, messageBytes []byte) ([]byte, bool) {
	handler, ok := gs.handlers[msg.Type]
	if !ok {
		log.Printf("Type de message inconnu: %s", msg.Type)
		return nil, false
	}

	return handler.Handle(gs, msg, messageBytes)
}

func (gs *GameService) registerHandlers() {
	gs.handlers["ping"] = messageHandlerFunc(func(gs *GameService, _ Message, _ []byte) ([]byte, bool) {
		return NewPongMessage(), true
	})

	gs.handlers["flipper_action"] = messageHandlerFunc(func(gs *GameService, _ Message, messageBytes []byte) ([]byte, bool) {
		gs.handleFlipperAction(messageBytes)
		return nil, false
	})

	gs.handlers["impact"] = messageHandlerFunc(func(gs *GameService, msg Message, _ []byte) ([]byte, bool) {
		gs.handleImpact(msg.Payload)
		return nil, false
	})

	gs.handlers["game_state"] = messageHandlerFunc(func(gs *GameService, _ Message, messageBytes []byte) ([]byte, bool) {
		gs.handleGameState(messageBytes)
		return nil, false
	})

	gs.handlers["start_game"] = messageHandlerFunc(func(gs *GameService, _ Message, _ []byte) ([]byte, bool) {
		gs.handleStartGame()
		return nil, false
	})

	gs.handlers["save_game"] = messageHandlerFunc(func(gs *GameService, msg Message, _ []byte) ([]byte, bool) {
		gs.handleSaveGame(msg.Payload)
		return nil, false
	})

	gs.handlers["load_game"] = messageHandlerFunc(func(gs *GameService, msg Message, _ []byte) ([]byte, bool) {
		gs.handleLoadGame(msg.Payload)
		return nil, false
	})

	gs.handlers["boss_fight_started"] = messageHandlerFunc(func(gs *GameService, _ Message, _ []byte) ([]byte, bool) {
		gs.handleBossFightStarted()
		return nil, false
	})

	gs.handlers["boss_fight_toggled"] = messageHandlerFunc(func(gs *GameService, _ Message, _ []byte) ([]byte, bool) {
		gs.handleBossFightToggled()
		return nil, false
	})

	damageTestHandler := messageHandlerFunc(func(gs *GameService, _ Message, _ []byte) ([]byte, bool) {
		gs.handlePlayerDamageTest()
		return nil, false
	})
	gs.handlers["boss_attack_test"] = damageTestHandler
	gs.handlers["player_damage_test"] = damageTestHandler

	gs.handlers["ball_lost"] = messageHandlerFunc(func(gs *GameService, _ Message, _ []byte) ([]byte, bool) {
		gs.handleBallLost()
		return nil, false
	})
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

	// Broadcaster reset score
	gs.hub.broadcast <- NewScoreUpdateMessage(gs.hub.scorer.Reset())

	// Broadcaster reset boss
	gs.hub.broadcast <- NewBossStateUpdateMessage(gs.hub.boss.ResetForGameStart())

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
