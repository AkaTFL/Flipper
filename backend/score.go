package main

import (
	"strings"
	"sync"
	"time"
)

const (
	defaultComboWindow     = 2 * time.Second
	defaultMultiplierReset = 3 * time.Second
	loopBasePoints         = 300
	loopMaxPoints          = 800
	superRampComboBonus    = 2000
)

type ScoreUpdatePayload struct {
	Score            int    `json:"score"`
	Delta            int    `json:"delta"`
	BasePoints       int    `json:"basePoints"`
	ComboCount       int    `json:"comboCount"`
	ComboBonus       int    `json:"comboBonus"`
	ComboMultiplier  int    `json:"comboMultiplier"`
	GlobalMultiplier int    `json:"globalMultiplier"`
	SuperCombo       bool   `json:"superCombo"`
	ObjectID         string `json:"objectId,omitempty"`
	ObjectType       string `json:"objectType,omitempty"`
}

type ScoreConfig struct {
	ComboWindow     time.Duration
	MultiplierReset time.Duration
}

type ScoreTracker struct {
	mutex             sync.Mutex
	config            ScoreConfig
	score             int
	comboCount        int
	hitStreak         int
	lastImpactAt      time.Time
	recentImpactTypes []string
	loopStreakByID    map[string]int
	now               func() time.Time
}

var defaultScoreConfig = ScoreConfig{
	ComboWindow:     defaultComboWindow,
	MultiplierReset: defaultMultiplierReset,
}

func newScoreTracker(config ScoreConfig) *ScoreTracker {
	if config.ComboWindow <= 0 {
		config.ComboWindow = defaultComboWindow
	}
	if config.MultiplierReset <= 0 {
		config.MultiplierReset = defaultMultiplierReset
	}

	return &ScoreTracker{
		config:         config,
		loopStreakByID: make(map[string]int),
		now:            time.Now,
	}
}

func (s *ScoreTracker) Reset() ScoreUpdatePayload {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.score = 0
	s.comboCount = 0
	s.hitStreak = 0
	s.lastImpactAt = time.Time{}
	s.recentImpactTypes = nil
	s.loopStreakByID = make(map[string]int)

	return ScoreUpdatePayload{
		Score:            0,
		Delta:            0,
		BasePoints:       0,
		ComboCount:       0,
		ComboBonus:       0,
		ComboMultiplier:  1,
		GlobalMultiplier: 1,
		SuperCombo:       false,
	}
}

func (s *ScoreTracker) ApplyImpact(impact ImpactPayload) (ScoreUpdatePayload, bool) {
	impactTime := s.resolveImpactTime(impact)
	normalizedType := normalizeScoreKey(impact.ObjectType)
	normalizedID := normalizeScoreKey(impact.ObjectID)

	s.mutex.Lock()
	defer s.mutex.Unlock()

	if !s.lastImpactAt.IsZero() && impactTime.Before(s.lastImpactAt) {
		impactTime = s.lastImpactAt
	}

	deltaSinceLast := time.Duration(0)
	if !s.lastImpactAt.IsZero() {
		deltaSinceLast = impactTime.Sub(s.lastImpactAt)
	}

	s.hitStreak = s.nextHitStreak(deltaSinceLast)
	s.comboCount = s.nextComboCount(deltaSinceLast)

	basePoints := s.basePointsForImpact(normalizedType, normalizedID)
	if basePoints <= 0 {
		s.lastImpactAt = impactTime
		return ScoreUpdatePayload{}, false
	}

	globalMultiplier := multiplierForHitStreak(s.hitStreak)
	comboBonus := comboBonusForCount(s.comboCount)
	superCombo := s.registerRecentType(normalizedType)
	if superCombo {
		comboBonus += superRampComboBonus
	}

	delta := (basePoints * globalMultiplier) + comboBonus
	s.score += delta
	s.lastImpactAt = impactTime

	return ScoreUpdatePayload{
		Score:            s.score,
		Delta:            delta,
		BasePoints:       basePoints,
		ComboCount:       s.comboCount,
		ComboBonus:       comboBonus,
		ComboMultiplier:  globalMultiplier,
		GlobalMultiplier: globalMultiplier,
		SuperCombo:       superCombo,
		ObjectID:         impact.ObjectID,
		ObjectType:       normalizedType,
	}, true
}

func (s *ScoreTracker) resolveImpactTime(impact ImpactPayload) time.Time {
	if impact.Timestamp > 0 {
		return time.UnixMilli(impact.Timestamp)
	}
	return s.now()
}

func (s *ScoreTracker) nextHitStreak(delta time.Duration) int {
	if s.lastImpactAt.IsZero() || delta > s.config.MultiplierReset {
		return 1
	}
	return s.hitStreak + 1
}

func (s *ScoreTracker) nextComboCount(delta time.Duration) int {
	if s.lastImpactAt.IsZero() || delta > s.config.ComboWindow {
		return 1
	}
	return s.comboCount + 1
}

func (s *ScoreTracker) basePointsForImpact(objectType, objectID string) int {
	switch objectType {
	case "bumper":
		if s.comboCount >= 2 {
			return 75
		}
		return 50
	case "target":
		if containsAny(objectID, "center", "centre", "precise", "precision") {
			return 150
		}
		return 100
	case "launching_ramp", "ramp":
		if containsAny(objectID, "perfect", "parfait", "clean", "sans-rebond") {
			return 750
		}
		return 500
	case "launching_ramp_rail", "rail", "loop", "lane":
		return s.loopPoints(objectID)
	case "star", "star_zone", "etoile", "étoile":
		if containsAny(objectID, "center", "centre", "exact") {
			return 1000
		}
		if containsAny(objectID, "outer", "edge", "ext") {
			return 100
		}
		return 500
	case "wall":
		return 25
	case "portal":
		return 300
	case "saucer":
		return 500
	case "palle", "ball", "":
		return 0
	default:
		return 0
	}
}

func (s *ScoreTracker) loopPoints(objectID string) int {
	streak := s.loopStreakByID[objectID] + 1
	s.loopStreakByID[objectID] = streak

	scaled := loopBasePoints + ((streak - 1) * 250)
	if scaled > loopMaxPoints {
		return loopMaxPoints
	}
	return scaled
}

func (s *ScoreTracker) registerRecentType(objectType string) bool {
	isRampFamily := isRampFamilyType(objectType)
	if !isRampFamily {
		s.recentImpactTypes = appendAndTrim(s.recentImpactTypes, objectType, 3)
		return false
	}

	s.recentImpactTypes = appendAndTrim(s.recentImpactTypes, objectType, 3)
	if len(s.recentImpactTypes) < 3 {
		return false
	}

	for _, impactType := range s.recentImpactTypes[len(s.recentImpactTypes)-3:] {
		if !isRampFamilyType(impactType) {
			return false
		}
	}

	return true
}

func comboBonusForCount(comboCount int) int {
	switch {
	case comboCount >= 5:
		return 1000
	case comboCount == 4:
		return 700
	case comboCount == 3:
		return 300
	case comboCount == 2:
		return 100
	default:
		return 0
	}
}

func multiplierForHitStreak(hitStreak int) int {
	switch {
	case hitStreak >= 10:
		return 4
	case hitStreak >= 6:
		return 3
	case hitStreak >= 3:
		return 2
	default:
		return 1
	}
}

func isRampFamilyType(objectType string) bool {
	switch objectType {
	case "launching_ramp", "launching_ramp_rail", "ramp", "rail", "loop", "lane":
		return true
	default:
		return false
	}
}

func appendAndTrim(values []string, value string, maxLen int) []string {
	values = append(values, value)
	if len(values) <= maxLen {
		return values
	}
	return values[len(values)-maxLen:]
}

func containsAny(value string, candidates ...string) bool {
	for _, candidate := range candidates {
		if strings.Contains(value, candidate) {
			return true
		}
	}
	return false
}

func normalizeScoreKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}
