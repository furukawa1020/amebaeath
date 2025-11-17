# Java Sidecar (ameba-sidecar)

This Java service provides a lightweight simulation sidecar for Ameba Earth. It exposes:

- GET /state — current world snapshot (tick, organisms)
- POST /spawn — create a new organism
- POST /touch — apply a touch event
- GET /health — health check

Requirements
- Java 17+ (recommended)
- Gradle (or use Gradle wrapper if present)

Build
- With Gradle wrapper (recommended if provided):
  - `./gradlew shadowJar` (Linux/macOS)
  - `gradlew.bat shadowJar` (Windows)
- With system gradle:
  - `gradle shadowJar`

The fat JAR is produced in `build/libs/ameba-sidecar.jar`.

Run
- Development (with gradle run or gradlew run):
  - `./gradlew run`
- Run built jar:
  - `java -jar build/libs/ameba-sidecar.jar`

Notes
- The repository includes helper PowerShell scripts to run/build the sidecar on Windows. If you want, I can add the Gradle wrapper files to the repo to make builds reproducible across environments.
