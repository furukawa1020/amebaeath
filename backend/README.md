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
