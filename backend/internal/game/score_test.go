package game

import (
	"testing"
	"time"
)

func TestScoreTrackerUsesNewBumperComboValues(t *testing.T) {
	tracker := newScoreTracker(defaultScoreConfig)

	first, ok := tracker.ApplyImpact(ImpactPayload{
		ObjectID:   "bumper-1",
		ObjectType: "bumper",
		Timestamp:  1_000,
	})
	if !ok {
		t.Fatal("expected first impact to generate score")
	}

	if first.BasePoints != 25 || first.Delta != 25 || first.Score != 25 {
		t.Fatalf("expected first bumper hit to add 25 points, got %+v", first)
	}
	if first.ComboBonus != 0 || first.ComboMultiplier != 1 {
		t.Fatalf("expected no combo bonus and x1 multiplier on first hit, got %+v", first)
	}

	second, ok := tracker.ApplyImpact(ImpactPayload{
		ObjectID:   "bumper-2",
		ObjectType: "bumper",
		Timestamp:  2_000,
	})
	if !ok {
		t.Fatal("expected second impact to generate score")
	}

	if second.BasePoints != 40 {
		t.Fatalf("expected combo bumper hit to use 40 base points, got %d", second.BasePoints)
	}
	if second.ComboBonus != 50 || second.ComboMultiplier != 1 {
		t.Fatalf("expected second hit to get +50 combo bonus and x1 multiplier, got %+v", second)
	}
	if second.Delta != 90 || second.Score != 115 {
		t.Fatalf("expected second hit to add 90 and total 115, got %+v", second)
	}
}

func TestScoreTrackerAppliesGlobalMultiplierThresholds(t *testing.T) {
	tracker := newScoreTracker(defaultScoreConfig)

	impacts := []ImpactPayload{
		{ObjectID: "bumper-1", ObjectType: "bumper", Timestamp: 1_000},
		{ObjectID: "bumper-2", ObjectType: "bumper", Timestamp: 1_500},
		{ObjectID: "target-left", ObjectType: "target", Timestamp: 2_000},
		{ObjectID: "target-right", ObjectType: "target", Timestamp: 2_500},
		{ObjectID: "loop-left", ObjectType: "lane", Timestamp: 3_000},
		{ObjectID: "loop-right", ObjectType: "lane", Timestamp: 3_500},
		{ObjectID: "bumper-1", ObjectType: "bumper", Timestamp: 4_000},
		{ObjectID: "bumper-2", ObjectType: "bumper", Timestamp: 4_500},
		{ObjectID: "target-left", ObjectType: "target", Timestamp: 5_000},
		{ObjectID: "target-right", ObjectType: "target", Timestamp: 5_500},
		{ObjectID: "loop-left", ObjectType: "lane", Timestamp: 6_000},
		{ObjectID: "loop-right", ObjectType: "lane", Timestamp: 6_500},
	}

	var last ScoreUpdatePayload
	var ok bool
	for _, impact := range impacts {
		last, ok = tracker.ApplyImpact(impact)
		if !ok {
			t.Fatalf("expected impact %+v to generate score", impact)
		}
	}

	if last.ComboMultiplier != 3 || last.GlobalMultiplier != 3 {
		t.Fatalf("expected 12-hit streak to reach x3 multiplier, got %+v", last)
	}
}

func TestScoreTrackerUsesRepulseComboValues(t *testing.T) {
	tracker := newScoreTracker(defaultScoreConfig)

	first, ok := tracker.ApplyImpact(ImpactPayload{
		ObjectID:   "repulse-1",
		ObjectType: "repulse",
		Timestamp:  1_000,
	})
	if !ok {
		t.Fatal("expected first repulse impact to generate score")
	}
	if first.BasePoints != 40 || first.Delta != 40 || first.Score != 40 {
		t.Fatalf("expected first repulse hit to add 40 points, got %+v", first)
	}
	if first.ComboBonus != 0 || first.ComboMultiplier != 1 {
		t.Fatalf("expected no combo bonus and x1 multiplier on first hit, got %+v", first)
	}

	second, ok := tracker.ApplyImpact(ImpactPayload{
		ObjectID:   "repulse-2",
		ObjectType: "repulse",
		Timestamp:  2_000,
	})
	if !ok {
		t.Fatal("expected second repulse impact to generate score")
	}
	if second.BasePoints != 60 {
		t.Fatalf("expected combo repulse hit to use 60 base points, got %d", second.BasePoints)
	}
	if second.ComboBonus != 50 || second.ComboMultiplier != 1 {
		t.Fatalf("expected second hit to get +50 combo bonus and x1 multiplier, got %+v", second)
	}
	if second.Delta != 110 || second.Score != 150 {
		t.Fatalf("expected second hit to add 110 and total 150, got %+v", second)
	}
}

func TestScoreTrackerResetsComboAfterWindowAndMultiplierAfterTimeout(t *testing.T) {
	tracker := newScoreTracker(defaultScoreConfig)

	_, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "bumper-1", ObjectType: "bumper", Timestamp: 1_000})
	if !ok {
		t.Fatal("expected first impact to generate score")
	}

	comboReset, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "bumper-2", ObjectType: "bumper", Timestamp: 3_500})
	if !ok {
		t.Fatal("expected second impact to generate score")
	}

	if comboReset.ComboCount != 1 {
		t.Fatalf("expected combo count to reset after 2s window, got %+v", comboReset)
	}
	if comboReset.ComboMultiplier != 1 {
		t.Fatalf("expected multiplier to be x1 without enough streak, got %+v", comboReset)
	}

	_, ok = tracker.ApplyImpact(ImpactPayload{ObjectID: "target-left", ObjectType: "target", Timestamp: 6_000})
	if !ok {
		t.Fatal("expected target impact to generate score")
	}

	multiplierReset, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "target-right", ObjectType: "target", Timestamp: 10_000})
	if !ok {
		t.Fatal("expected later impact to generate score")
	}

	if multiplierReset.ComboMultiplier != 1 || multiplierReset.GlobalMultiplier != 1 {
		t.Fatalf("expected multiplier reset after 3s without hit, got %+v", multiplierReset)
	}
}

func TestScoreTrackerSupportsLoopScalingAndSuperRampCombo(t *testing.T) {
	tracker := newScoreTracker(defaultScoreConfig)

	firstLoop, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "loop-left", ObjectType: "lane", Timestamp: 1_000})
	if !ok {
		t.Fatal("expected first loop to generate score")
	}
	if firstLoop.BasePoints != 120 {
		t.Fatalf("expected first loop to start at 120, got %+v", firstLoop)
	}

	secondLoop, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "loop-left", ObjectType: "lane", Timestamp: 1_500})
	if !ok {
		t.Fatal("expected repeated loop to generate score")
	}
	if secondLoop.BasePoints <= firstLoop.BasePoints {
		t.Fatalf("expected repeated loop to scale upward, got first=%d second=%d", firstLoop.BasePoints, secondLoop.BasePoints)
	}

	tracker.Reset()
	firstRamp, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "ramp-left", ObjectType: "launching_ramp", Timestamp: 1_000})
	if !ok {
		t.Fatal("expected first ramp to generate score")
	}
	secondRamp, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "ramp-right", ObjectType: "launching_ramp", Timestamp: 1_500})
	if !ok {
		t.Fatal("expected second ramp to generate score")
	}
	thirdRamp, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "ramp-top", ObjectType: "launching_ramp", Timestamp: 1_900})
	if !ok {
		t.Fatal("expected third ramp to generate score")
	}

	if firstRamp.SuperCombo || secondRamp.SuperCombo {
		t.Fatal("expected super combo to trigger only on third consecutive ramp hit")
	}
	if !thirdRamp.SuperCombo {
		t.Fatalf("expected third ramp hit to trigger super combo, got %+v", thirdRamp)
	}
	if thirdRamp.ComboBonus < 820 {
		t.Fatalf("expected third ramp hit to include standard combo bonus plus super combo bonus, got %+v", thirdRamp)
	}
}

func TestScoreTrackerIgnoresZeroPointImpacts(t *testing.T) {
	tracker := newScoreTracker(defaultScoreConfig)

	if _, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "palle-left", ObjectType: "palle", Timestamp: 1_000}); ok {
		t.Fatal("expected palle impact to be ignored for scoring")
	}

	if _, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "wall-1", ObjectType: "wall", Timestamp: 2_000}); ok {
		t.Fatal("expected wall impact to be ignored for scoring")
	}

	if _, ok := tracker.ApplyImpact(ImpactPayload{ObjectID: "ground", ObjectType: "ground", Timestamp: 3_000}); ok {
		t.Fatal("expected ground impact to be ignored for scoring")
	}
}

func TestScoreTrackerResetPayloadClearsState(t *testing.T) {
	tracker := newScoreTracker(defaultScoreConfig)
	tracker.now = func() time.Time { return time.UnixMilli(5_000) }

	_, _ = tracker.ApplyImpact(ImpactPayload{ObjectID: "bumper-1", ObjectType: "bumper", Timestamp: 1_000})
	reset := tracker.Reset()

	if reset.Score != 0 || reset.ComboCount != 0 || reset.ComboBonus != 0 || reset.ComboMultiplier != 1 {
		t.Fatalf("expected reset payload to clear score state, got %+v", reset)
	}
}
