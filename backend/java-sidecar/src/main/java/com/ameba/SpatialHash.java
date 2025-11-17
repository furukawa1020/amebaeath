package com.ameba;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SpatialHash {
    private final double cellSize;
    private final Map<Long, List<Organism>> map = new HashMap<>();

    public SpatialHash(double cellSize) {
        this.cellSize = cellSize;
    }

    private long keyFor(double x, double y) {
        long xi = (long)Math.floor(x / cellSize);
        long yi = (long)Math.floor(y / cellSize);
        return (xi << 32) ^ (yi & 0xffffffffL);
    }

    public synchronized void clear() { map.clear(); }

    public synchronized void insert(Organism o) {
        long k = keyFor(o.x, o.y);
        map.computeIfAbsent(k, kk -> new ArrayList<>()).add(o);
    }

    public synchronized List<Organism> queryRadius(double x, double y, double r) {
        List<Organism> out = new ArrayList<>();
        int minX = (int)Math.floor((x - r) / cellSize);
        int maxX = (int)Math.floor((x + r) / cellSize);
        int minY = (int)Math.floor((y - r) / cellSize);
        int maxY = (int)Math.floor((y + r) / cellSize);
        double r2 = r * r;
        for (int xi = minX; xi <= maxX; xi++) {
            for (int yi = minY; yi <= maxY; yi++) {
                long k = ( (long)xi << 32 ) ^ (yi & 0xffffffffL);
                List<Organism> bucket = map.get(k);
                if (bucket == null) continue;
                for (Organism o : bucket) {
                    double dx = o.x - x;
                    double dy = o.y - y;
                    if (dx*dx + dy*dy <= r2) out.add(o);
                }
            }
        }
        return out;
    }
}
