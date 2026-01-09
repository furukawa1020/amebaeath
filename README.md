# Ameba Earth 〜東京の気温に翻弄される小さな命達〜

Javaで作られた、ぷにぷに動く人工生命シミュレーション。
最大の特徴は「現実世界とのリンク」。リアルタイムの東京の気温を取得し、アメーバたちの生態系や食料事情が変化します。
物理演算で描かれる、美しくも過酷な「小さな地球」を観察してみませんか？

**🌐 ブラウザで今すぐプレイ！ / Play Now in Your Browser!**

このアプリは**Webブラウザで直接動作します**！インストール不要で、すぐにアメーバたちの世界を体験できます。

👉 **[ここをクリックしてプレイ](https://amebaeath.netlify.app)** (デプロイ後に利用可能)

## Features

-   **Soft-Body Physics**: Amoebas are modeled as spring-mass systems with internal pressure, giving them a squishy, organic feel.
-   **Metaball Rendering**: Uses radial gradients and thresholding to render smooth, merging blobs.
-   **Evolutionary Genetics**: Each amoeba has genes for speed, sense radius, metabolism, and color. Offspring inherit and mutate these traits.
-   **Complex Behaviors**:
    -   **Foraging**: Seeking food to grow and gain energy.
    -   **Predation**: Larger amoebas hunt and consume smaller ones ("Weak Eat Strong").
    -   **Flocking**: Swarming behavior with cohesion and alignment.
    -   **Reproduction**: Asexual division when energy and size thresholds are met.
-   **IoT Integration**: Real-time temperature data (via Open-Meteo API) influences the environment (e.g., food spawning rates).
-   **Character Polish**: Amoebas feature expressive eyes that track their movement and a visible nucleus.
-   **High Performance**: Optimized with a **Spatial Grid** and **Physics Sub-stepping** to support fast-paced simulation (5x time scale) with many entities.

## Requirements

-   **Java Development Kit (JDK)**: Version 11 or higher is recommended.
-   **Windows OS**: The provided build script is for Windows (`.bat`).

## How to Run

### 方法1: ブラウザ版（推奨） / Web Version (Recommended)

**インストール不要！今すぐブラウザでプレイ:**

1. デプロイされたサイトにアクセス（マージ後に利用可能）
2. または、ローカルでHTTPサーバーを起動:
   ```bash
   python3 -m http.server 8080
   ```
3. ブラウザで `http://localhost:8080` を開く

### 方法2: デスクトップ版（Java） / Desktop Version (Java)

#### JARファイルを実行:

1.  [Releases](../../releases)ページから **`AmebaEarth.jar`** をダウンロード
2.  ダブルクリックで実行（Javaがインストールされている必要があります）

#### ソースコードからコンパイル (Windows):

## Controls

**ブラウザ版 / Web Version:**
- シミュレーションは自動的に実行されます / The simulation runs automatically
- リセットボタンでシミュレーションを再開 / Reset button to restart
- 一時停止ボタンで停止/再開 / Pause button to pause/resume
- 食料追加ボタンで食料を追加 / Add Food button to spawn more food

**デスクトップ版 / Desktop Version:**
-   The simulation runs automatically.
-   Watch the amoebas evolve, swarm, and compete!

## Project Structure

-   **`index.html`**: Web版のメインページ / Web version main page
-   **`simulation.js`**: JavaからJavaScriptに移植されたシミュレーションエンジン / Simulation engine ported from Java to JavaScript
-   `src/Main.java`: Entry point, game loop, and rendering setup (デスクトップ版 / Desktop version)
-   `src/Simulation.java`: Core logic for physics, entity management, and spatial grid
-   `src/Renderer.java`: Handles metaball rendering and character drawing
-   `src/IoT.java`: Fetches real-time weather data
-   `AmebaEarth.jar`: Compiled desktop application
-   `netlify.toml`: Netlify deployment configuration

## 🌐 Web Deployment

このプロジェクトは**ブラウザで直接実行できる**ようになりました！

JavaアプリケーションをJavaScript/HTML5 Canvasに移植し、Netlifyなどの静的ホスティングサービスで動作します。

**主な機能:**
- ブラウザで即座にプレイ可能（インストール不要）
- リアルタイム物理演算
- 東京の気温データ取得（Open-Meteo API）
- 進化する遺伝子システム
- 対話的なコントロール（一時停止、リセット、食料追加）

デプロイ後は、どなたでもブラウザからアクセスして遊べます！
