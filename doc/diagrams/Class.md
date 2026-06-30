```mermaid
classDiagram
  namespace ESP32 {
    class Button {
      id
      state
    }
    class Sensor {
      id
      value
    }
  }

  namespace MQTT {
    class MQTTClient {
      publish(topic, payload)
      subscribe(topic)
    }
  }

  namespace GO {
    class Game {
      id
      state
      score
      players[]
    }
    class Player {
      id
      score
      balls_left
    }
    class GameManager {
      handleMQTTEvent()
      updateState()
      broadcastWebSocket()
    }
  }

  namespace IA_Python {
    class AIClient {
      analyzeGame()
      move()
    }
  }

  namespace WebSocket {
    class WebSocketClient {
      onMessage()
    }
  }

  namespace ThreeJS {
    class PlayfieldScene {
      ball
      flippers
      obstacles
      updatePhysics()
    }
    class BackglassUI {
      scoreDisplay
      playerDisplay
    }
    class DMDDisplay {
      showMessage()
      playAnimation()
    }
  }
```
