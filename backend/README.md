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
- namespace: default
- events: init (snapshot), tick (updates), spawn, touch

注意点（MVP）:
- 現在は in-memory 管理。運用では PostgreSQL/Redis を導入すること。
- rate-limit は単純な IP カウント。プロダクションでは堅牢な対策を追加してください。
