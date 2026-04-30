package main

import "encoding/json"

type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

type GameState struct {
	BallX    float64 `json:"ballX"`
	BallY    float64 `json:"ballY"`
	BallVelX float64 `json:"ballVelX"`
	BallVelY float64 `json:"ballVelY"`
	Score    int     `json:"score"`
	GameOver bool    `json:"gameOver"`
}

type ImpactPayload struct {
	ObjectID   string `json:"objectId"`
	ObjectType string `json:"objectType"`
	Timestamp  int64  `json:"timestamp"`
}
