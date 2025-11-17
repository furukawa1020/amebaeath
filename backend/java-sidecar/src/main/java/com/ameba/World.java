package com.ameba;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.Map;
import java.util.HashMap;

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
        // build spatial index
        SpatialHash sh = new SpatialHash(Math.max(24.0, Math.min(200.0, Math.min(width, height) / 50.0)));
        for (Organism o : organisms) sh.insert(o);

        // step each organism with simple cohesion/escape behavior
        List<Organism> snapshot = snapshotOrganisms();
        for (Organism o : snapshot) {
            if (o.state != null && o.state.equals("dead")) continue;
            double neighborRadius = 80.0;
            List<Organism> neighbors = sh.queryRadius(o.x, o.y, neighborRadius);
            // compute cohesion: move toward average neighbor position
            double avgX = 0, avgY = 0; int n = 0;
            for (Organism nbh : neighbors) {
                if (nbh == o) continue;
                if (nbh.state != null && nbh.state.equals("dead")) continue;
                avgX += nbh.x; avgY += nbh.y; n++;
            }
            double cohesion = 0.2; // default
            double escape = 0.2;
            if (o.traits != null) {
                Object c = o.traits.get("cohesion"); if (c instanceof Number) cohesion = ((Number)c).doubleValue();
                Object e = o.traits.get("escape"); if (e instanceof Number) escape = ((Number)e).doubleValue();
            }
            if (n > 0) {
                avgX /= n; avgY /= n;
                double dx = (avgX - o.x);
                double dy = (avgY - o.y);
                o.vx += (dx * 0.001) * cohesion * 5.0;
                o.vy += (dy * 0.001) * cohesion * 5.0;
            }
            // short-range escape: if neighbor closer than 20px, move away
            for (Organism nbh : neighbors) {
                if (nbh == o) continue;
                double dx = o.x - nbh.x; double dy = o.y - nbh.y;
                double d2 = dx*dx + dy*dy;
                if (d2 > 0 && d2 < 20.0*20.0) {
                    double inv = 1.0 / Math.sqrt(d2);
                    o.vx += (dx * inv) * (escape * 0.2);
                    o.vy += (dy * inv) * (escape * 0.2);
                }
            }
            // apply velocity
            o.x += o.vx;
            o.y += o.vy;
            // friction
            o.vx *= 0.92; o.vy *= 0.92;
            // bounds
            if (o.x < 0) o.x = 0; if (o.y < 0) o.y = 0;
            if (o.x > width) o.x = width; if (o.y > height) o.y = height;
            // energy drain and aging
            o.energy -= 0.008 + (0.001 * Math.abs(o.vx) + 0.001 * Math.abs(o.vy));
            o.age += 1;
            if (o.energy <= 0) { o.energy = 0; o.state = "dead"; }
        }
    }

    public synchronized List<Organism> snapshotOrganisms() {
        return new ArrayList<>(organisms);
    }

    public synchronized long getTick() { return tick; }
}
