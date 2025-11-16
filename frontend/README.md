# Ameba Earth — Frontend (MVP)

Next.js + p5.js + Anime.js を使ったフロントの雛形です。

使い方（ローカル）:

1. Node.js がインストールされていることを確認
2. このディレクトリで `npm install` を実行
3. `npm run dev` で開発サーバが起動（3000）

デフォルトの WebSocket 接続先は `http://localhost:3001` にしています。
Netlify にデプロイする場合は環境変数 `NEXT_PUBLIC_WS_URL` を設定してください（wss://...）
