# Ameba Earth — Frontend (MVP)

Next.js + p5.js + Anime.js を使ったフロントの雛形です。

使い方（ローカル）:

1. Node.js がインストールされていることを確認
2. このディレクトリで `npm install` を実行
3. `npm run dev` で開発サーバが起動（3000）

デフォルトの WebSocket 接続先は `http://localhost:3001` にしています。
あなたのバックエンドが異なるホスト（例: Railway/WSS アドレス）にある場合は、環境変数 `NEXT_PUBLIC_BACKEND_URL` を `http://localhost:3001`（デフォルト）に設定し、ソケット用に `NEXT_PUBLIC_WS_URL` を設定できます。
Netlify にデプロイする場合は環境変数 `NEXT_PUBLIC_WS_URL` を設定してください（wss://...）
