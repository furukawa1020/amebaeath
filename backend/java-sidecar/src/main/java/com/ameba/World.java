package com.ameba;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class World {
    private final List<Organism> organisms = Collections.synchronizedList(new ArrayList<>());
    private final Random rnd = new Random();
    private long tick = 0;
    private final double width;
    private final double height;

    public World(double width, double height, int initial) {
        this.width = width;
        this.height = height;
        for (int i = 0; i < initial; i++) {
            organisms.add(new Organism("j" + i,
                    rnd.nextDouble() * width,
                    rnd.nextDouble() * height,
                    0.8 + rnd.nextDouble() * 1.2,
                    0.5 + rnd.nextDouble() * 1.5,
                    List.of("#88c1ff"),
                    "normal"));
        }
    }

    public synchronized void step() {
        tick++;
        for (Organism o : organisms) {
            // simple random walk and energy drain
            o.x += (rnd.nextDouble() - 0.5) * 10.0;
            o.y += (rnd.nextDouble() - 0.5) * 10.0;
            if (o.x < 0) o.x = 0; if (o.y < 0) o.y = 0;
            if (o.x > width) o.x = width; if (o.y > height) o.y = height;
            o.energy -= 0.01;
            if (o.energy <= 0) {
                o.energy = 0;
                o.state = "dead";
            }
        }
    }

    public synchronized List<Organism> snapshotOrganisms() {
        return new ArrayList<>(organisms);
    }

    public synchronized long getTick() { return tick; }
}
