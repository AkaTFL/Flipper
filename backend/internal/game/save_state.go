package game

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const maxSaveSlots = 4

type GameSnapshot struct {
	Score  ScoreStateSnapshot  `json:"score"`
	Boss   BossStateSnapshot   `json:"boss"`
	Player PlayerStateSnapshot `json:"player"`
	Quests QuestStateSnapshot  `json:"quests"`
}

type GameSaveEntry struct {
	SavedAt  int64        `json:"savedAt"`
	Level    int          `json:"level"`
	Snapshot GameSnapshot `json:"snapshot"`
}

type GameSaveFile struct {
	Slots [maxSaveSlots]*GameSaveEntry `json:"slots"`
}

type GameSlotRequestPayload struct {
	Slot  int `json:"slot"`
	Level int `json:"level"`
}

// SaveSlotInfo résume l'état d'un slot pour l'écran de sélection (sans le snapshot complet)
type SaveSlotInfo struct {
	Slot     int   `json:"slot"`
	Occupied bool  `json:"occupied"`
	Level    int   `json:"level,omitempty"`
	Score    int   `json:"score"`
	SavedAt  int64 `json:"savedAt,omitempty"`
}

type GameSaveStatusPayload struct {
	Slot    int    `json:"slot"`
	Action  string `json:"action"`
	SavedAt int64  `json:"savedAt,omitempty"`
	Message string `json:"message,omitempty"`
}

type GameRestoreResult struct {
	Score  ScoreUpdatePayload
	Boss   BossStateUpdatePayload
	Player PlayerStateUpdatePayload
	Quests QuestUpdatePayload
}

type GameSaveStore struct {
	path  string
	mutex sync.Mutex
	file  GameSaveFile
}

func newGameSaveStore(path string) *GameSaveStore {
	store := &GameSaveStore{path: path}
	_ = store.load()
	return store
}

func (s *GameSaveStore) Save(slot int, level int, snapshot GameSnapshot) (GameSaveEntry, error) {
	if slot < 1 || slot > maxSaveSlots {
		return GameSaveEntry{}, errors.New("slot invalide")
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	entry := &GameSaveEntry{
		SavedAt:  time.Now().UnixMilli(),
		Level:    level,
		Snapshot: snapshot,
	}
	s.file.Slots[slot-1] = entry

	if err := s.persistLocked(); err != nil {
		return GameSaveEntry{}, err
	}

	return *entry, nil
}

// List renvoie un résumé des 4 slots pour l'écran de sélection
func (s *GameSaveStore) List() []SaveSlotInfo {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	infos := make([]SaveSlotInfo, maxSaveSlots)
	for i := 0; i < maxSaveSlots; i++ {
		info := SaveSlotInfo{Slot: i + 1}
		if entry := s.file.Slots[i]; entry != nil {
			info.Occupied = true
			info.Level = entry.Level
			info.Score = entry.Snapshot.Score.Score
			info.SavedAt = entry.SavedAt
		}
		infos[i] = info
	}

	return infos
}

// Delete vide un slot de sauvegarde et persiste le fichier
func (s *GameSaveStore) Delete(slot int) error {
	if slot < 1 || slot > maxSaveSlots {
		return errors.New("slot invalide")
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.file.Slots[slot-1] = nil

	return s.persistLocked()
}

func (s *GameSaveStore) Load(slot int) (GameSaveEntry, bool) {
	if slot < 1 || slot > maxSaveSlots {
		return GameSaveEntry{}, false
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	entry := s.file.Slots[slot-1]
	if entry == nil {
		return GameSaveEntry{}, false
	}

	return *entry, true
}

func (s *GameSaveStore) load() error {
	if s.path == "" {
		return nil
	}

	data, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}

	var file GameSaveFile
	if err := json.Unmarshal(data, &file); err != nil {
		return err
	}

	s.file = file
	return nil
}

func (s *GameSaveStore) persistLocked() error {
	if s.path == "" {
		return nil
	}

	data, err := json.MarshalIndent(s.file, "", "  ")
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}

	tempPath := s.path + ".tmp"
	if err := os.WriteFile(tempPath, data, 0o644); err != nil {
		return err
	}

	return os.Rename(tempPath, s.path)
}

func (h *Hub) captureSnapshot() GameSnapshot {
	return GameSnapshot{
		Score:  h.scorer.Snapshot(),
		Boss:   h.boss.Snapshot(),
		Player: h.player.Snapshot(),
		Quests: h.quests.Snapshot(),
	}
}

func (h *Hub) restoreSnapshot(snapshot GameSnapshot) GameRestoreResult {
	score := h.scorer.Restore(snapshot.Score)
	boss := h.boss.Restore(snapshot.Boss)
	player := h.player.Restore(snapshot.Player)
	quests := h.quests.Restore(snapshot.Quests)
	h.startQuestTimer()

	return GameRestoreResult{
		Score:  score,
		Boss:   boss,
		Player: player,
		Quests: quests,
	}
}
