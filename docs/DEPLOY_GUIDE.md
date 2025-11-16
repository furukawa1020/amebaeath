# デプロイ / 運用ガイド（Railway + Netlify）

このガイドは、バックエンドを Railway に、フロントを Netlify にデプロイする手順を示します。サービスの立ち上げから簡単な運用までカバーします。

環境変数（サマリ）:
- BACKEND
  - PORT (Railway が提供)
  - DATABASE_URL (Postgres)
  - RATE_LIMIT_CONFIG
- FRONT
  - NEXT_PUBLIC_WS_URL (wss://<railway-host>)

Railway (Backend)
1. GitHub リポジトリを Railway に接続
2. デプロイ設定: `backend` ディレクトリを指定、`npm install` と `npm start` をビルドコマンドに設定
3. 環境変数を設定（DATABASE_URL 等）
4. Railway Scheduler にて 1 分毎の世界 persist ジョブを設定
注意（Rust）
- 速度とスループットを優先する場合は、Rust sim を `backend/rust` にデプロイして Node を `USE_RUST=true` で利用する運用が可能です。Railway では 1 サービスとして Rust をデプロイし、Node は API/Socket 層として動作させることができます。Rust は `actix-web` を使って `GET /state` `POST /spawn` `POST /touch` を提供します。

Netlify (Frontend)
1. GitHub リポジトリを Netlify に接続
2. ビルドコマンド: `npm run build`、公開フォルダは `.`（Next.js の場合は Next.js plugin の使用を推奨）
3. 環境変数 `NEXT_PUBLIC_WS_URL` を設定（Railway の wss エンドポイント）

TLS / セキュリティ
- socket.io は wss を使用
- CORS 設定で Netlify ドメインのみ許可

運用モニタリング
- Railway のダッシュボードで CPU/メモリを監視
- ログは重要イベント（predation, spawn, evolve）を出力

ロールバック
- Railway: Git の該当コミットに戻して redeploy
- Netlify: 過去のデプロイを選択して rollback
