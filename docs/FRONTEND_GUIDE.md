# Frontend 実装ガイド（Next.js + p5.js + Anime.js）

目的: Netlify 上でホスティングされる Next.js アプリに p5.js を組み込み、socket.io でリアルタイムに世界を描画する方法をまとめる。

設計上のポイント:
- p5.js はクライアントサイドのみで動作するため、`dynamic(import, { ssr: false })` を使う
- 大量描画は Canvas レイヤ分割で最適化
- Anime.js は UI の細かなアニメや目の瞬きなどに使用

推奨構成:
- components/P5Canvas.js : p5 インスタンスのラッパー
- hooks/useSocket.js : socket.io の接続を共通化
- utils/renderHelpers.js : metaballs の描画関数

描画最適化:
- 描画対象の視界判定（frustum cull）を行う
- LOD: 距離に応じて metaballs / 簡易円を切替
- requestAnimationFrame と p5 の draw を連携

デプロイ:
- Netlify のビルドコマンド: `npm run build`
- パブリッシュディレクトリ: `.next`（Netlify で Next.js を使う場合は設定の調整が必要。代替として `next export` で静的化するか、Netlify の Next.js Build Plugin を利用）
