package main

import "testing"

func TestPlayerResetForGameStart(t *testing.T) {
	player := newPlayerTracker(defaultPlayerConfig)

	state := player.ResetForGameStart()

	if state.HP != defaultPlayerMaxHP || state.Balls != defaultPlayerMaxBalls || state.GameOver {
		t.Fatalf("expected reset player state, got %+v", state)
	}
}

func TestPlayerApplyDamageWithoutLosingBall(t *testing.T) {
	player := newPlayerTracker(defaultPlayerConfig)

	state := player.ApplyDamage(20)

	if state.HP != 80 || state.Balls != 3 || state.LastBallLost || state.GameOver {
		t.Fatalf("expected player damage without ball loss, got %+v", state)
	}
}

func TestPlayerApplyDamageCanLoseBall(t *testing.T) {
	player := newPlayerTracker(defaultPlayerConfig)

	state := player.ApplyDamage(100)

	if state.HP != defaultPlayerMaxHP || state.Balls != 2 || !state.LastBallLost || state.GameOver {
		t.Fatalf("expected one ball lost and hp reset, got %+v", state)
	}
}

func TestPlayerCanReachGameOver(t *testing.T) {
	player := newPlayerTracker(defaultPlayerConfig)

	player.LoseBall()
	player.LoseBall()
	state := player.LoseBall()

	if state.HP != 0 || state.Balls != 0 || !state.GameOver {
		t.Fatalf("expected game over after last ball, got %+v", state)
	}
}
