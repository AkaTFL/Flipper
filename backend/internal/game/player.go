package game

import "sync"

const (
	defaultPlayerMaxHP      = 100
	defaultPlayerMaxBalls   = 3
	defaultBossAttackDamage = 20
	defaultPlayerDamageTest = 20
)

type PlayerStateUpdatePayload struct {
	HP              int    `json:"hp"`
	MaxHP           int    `json:"maxHp"`
	Balls           int    `json:"balls"`
	MaxBalls        int    `json:"maxBalls"`
	LastDamageTaken int    `json:"lastDamageTaken"`
	LastBallLost    bool   `json:"lastBallLost"`
	GameOver        bool   `json:"gameOver"`
	Mode            string `json:"mode"`
}

type PlayerStateSnapshot struct {
	HP    int `json:"hp"`
	Balls int `json:"balls"`
}

type PlayerConfig struct {
	MaxHP    int
	MaxBalls int
}

type PlayerTracker struct {
	mutex  sync.Mutex
	config PlayerConfig
	hp     int
	balls  int
}

var defaultPlayerConfig = PlayerConfig{
	MaxHP:    defaultPlayerMaxHP,
	MaxBalls: defaultPlayerMaxBalls,
}

func newPlayerTracker(config PlayerConfig) *PlayerTracker {
	if config.MaxHP <= 0 {
		config.MaxHP = defaultPlayerMaxHP
	}
	if config.MaxBalls <= 0 {
		config.MaxBalls = defaultPlayerMaxBalls
	}

	return &PlayerTracker{
		config: config,
		hp:     config.MaxHP,
		balls:  config.MaxBalls,
	}
}

func (p *PlayerTracker) ResetForGameStart() PlayerStateUpdatePayload {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	p.hp = p.config.MaxHP
	p.balls = p.config.MaxBalls

	return p.currentStateLocked(0, false, "game_started")
}

func (p *PlayerTracker) Snapshot() PlayerStateSnapshot {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	return PlayerStateSnapshot{
		HP:    p.hp,
		Balls: p.balls,
	}
}

func (p *PlayerTracker) Restore(snapshot PlayerStateSnapshot) PlayerStateUpdatePayload {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if snapshot.Balls < 0 {
		snapshot.Balls = 0
	}
	if snapshot.Balls > p.config.MaxBalls {
		snapshot.Balls = p.config.MaxBalls
	}
	if snapshot.HP < 0 {
		snapshot.HP = 0
	}
	if snapshot.HP > p.config.MaxHP {
		snapshot.HP = p.config.MaxHP
	}

	p.hp = snapshot.HP
	p.balls = snapshot.Balls

	if p.balls <= 0 {
		p.hp = 0
	}

	return p.currentStateLocked(0, false, "game_loaded")
}

func (p *PlayerTracker) ApplyDamage(damage int) PlayerStateUpdatePayload {
	if damage <= 0 {
		damage = defaultPlayerDamageTest
	}

	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.balls <= 0 {
		p.hp = 0
		return p.currentStateLocked(0, false, "game_over")
	}

	p.hp -= damage
	if p.hp > 0 {
		return p.currentStateLocked(damage, false, "player_damage")
	}

	p.loseBallLocked()
	return p.currentStateLocked(damage, true, "ball_lost")
}

func (p *PlayerTracker) LoseBall() PlayerStateUpdatePayload {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.balls <= 0 {
		p.hp = 0
		return p.currentStateLocked(0, false, "game_over")
	}

	p.loseBallLocked()
	return p.currentStateLocked(0, true, "ball_lost")
}

func (p *PlayerTracker) loseBallLocked() {
	p.balls--
	if p.balls <= 0 {
		p.balls = 0
		p.hp = 0
		return
	}

	p.hp = p.config.MaxHP
}

func (p *PlayerTracker) currentStateLocked(lastDamageTaken int, lastBallLost bool, mode string) PlayerStateUpdatePayload {
	return PlayerStateUpdatePayload{
		HP:              p.hp,
		MaxHP:           p.config.MaxHP,
		Balls:           p.balls,
		MaxBalls:        p.config.MaxBalls,
		LastDamageTaken: lastDamageTaken,
		LastBallLost:    lastBallLost,
		GameOver:        p.balls <= 0,
		Mode:            mode,
	}
}
