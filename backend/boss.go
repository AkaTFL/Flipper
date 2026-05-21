package main

import "sync"

const (
	defaultBossMaxHP        = 1500
	defaultBossDamageFactor = 0.05
)

type BossStateUpdatePayload struct {
	Active      bool    `json:"active"`
	HP          int     `json:"hp"`
	MaxHP       int     `json:"maxHp"`
	DamageTaken int     `json:"damageTaken"`
	Coefficient float64 `json:"coefficient"`
	Defeated    bool    `json:"defeated"`
	Mode        string  `json:"mode"`
}

type BossConfig struct {
	MaxHP                   int
	DamageCoefficient       float64
	AutoActivateOnGameStart bool
}

type BossTracker struct {
	mutex  sync.Mutex
	config BossConfig
	active bool
	hp     int
}

var defaultBossConfig = BossConfig{
	MaxHP:                   defaultBossMaxHP,
	DamageCoefficient:       defaultBossDamageFactor,
	AutoActivateOnGameStart: false,
}

func newBossTracker(config BossConfig) *BossTracker {
	if config.MaxHP <= 0 {
		config.MaxHP = defaultBossMaxHP
	}
	if config.DamageCoefficient <= 0 {
		config.DamageCoefficient = defaultBossDamageFactor
	}

	return &BossTracker{
		config: config,
		hp:     config.MaxHP,
	}
}

func (b *BossTracker) ResetForGameStart() BossStateUpdatePayload {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	b.hp = b.config.MaxHP
	b.active = b.config.AutoActivateOnGameStart

	return b.currentStateLocked(0, "auto_test")
}

func (b *BossTracker) StartBossFight() BossStateUpdatePayload {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if b.hp <= 0 || b.hp > b.config.MaxHP {
		b.hp = b.config.MaxHP
	}
	b.active = true

	return b.currentStateLocked(0, "boss_fight_started")
}

func (b *BossTracker) ToggleBossFight() BossStateUpdatePayload {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if b.hp <= 0 || b.hp > b.config.MaxHP {
		b.hp = b.config.MaxHP
	}

	b.active = !b.active

	mode := "boss_fight_deactivated"
	if b.active {
		mode = "boss_fight_activated"
	}

	return b.currentStateLocked(0, mode)
}

func (b *BossTracker) ApplyScoreDamage(scoreDelta int) (BossStateUpdatePayload, bool) {
	if scoreDelta <= 0 {
		return BossStateUpdatePayload{}, false
	}

	b.mutex.Lock()
	defer b.mutex.Unlock()

	if !b.active || b.hp <= 0 {
		return BossStateUpdatePayload{}, false
	}

	damage := int(float64(scoreDelta) * b.config.DamageCoefficient)
	if damage <= 0 {
		damage = 1
	}

	b.hp -= damage
	if b.hp <= 0 {
		b.hp = 0
		b.active = false
	}

	return b.currentStateLocked(damage, "score_damage"), true
}

func (b *BossTracker) IsActive() bool {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	return b.active
}

func (b *BossTracker) currentStateLocked(damageTaken int, mode string) BossStateUpdatePayload {
	return BossStateUpdatePayload{
		Active:      b.active,
		HP:          b.hp,
		MaxHP:       b.config.MaxHP,
		DamageTaken: damageTaken,
		Coefficient: b.config.DamageCoefficient,
		Defeated:    b.hp == 0,
		Mode:        mode,
	}
}
