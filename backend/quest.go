package main

import (
	"math/rand"
	"strings"
	"sync"
	"time"
)

type Quest struct {
	ID        string `json:"id"`
	Category  string `json:"category"`
	Label     string `json:"label"`
	Target    int    `json:"target"`
	Progress  int    `json:"progress"`
	Completed bool   `json:"completed"`
}

type QuestUpdatePayload struct {
	ActiveQuests       []Quest `json:"activeQuests"`
	CompletedCount     int     `json:"completedCount"`
	RequiredCount      int     `json:"requiredCount"`
	AllCompleted       bool    `json:"allCompleted"`
	BossFightTriggered bool    `json:"bossFightTriggered"`
	Phase              int     `json:"phase"`
	Mode               string  `json:"mode"`
}

type QuestStateSnapshot struct {
	ActiveQuests       []Quest `json:"activeQuests"`
	LoopLeftDone       bool    `json:"loopLeftDone"`
	LoopRightDone      bool    `json:"loopRightDone"`
	PhaseStartedAt     int64   `json:"phaseStartedAt"`
	BossFightTriggered bool    `json:"bossFightTriggered"`
	CurrentPhase       int     `json:"currentPhase"`
}

type QuestTracker struct {
	mutex              sync.Mutex
	pool               []Quest
	activeQuests       []Quest
	loopLeftDone       bool
	loopRightDone      bool
	phaseStartedAt     int64
	bossFightTriggered bool
	currentPhase       int
	random             *rand.Rand
}

func newQuestTracker() *QuestTracker {
	return &QuestTracker{
		pool:   defaultQuestPool(),
		random: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func defaultQuestPool() []Quest {
	return []Quest{
		{ID: "score_2000", Category: "score", Label: "Atteindre 2 000 points", Target: 2000},
		{ID: "score_3500", Category: "score", Label: "Atteindre 3 500 points", Target: 3500},
		{ID: "combo_x3", Category: "score", Label: "Atteindre un combo x3", Target: 3},
		{ID: "target_center_2", Category: "precision", Label: "Toucher 2 fois la zone centrale d'une cible basse", Target: 2},
		{ID: "ramp_perfect_1", Category: "precision", Label: "Réussir 1 rampe parfaite", Target: 1},
		{ID: "ramp_simple_2", Category: "precision", Label: "Réussir 2 passages de rampe", Target: 2},
		{ID: "loop_left_right", Category: "exploration", Label: "Passer une fois par chaque loop latéral", Target: 2},
		{ID: "bumpers_5", Category: "exploration", Label: "Toucher 5 bumpers au total", Target: 5},
		{ID: "survive_20s", Category: "exploration", Label: "Survivre 20 secondes avec la même bille", Target: 20},
	}
}

func (q *QuestTracker) ResetForGameStart(startedAt int64) QuestUpdatePayload {
	q.mutex.Lock()
	defer q.mutex.Unlock()

	if startedAt <= 0 {
		startedAt = time.Now().UnixMilli()
	}

	q.phaseStartedAt = startedAt
	q.loopLeftDone = false
	q.loopRightDone = false
	q.bossFightTriggered = false
	q.currentPhase = 1
	q.activeQuests = q.drawActiveQuestsLocked()

	return q.currentStateLocked("quests_started")
}

func (q *QuestTracker) Snapshot() QuestStateSnapshot {
	q.mutex.Lock()
	defer q.mutex.Unlock()

	return QuestStateSnapshot{
		ActiveQuests:       append([]Quest(nil), q.activeQuests...),
		LoopLeftDone:       q.loopLeftDone,
		LoopRightDone:      q.loopRightDone,
		PhaseStartedAt:     q.phaseStartedAt,
		BossFightTriggered: q.bossFightTriggered,
		CurrentPhase:       q.currentPhase,
	}
}

func (q *QuestTracker) Restore(snapshot QuestStateSnapshot) QuestUpdatePayload {
	q.mutex.Lock()
	defer q.mutex.Unlock()

	q.activeQuests = append([]Quest(nil), snapshot.ActiveQuests...)
	q.loopLeftDone = snapshot.LoopLeftDone
	q.loopRightDone = snapshot.LoopRightDone
	q.phaseStartedAt = snapshot.PhaseStartedAt
	q.bossFightTriggered = snapshot.BossFightTriggered
	q.currentPhase = snapshot.CurrentPhase
	if q.currentPhase <= 0 {
		q.currentPhase = 1
	}

	return q.currentStateLocked("game_loaded")
}

func (q *QuestTracker) UpdateAfterImpact(score ScoreUpdatePayload, impact ImpactPayload) (QuestUpdatePayload, bool) {
	q.mutex.Lock()
	defer q.mutex.Unlock()

	if len(q.activeQuests) == 0 {
		return QuestUpdatePayload{}, false
	}

	changed := false
	for index := range q.activeQuests {
		before := q.activeQuests[index]
		q.updateQuestLocked(&q.activeQuests[index], score, impact)

		if before.Progress != q.activeQuests[index].Progress || before.Completed != q.activeQuests[index].Completed {
			changed = true
		}
	}

	if !changed {
		return QuestUpdatePayload{}, false
	}

	if q.allCompletedLocked() && !q.bossFightTriggered {
		q.bossFightTriggered = true
	}

	return q.currentStateLocked("quest_progress"), true
}

func (q *QuestTracker) UpdateAfterTime(now int64) (QuestUpdatePayload, bool) {
	q.mutex.Lock()
	defer q.mutex.Unlock()

	if len(q.activeQuests) == 0 || q.bossFightTriggered {
		return QuestUpdatePayload{}, false
	}

	changed := false
	for index := range q.activeQuests {
		if q.activeQuests[index].ID != "survive_20s" || q.activeQuests[index].Completed {
			continue
		}

		before := q.activeQuests[index]
		q.updateSurvivalQuestLocked(&q.activeQuests[index], now)
		if before.Progress != q.activeQuests[index].Progress || before.Completed != q.activeQuests[index].Completed {
			changed = true
		}
	}

	if !changed {
		return QuestUpdatePayload{}, false
	}

	if q.allCompletedLocked() && !q.bossFightTriggered {
		q.bossFightTriggered = true
	}

	return q.currentStateLocked("quest_time_progress"), true
}

func (q *QuestTracker) ResetSurvivalQuestForNewBall(now int64) (QuestUpdatePayload, bool) {
	q.mutex.Lock()
	defer q.mutex.Unlock()

	if len(q.activeQuests) == 0 || q.bossFightTriggered {
		return QuestUpdatePayload{}, false
	}

	if now <= 0 {
		now = time.Now().UnixMilli()
	}

	changed := false
	q.phaseStartedAt = now
	for index := range q.activeQuests {
		if q.activeQuests[index].ID != "survive_20s" || q.activeQuests[index].Completed {
			continue
		}

		if q.activeQuests[index].Progress != 0 {
			q.activeQuests[index].Progress = 0
			changed = true
		}
	}

	if !changed {
		return QuestUpdatePayload{}, false
	}

	return q.currentStateLocked("quest_ball_reset"), true
}

func (q *QuestTracker) AdvanceToNextPhase(startedAt int64) (QuestUpdatePayload, bool) {
	q.mutex.Lock()
	defer q.mutex.Unlock()

	if q.currentPhase >= 3 {
		return QuestUpdatePayload{}, false
	}

	if startedAt <= 0 {
		startedAt = time.Now().UnixMilli()
	}

	q.currentPhase++
	q.phaseStartedAt = startedAt
	q.loopLeftDone = false
	q.loopRightDone = false
	q.bossFightTriggered = false
	q.activeQuests = q.drawActiveQuestsLocked()

	return q.currentStateLocked("phase_transition"), true
}

func (q *QuestTracker) drawActiveQuestsLocked() []Quest {
	categories := []string{"score", "precision", "exploration"}
	active := make([]Quest, 0, len(categories))

	for _, category := range categories {
		choices := make([]Quest, 0)
		for _, quest := range q.pool {
			if quest.Category == category {
				quest.Progress = 0
				quest.Completed = false
				choices = append(choices, quest)
			}
		}

		if len(choices) == 0 {
			continue
		}

		active = append(active, choices[q.random.Intn(len(choices))])
	}

	return active
}

func (q *QuestTracker) updateQuestLocked(quest *Quest, score ScoreUpdatePayload, impact ImpactPayload) {
	if quest.Completed {
		return
	}

	switch quest.ID {
	case "score_2000", "score_3500":
		quest.Progress = clampQuestProgress(score.Score, quest.Target)

	case "combo_x3":
		quest.Progress = clampQuestProgress(score.ComboCount, quest.Target)

	case "target_center_2":
		if isTargetCenterImpact(impact) {
			quest.Progress++
		}

	case "ramp_perfect_1":
		if impact.ObjectID == "ramp-main-perfect" {
			quest.Progress++
		}

	case "ramp_simple_2":
		if impact.ObjectID == "ramp-main-simple" || impact.ObjectID == "ramp-main-perfect" {
			quest.Progress++
		}

	case "loop_left_right":
		if impact.ObjectID == "loop-left" {
			q.loopLeftDone = true
		}
		if impact.ObjectID == "loop-right" {
			q.loopRightDone = true
		}

		quest.Progress = 0
		if q.loopLeftDone {
			quest.Progress++
		}
		if q.loopRightDone {
			quest.Progress++
		}

	case "bumpers_5":
		if impact.ObjectType == "bumper" {
			quest.Progress++
		}

	case "survive_20s":
		q.updateSurvivalQuestLocked(quest, impact.Timestamp)
	}

	quest.Progress = clampQuestProgress(quest.Progress, quest.Target)
	if quest.Progress >= quest.Target {
		quest.Completed = true
	}
}

func (q *QuestTracker) updateSurvivalQuestLocked(quest *Quest, now int64) {
	if q.phaseStartedAt <= 0 || now <= q.phaseStartedAt {
		return
	}

	seconds := int((now - q.phaseStartedAt) / 1000)
	quest.Progress = clampQuestProgress(seconds, quest.Target)
	if quest.Progress >= quest.Target {
		quest.Completed = true
	}
}

func (q *QuestTracker) currentStateLocked(mode string) QuestUpdatePayload {
	completed := 0
	for _, quest := range q.activeQuests {
		if quest.Completed {
			completed++
		}
	}

	return QuestUpdatePayload{
		ActiveQuests:       append([]Quest(nil), q.activeQuests...),
		CompletedCount:     completed,
		RequiredCount:      len(q.activeQuests),
		AllCompleted:       len(q.activeQuests) > 0 && completed == len(q.activeQuests),
		BossFightTriggered: q.bossFightTriggered,
		Phase:              q.currentPhase,
		Mode:               mode,
	}
}

func (q *QuestTracker) allCompletedLocked() bool {
	if len(q.activeQuests) == 0 {
		return false
	}

	for _, quest := range q.activeQuests {
		if !quest.Completed {
			return false
		}
	}

	return true
}

func isTargetCenterImpact(impact ImpactPayload) bool {
	if impact.ObjectType != "target" {
		return false
	}

	id := strings.ToLower(impact.ObjectID)
	return strings.Contains(id, "center") || strings.Contains(id, "centre")
}

func clampQuestProgress(value, target int) int {
	if value < 0 {
		return 0
	}
	if target > 0 && value > target {
		return target
	}
	return value
}
