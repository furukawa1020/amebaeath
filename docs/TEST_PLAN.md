# テスト計画（MVP）

目的: 主要なロジック（AI、API、世界更新）が正しく動作することを自動化テストで担保する。

推奨ツール:
- Backend: Jest + supertest
- Frontend: Jest + React Testing Library（UI スモークテスト）

必須テストケース（短期）:
1. API
  - GET /state が 200 を返す
  - POST /spawn が rate-limit を守る
  - POST /touch 入力検証
2. AI
  - energy が時間経過で減る
  - 捕食シナリオで predator.size が増える
3. world loop
  - tick 実行で organism.position が更新される

実装メモ:
- world の純粋関数版を切り出して unit test を書くと良い
- DB 依存はモック化する
