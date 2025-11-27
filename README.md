# Ameba Earth

Ameba Earth is a Java-based artificial life simulation that models the evolution and interaction of soft-body amoeba-like creatures. It combines physics-based movement, genetic evolution, and real-time environmental data to create a dynamic and "cute" ecosystem.

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

## Controls

-   The simulation runs automatically.
-   Watch the amoebas evolve, swarm, and compete!

## Project Structure

-   `src/Main.java`: Entry point, game loop, and rendering setup.
-   `src/Simulation.java`: Core logic for physics, entity management, and spatial grid.
-   `src/Renderer.java`: Handles the metaball rendering and character drawing.
-   `src/IoT.java`: Fetches real-time weather data.
