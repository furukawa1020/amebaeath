# Ameba Earth — JavaFX client (desktop)

This is a lightweight JavaFX client that renders the Ameba Earth simulation in a more "game-like" way.
It polls the backend `/state` endpoint periodically and draws organisms as circles with small energy bars.

Requirements
- Java 17+ (with JavaFX support). On most systems you can use a JDK 17 and the Gradle build will pull JavaFX modules.
- Gradle (optional). You can use the Gradle wrapper or install Gradle.

Quick start

From the project root:

```powershell
cd clients/javafx-client
./gradlew run    # on Windows: gradlew.bat run
```

If your backend is not on localhost:3001, set the environment variable `AMEBA_BACKEND_URL` before running. Example:

```powershell
# Windows PowerShell
$env:AMEBA_BACKEND_URL = 'https://your-backend.example'
./gradlew run
```

What it does
- Polls `${AMEBA_BACKEND_URL:-http://localhost:3001}/state` once per second
- Parses JSON: { tick, organisms: [{ id, position:{x,y}, size, energy, state, dna_layers }] }
- Renders each organism as a filled circle using its color from `dna_layers[0]` if present
- Draws a small energy bar above each organism

Notes & next steps
- This uses simple HTTP polling for portability. If you want realtime push you can add a WebSocket or socket.io client in Java.
- Could be extended to use LibGDX or LWJGL for higher-performance rendering and input/gamepad support.
