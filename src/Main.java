import javax.swing.*;
import java.awt.*;

public class Main extends JPanel {
    Simulation sim;
    Renderer renderer;
    IoT iot;

    public Main() {
        int w = 800;
        int h = 600;
        sim = new Simulation(w, h);
        renderer = new Renderer(w, h);
        iot = new IoT();

        setPreferredSize(new Dimension(w, h));
        setBackground(Color.BLACK);
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        synchronized (sim) {
            renderer.draw(g, sim);
        }
    }

    public void run() {
        long lastTime = System.nanoTime();
        while (true) {
            long now = System.nanoTime();
            float dt = (now - lastTime) / 1_000_000_000.0f;
            lastTime = now;

            // Cap dt to avoid explosion
            if (dt > 0.05f)
                dt = 0.05f;

            sim.temperature = iot.getTemperature();
            // Sub-stepping for stability
            int steps = 5; // Run 5x faster
            float subDt = dt; // Keep dt small per step
            for (int i = 0; i < steps; i++) {
                synchronized (sim) {
                    sim.update(subDt);
                }
            }
            repaint();

            try {
                Thread.sleep(16); // ~60 FPS
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    public static void main(String[] args) {
        JFrame frame = new JFrame("Ameba Earth");
        Main game = new Main();
        frame.add(game);
        frame.pack();
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);

        game.run();
    }
}
