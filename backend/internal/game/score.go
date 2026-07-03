package game

import (
	"strings"
	"sync"
	"time"
)

const (
	defaultComboWindow     = 2 * time.Second
	defaultMultiplierReset = 3 * time.Second
	loopBasePoints         = 120
	loopMaxPoints          = 350
	superRampComboBonus    = 700
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

type ScoreStateSnapshot struct {
	Score             int               `json:"score"`
	ComboCount        int               `json:"comboCount"`
	HitStreak         int               `json:"hitStreak"`
	LastImpactAt      int64             `json:"lastImpactAt"`
	RecentImpactTypes []string          `json:"recentImpactTypes"`
	LoopStreakByID    map[string]int    `json:"loopStreakById"`
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

type scoreImpactRule struct {
	objectTypes []string
	points      func(s *ScoreTracker, objectID string) int
}

type thresholdRule struct {
	min   int
	value int
}

var baseScoreRules = []scoreImpactRule{
	{
		objectTypes: []string{"bumper"},
		points: func(s *ScoreTracker, _ string) int {
			if s.comboCount >= 2 {
				return 40
			}
			return 25
		},
	},
	{
		objectTypes: []string{"repulse"},
		points: func(s *ScoreTracker, _ string) int {
			if s.comboCount >= 2 {
				return 60
			}
			return 40
		},
	},
	{
		objectTypes: []string{"target"},
		points: func(_ *ScoreTracker, objectID string) int {
			if containsAny(objectID, "center", "centre", "precise", "precision") {
				return 75
			}
			return 50
		},
	},
	{
		objectTypes: []string{"launching_ramp", "ramp"},
		points: func(_ *ScoreTracker, objectID string) int {
			if containsAny(objectID, "perfect", "parfait", "clean", "sans-rebond") {
				return 350
			}
			return 200
		},
	},
	{
		objectTypes: []string{"launching_ramp_rail", "rail", "loop", "lane"},
		points: func(s *ScoreTracker, objectID string) int {
			return s.loopPoints(objectID)
		},
	},
	{
		objectTypes: []string{"star", "star_zone", "etoile", "étoile"},
		points: func(_ *ScoreTracker, objectID string) int {
			if containsAny(objectID, "center", "centre", "exact") {
				return 400
			}
			if containsAny(objectID, "outer", "edge", "ext") {
				return 50
			}
			return 200
		},
	},
	{
		objectTypes: []string{"wall"},
		points: func(_ *ScoreTracker, _ string) int {
			return 0
		},
	},
	{
		objectTypes: []string{"portal"},
		points: func(_ *ScoreTracker, _ string) int {
			return 150
		},
	},
	{
		objectTypes: []string{"saucer"},
		points: func(_ *ScoreTracker, _ string) int {
			return 200
		},
	},
	{
		objectTypes: []string{"palle", "ball", ""},
		points: func(_ *ScoreTracker, _ string) int {
			return 0
		},
	},
}

var comboBonusRules = []thresholdRule{
	{min: 5, value: 400},
	{min: 4, value: 250},
	{min: 3, value: 120},
	{min: 2, value: 50},
}

var multiplierRules = []thresholdRule{
	{min: 18, value: 4},
	{min: 12, value: 3},
	{min: 6, value: 2},
}

var rampFamilyTypes = map[string]struct{}{
	"launching_ramp":      {},
	"launching_ramp_rail": {},
	"ramp":                {},
	"rail":                {},
	"loop":                {},
	"lane":                {},
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

func (s *ScoreTracker) Snapshot() ScoreStateSnapshot {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	snapshot := ScoreStateSnapshot{
		Score:          s.score,
		ComboCount:     s.comboCount,
		HitStreak:      s.hitStreak,
		RecentImpactTypes: append([]string(nil), s.recentImpactTypes...),
		LastImpactAt:   s.lastImpactAt.UnixMilli(),
		LoopStreakByID:  make(map[string]int, len(s.loopStreakByID)),
	}

	for key, value := range s.loopStreakByID {
		snapshot.LoopStreakByID[key] = value
	}

	return snapshot
}

func (s *ScoreTracker) Restore(snapshot ScoreStateSnapshot) ScoreUpdatePayload {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.score = snapshot.Score
	s.comboCount = snapshot.ComboCount
	s.hitStreak = snapshot.HitStreak
	if snapshot.LastImpactAt > 0 {
		s.lastImpactAt = time.UnixMilli(snapshot.LastImpactAt)
	} else {
		s.lastImpactAt = time.Time{}
	}
	s.recentImpactTypes = append([]string(nil), snapshot.RecentImpactTypes...)
	s.loopStreakByID = make(map[string]int, len(snapshot.LoopStreakByID))
	for key, value := range snapshot.LoopStreakByID {
		s.loopStreakByID[key] = value
	}

	return s.currentStateLocked(0, "game_loaded")
}

func (s *ScoreTracker) currentStateLocked(delta int, mode string) ScoreUpdatePayload {
	return ScoreUpdatePayload{
		Score:            s.score,
		Delta:            delta,
		BasePoints:       0,
		ComboCount:       s.comboCount,
		ComboBonus:       0,
		ComboMultiplier:  multiplierForHitStreak(s.hitStreak),
		GlobalMultiplier: multiplierForHitStreak(s.hitStreak),
		SuperCombo:       false,
		ObjectType:       "",
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
	for _, rule := range baseScoreRules {
		if rule.matches(objectType) {
			return rule.points(s, objectID)
		}
	}

	return 0
}

func (s *ScoreTracker) loopPoints(objectID string) int {
	streak := s.loopStreakByID[objectID] + 1
	s.loopStreakByID[objectID] = streak

	scaled := loopBasePoints + ((streak - 1) * 80)
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
	for _, rule := range comboBonusRules {
		if comboCount >= rule.min {
			return rule.value
		}
	}

	return 0
}

func multiplierForHitStreak(hitStreak int) int {
	for _, rule := range multiplierRules {
		if hitStreak >= rule.min {
			return rule.value
		}
	}

	return 1
}

func isRampFamilyType(objectType string) bool {
	_, ok := rampFamilyTypes[objectType]
	return ok
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

func (rule scoreImpactRule) matches(objectType string) bool {
	for _, candidate := range rule.objectTypes {
		if candidate == objectType {
			return true
		}
	}

	return false
}
