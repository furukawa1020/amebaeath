# Backend 実装ガイド（Express + socket.io）

目的: サーバ側で世界の authoritative な更新を行い、クライアントに差分を配信する。ここでは実装方針、重要なコンポーネント、運用上の注意点を列挙する。

1) アーキテクチャ
- Express : REST 用（/spawn, /state, /touch）
- socket.io : リアルタイム差分配信（init/tick/spawn/predation/evolve/touch）
- シミュレーションループ : 内部で短時間ステップ（例: 20 steps/sec 相当）→ 1秒ごとにクライアントへ tick を配信

2) 重要コンポーネント
- world.js : 世界シミュレーションロジック（AI 適用、物理、マップ更新）
- persistence layer : PostgreSQL（jsonb）または Redis（短期状態）
- rate-limit middleware : express-rate-limit
- spatial index : quadtree か grid-hash

3) Cron/スケジューラ
- Railway Scheduler で 1 分ごとの persist / garbage-collect を実行

4) セキュリティ
- CORS を制限
- IP ベースの rate-limit（spawn, touch）
- 入力検証（座標範囲、amplitude の上限）

5) ロギング/監視
- Sentry などでエラートラッキング
- 重要イベントを structured logs で出力

6) デバッグツール
- /state エンドポイントは簡易 snapshot を返す（負荷対策でページング/範囲指定を追加可能）

7) 将来の拡張
- マイクロサービス化（simulation worker と API 層分離）
- Redis を使った pub/sub で水平スケール
