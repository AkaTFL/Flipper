package main

import "testing"

func TestQuestTrackerDrawsOneQuestPerCategory(t *testing.T) {
	tracker := newQuestTracker()

	state := tracker.ResetForGameStart(1000)

	if len(state.ActiveQuests) != 3 {
		t.Fatalf("expected 3 active quests, got %+v", state)
	}

	categories := map[string]bool{}
	for _, quest := range state.ActiveQuests {
		categories[quest.Category] = true
	}

	for _, category := range []string{"score", "precision", "exploration"} {
		if !categories[category] {
			t.Fatalf("expected category %s in active quests, got %+v", category, state.ActiveQuests)
		}
	}
}

func TestQuestTrackerProgressesTargetCenterQuest(t *testing.T) {
	tracker := newQuestTracker()
	tracker.activeQuests = []Quest{
		{ID: "target_center_2", Category: "precision", Label: "Toucher 2 fois la zone centrale d'une cible basse", Target: 2},
	}

	first, ok := tracker.UpdateAfterImpact(ScoreUpdatePayload{}, ImpactPayload{
		ObjectID:   "target-left-centre",
		ObjectType: "target",
	})
	if !ok {
		t.Fatal("expected quest progress after first target center")
	}
	if first.ActiveQuests[0].Progress != 1 || first.ActiveQuests[0].Completed {
		t.Fatalf("expected progress 1/2, got %+v", first.ActiveQuests[0])
	}

	second, ok := tracker.UpdateAfterImpact(ScoreUpdatePayload{}, ImpactPayload{
		ObjectID:   "target-right-centre",
		ObjectType: "target",
	})
	if !ok {
		t.Fatal("expected quest progress after second target center")
	}
	if !second.ActiveQuests[0].Completed || !second.AllCompleted || !second.BossFightTriggered {
		t.Fatalf("expected quest completed and boss triggered, got %+v", second)
	}
}

func TestQuestTrackerProgressesScoreQuest(t *testing.T) {
	tracker := newQuestTracker()
	tracker.activeQuests = []Quest{
		{ID: "score_2000", Category: "score", Label: "Atteindre 2 000 points", Target: 2000},
	}

	state, ok := tracker.UpdateAfterImpact(ScoreUpdatePayload{Score: 2100}, ImpactPayload{})
	if !ok {
		t.Fatal("expected score quest progress")
	}

	if state.ActiveQuests[0].Progress != 2000 || !state.ActiveQuests[0].Completed {
		t.Fatalf("expected completed score quest, got %+v", state.ActiveQuests[0])
	}
}

func TestQuestTrackerProgressesLoopQuestWithBothSides(t *testing.T) {
	tracker := newQuestTracker()
	tracker.activeQuests = []Quest{
		{ID: "loop_left_right", Category: "exploration", Label: "Passer une fois par chaque loop latéral", Target: 2},
	}

	_, ok := tracker.UpdateAfterImpact(ScoreUpdatePayload{}, ImpactPayload{ObjectID: "loop-left"})
	if !ok {
		t.Fatal("expected loop-left to progress quest")
	}

	state, ok := tracker.UpdateAfterImpact(ScoreUpdatePayload{}, ImpactPayload{ObjectID: "loop-right"})
	if !ok {
		t.Fatal("expected loop-right to progress quest")
	}

	if state.ActiveQuests[0].Progress != 2 || !state.ActiveQuests[0].Completed {
		t.Fatalf("expected loop quest completed, got %+v", state.ActiveQuests[0])
	}
}
