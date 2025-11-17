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
            List<String> dna = List.of("#88c1ff");
            List<List<Double>> metaballs = List.of(List.of(0.0,0.0, 16.0 + rnd.nextDouble()*8.0), List.of(8.0,5.0,10.0 + rnd.nextDouble()*6.0));
            Map<String,Object> traits = new HashMap<>();
            traits.put("cohesion", 0.3 + rnd.nextDouble()*0.5);
            traits.put("escape", 0.15 + rnd.nextDouble()*0.6);
            organisms.add(new Organism("j" + i,
                    rnd.nextDouble() * width,
                    rnd.nextDouble() * height,
                    (rnd.nextDouble()-0.5)*0.5,
                    (rnd.nextDouble()-0.5)*0.5,
                    0.8 + rnd.nextDouble() * 1.2,
                    0.5 + rnd.nextDouble() * 1.5,
                    dna,
                    metaballs,
                    traits,
                    "normal",
                    System.currentTimeMillis(),
                    System.currentTimeMillis() + (24L*3600L*1000L)));
        }
    }

    public synchronized Organism spawn(Map<String,Object> seedTraits) {
        int i = organisms.size() + 1;
        List<String> dna = List.of("#88c1ff");
        List<List<Double>> metaballs = List.of(List.of(0.0,0.0, 16.0 + rnd.nextDouble()*8.0));
        Map<String,Object> traits = seedTraits != null ? seedTraits : new HashMap<>();
        Organism o = new Organism("j_spawn_" + System.currentTimeMillis(),
                rnd.nextDouble() * width,
                rnd.nextDouble() * height,
                (rnd.nextDouble()-0.5)*0.5,
                (rnd.nextDouble()-0.5)*0.5,
                0.8 + rnd.nextDouble() * 1.2,
                0.6 + rnd.nextDouble() * 1.4,
                dna,
                metaballs,
                traits,
                "normal",
                System.currentTimeMillis(),
                System.currentTimeMillis() + (24L*3600L*1000L)
        );
        organisms.add(o);
        return o;
    }

    public synchronized Map<String,Object> touch(double x, double y, double amplitude, double sigma) {
        Map<String,Object> touch = new HashMap<>();
        touch.put("id", "touch_" + System.currentTimeMillis());
        touch.put("x", x);
        touch.put("y", y);
        touch.put("amplitude", amplitude);
        touch.put("sigma", sigma);
        touch.put("createdAt", System.currentTimeMillis());
        return touch;
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
