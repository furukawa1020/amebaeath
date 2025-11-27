import java.awt.*;
import java.awt.image.BufferedImage;

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
        // For performance, we only scan bounding boxes of amoebas, or just do a full
        // pass if optimized.
        // Java software rendering is slow for full screen per-pixel metaballs.
        // We will use a "blob" sprite approach or a lower resolution field for
        // performance,
        // OR we can draw radial gradients for each node and threshold the alpha
        // channel.

        // Approach: Draw radial gradients for all nodes onto an offscreen image, then
        // threshold.
        Graphics2D g2d = buffer.createGraphics();
        g2d.setComposite(AlphaComposite.Clear);
        g2d.fillRect(0, 0, width, height);
        g2d.setComposite(AlphaComposite.SrcOver);

        // Draw "influence" blobs
        for (Amoeba a : sim.amoebas) {
            Color c = a.genes.color;
            Color centerColor = new Color(c.getRed(), c.getGreen(), c.getBlue(), 255);
            Color edgeColor = new Color(c.getRed(), c.getGreen(), c.getBlue(), 0);

            for (Node n : a.nodes) {
                float r = n.radius * 2.5f; // Influence radius
                RadialGradientPaint rgp = new RadialGradientPaint(
                        n.pos.x, n.pos.y, r,
                        new float[] { 0.0f, 1.0f },
                        new Color[] { centerColor, edgeColor });
                g2d.setPaint(rgp);
                g2d.fillOval((int) (n.pos.x - r), (int) (n.pos.y - r), (int) (r * 2), (int) (r * 2));
            }
        }
        g2d.dispose();

        // Thresholding (Manual pixel manipulation for speed)
        buffer.getRGB(0, 0, width, height, pixels, 0, width);
        for (int i = 0; i < pixels.length; i++) {
            int alpha = (pixels[i] >> 24) & 0xff;
            if (alpha > 150) { // Threshold
                // Keep original color but ensure full alpha
                pixels[i] = (0xFF << 24) | (pixels[i] & 0x00FFFFFF);
            } else if (alpha > 130) {
                // Darker edge
                int col = pixels[i] & 0x00FFFFFF;
                int r = (col >> 16) & 0xff;
                int green = (col >> 8) & 0xff;
                int b = col & 0xff;
                pixels[i] = (0xFF << 24) | ((r / 2) << 16) | ((green / 2) << 8) | (b / 2);
            } else {
                pixels[i] = 0x00000000; // Transparent
            }
        }
        buffer.setRGB(0, 0, width, height, pixels, 0, width);

        // Draw to screen
        g.setColor(Color.BLACK);
        g.fillRect(0, 0, width, height);
        g.drawImage(buffer, 0, 0, null);

        // Draw Character Details (Eyes & Nucleus)
        for (Amoeba a : sim.amoebas) {
            // Nucleus
            g.setColor(new Color(0, 0, 0, 50));
            g.fillOval((int) a.center.x - 6, (int) a.center.y - 6, 12, 12);

            // Calculate direction for eyes
            Vector2 vel = new Vector2(0, 0);
            for (Node n : a.nodes)
                vel = vel.add(n.vel);

            // Default look direction if not moving much
            float dx = 1, dy = 0;
            if (vel.mag() > 0.1f) {
                Vector2 dir = vel.normalize();
                dx = dir.x;
                dy = dir.y;
            } else {
                dx = (float) Math.cos(a.wanderAngle);
                dy = (float) Math.sin(a.wanderAngle);
            }

            // Eye positions
            float eyeOffset = a.targetRadius * 0.3f;
            float eyeSpacing = 8.0f;
            float ex = a.center.x + dx * eyeOffset;
            float ey = a.center.y + dy * eyeOffset;

            // Perpendicular vector for spacing
            float px = -dy * eyeSpacing;
            float py = dx * eyeSpacing;

            // Draw Eyes (White)
            g.setColor(Color.WHITE);
            g.fillOval((int) (ex + px) - 5, (int) (ey + py) - 5, 10, 10);
            g.fillOval((int) (ex - px) - 5, (int) (ey - py) - 5, 10, 10);

            // Draw Pupils (Black) - looking slightly forward
            g.setColor(Color.BLACK);
            float pupilOffset = 2.0f;
            g.fillOval((int) (ex + px + dx * pupilOffset) - 2, (int) (ey + py + dy * pupilOffset) - 2, 4, 4);
            g.fillOval((int) (ex - px + dx * pupilOffset) - 2, (int) (ey - py + dy * pupilOffset) - 2, 4, 4);
        }

        // Draw Food
        g.setColor(Color.GREEN);
        for (Food f : sim.foods) {
            g.fillOval((int) f.pos.x - 3, (int) f.pos.y - 3, 6, 6);
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
