# Ameba Earth — Backend Java Sidecar Integration

This document explains how to run the Java sidecar simulator and integrate it with the Node backend.

Overview
- The project contains three lightweight simulators: Java sidecar (`backend/java-sidecar`), Go sim (`backend/go-sim`) and Rust sim (`backend/rust-sim`).
- The Node backend (`backend/server.js`) can proxy to one of these authoritative sims. Use environment variables to choose which one is active.

Environment variables
- `USE_JAVA=true` — Node backend will proxy `/state`, `/spawn`, `/touch` to `JAVA_URL`.
- `JAVA_URL` — URL of the Java sidecar (default: `http://localhost:4001`).
- `USE_RUST=true` — proxy to Rust sidecar (default url set in server.js). If both `USE_JAVA` and `USE_RUST` are set, Java takes precedence.

Running the Java sidecar
1. Build (recommended):
   - If you have the Gradle wrapper in the project root of `backend/java-sidecar` (`gradlew` / `gradlew.bat`), run:
     - Windows: `cd backend\java-sidecar && .\gradlew.bat shadowJar`
     - Linux/macOS: `cd backend/java-sidecar && ./gradlew shadowJar`
   - If you don't have the wrapper but have Gradle installed: `gradle shadowJar`.
   - The fat JAR will be created at `backend/java-sidecar/build/libs/ameba-sidecar.jar`.

2. Run (dev):
   - With Gradle: `cd backend/java-sidecar && ./gradlew run` or `.\gradlew.bat run` on Windows.
   - With JAR: `java -jar build/libs/ameba-sidecar.jar`

3. Configure Node backend to use Java: set `USE_JAVA=true` and optionally `JAVA_URL=http://localhost:4001` before starting the Node backend.

Quick dev helper (Windows PowerShell)
- See `backend/scripts/start-dev.ps1` — it attempts to start the Java sidecar (using gradlew/gradle or JAR) and then starts the Node backend with `USE_JAVA=true` set in the environment.

Notes
- For reproducible builds, we recommend adding the Gradle wrapper to `backend/java-sidecar`. If you want, I can add the wrapper files (`gradlew`, `gradlew.bat`, `gradle/wrapper/*`) to the repo.
- The Java sidecar exposes `/state`, `/spawn`, `/touch`, and `/health` and returns a JSON payload compatible with the frontend and the Node backend.
# Ameba Earth — Backend (MVP)

これは `Ameba Earth` のバックエンド雛形です。

目的: Express + socket.io を使ったシンプルな世界シミュレーション（MVP）。

使い方（ローカル）:

1. Node.js がインストールされていることを確認
2. このディレクトリで `npm install` を実行
3. `npm start` でサーバが立ち上がる（デフォルト: 3001 ポート）

エンドポイント:
- GET /state → 世界の軽量スナップショット
- POST /spawn → 新しい個体を生成（IP ごとに1日1回の簡易制限）
- POST /touch → タッチイベント（x,y,amplitude,sigma）

WebSocket (socket.io):

Rust microservice:
Optional high-performance simulation service is available in `backend/rust`. To enable the Node server to proxy to Rust, set `USE_RUST=true` and `RUST_URL` env variables.

Start Rust service (if you have Rust toolchain):
1. cd backend/rust
2. cargo run
3. In backend process set USE_RUST=true (e.g., `USE_RUST=true npm start` in unix or set env var in Railway)


- rate-limit は単純な IP カウント。プロダクションでは堅牢な対策を追加してください。

DB マイグレーション
- PostgreSQL を使う場合は `backend/db/schema.sql` を実行してテーブルを作成してください。Railway の Postgres を利用する場合は SQL を直接 Console に貼って実行できます。マイグレーションは Flyway や Liquibase を利用して自動化することを推奨します。

バックアップ / 永続化
- `DATABASE_URL` を指定しておくと 1 分ごとに `world_state` テーブルへスナップショットを格納します（MVP）。
