# Ameba Earth 〜東京の気温に翻弄される小さな命達〜

Javaで作られた、ぷにぷに動く人工生命シミュレーション。
最大の特徴は「現実世界とのリンク」。リアルタイムの東京の気温を取得し、アメーバたちの生態系や食料事情が変化します。
物理演算で描かれる、美しくも過酷な「小さな地球」を観察してみませんか？

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

1.  Navigate to the project directory.
2.  Double-click **`compile_and_run.bat`**.
    -   Or run it from the command line: `.\compile_and_run.bat`

This script will automatically compile the Java source files and launch the simulation window.

## 📦 Download & Run (No Compilation Needed)

If you don't want to compile the code yourself, you can simply download the latest executable:

1.  Go to the [Releases](../../releases) page of this repository.
2.  Download **`AmebaEarth.jar`**.
3.  Double-click the file to run (requires Java installed).

## Controls

-   The simulation runs automatically.
-   Watch the amoebas evolve, swarm, and compete!

## Project Structure

-   `src/Main.java`: Entry point, game loop, and rendering setup.
-   `src/Simulation.java`: Core logic for physics, entity management, and spatial grid.
-   `src/Renderer.java`: Handles the metaball rendering and character drawing.
-   `src/IoT.java`: Fetches real-time weather data.
