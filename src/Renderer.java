import java.awt.*;
import java.awt.image.BufferedImage;
import java.util.List;

public class Renderer {
    BufferedImage buffer;
    int width, height;
    int[] pixels;

    public Renderer(int width, int height) {
        this.width = width;
        this.height = height;
        buffer = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        pixels = new int[width * height];
    }

    public void draw(Graphics g, Simulation sim) {
        // Metaball rendering
        // For performance, we only scan bounding boxes of amoebas, or just do a full pass if optimized.
        // Java software rendering is slow for full screen per-pixel metaballs.
        // We will use a "blob" sprite approach or a lower resolution field for performance, 
        // OR we can draw radial gradients for each node and threshold the alpha channel.
        
        // Approach: Draw radial gradients for all nodes onto an offscreen image, then threshold.
        Graphics2D g2d = buffer.createGraphics();
        g2d.setComposite(AlphaComposite.Clear);
        g2d.fillRect(0, 0, width, height);
        g2d.setComposite(AlphaComposite.SrcOver);

        // Draw "influence" blobs
        for (Amoeba a : sim.amoebas) {
            for (Node n : a.nodes) {
                float r = n.radius * 2.5f; // Influence radius
                RadialGradientPaint rgp = new RadialGradientPaint(
                    n.pos.x, n.pos.y, r,
                    new float[]{0.0f, 1.0f},
                    new Color[]{new Color(0, 255, 255, 255), new Color(0, 255, 255, 0)}
                );
                g2d.setPaint(rgp);
                g2d.fillOval((int)(n.pos.x - r), (int)(n.pos.y - r), (int)(r * 2), (int)(r * 2));
            }
        }
        g2d.dispose();

        // Thresholding (Manual pixel manipulation for speed)
        buffer.getRGB(0, 0, width, height, pixels, 0, width);
        for (int i = 0; i < pixels.length; i++) {
            int alpha = (pixels[i] >> 24) & 0xff;
            if (alpha > 150) { // Threshold
                pixels[i] = 0xFF00FFFF; // Cyan color
            } else if (alpha > 130) {
                pixels[i] = 0xFF00AAAA; // Darker edge
            } else {
                pixels[i] = 0x00000000; // Transparent
            }
        }
        buffer.setRGB(0, 0, width, height, pixels, 0, width);

        // Draw to screen
        g.setColor(Color.BLACK);
        g.fillRect(0, 0, width, height);
        g.drawImage(buffer, 0, 0, null);

        // Draw Food
        g.setColor(Color.GREEN);
        for (Food f : sim.foods) {
            g.fillOval((int)f.pos.x - 3, (int)f.pos.y - 3, 6, 6);
        }

        // UI
        g.setColor(Color.WHITE);
        g.drawString("Ameba Earth (Java)", 10, 20);
        g.drawString("Entities: " + sim.amoebas.size(), 10, 40);
        g.drawString("Food: " + sim.foods.size(), 10, 60);
        g.setColor(Color.YELLOW);
        g.drawString(String.format("Temp: %.1f C", sim.temperature), 10, 80);
    }
}
