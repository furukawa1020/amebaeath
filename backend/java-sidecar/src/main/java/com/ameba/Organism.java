package com.ameba;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;

public class Organism {
    public String id;
    public double x;
    public double y;
    public double vx;
    public double vy;
    public double size;
    public double energy;
    public String state;
    public List<String> dna_layers;
    public List<List<Double>> metaballs;
    public Map<String, Object> traits;
    public long spawnedAt;
    public long expiresAt;
    public int age;

    // no-arg constructor for Jackson
    public Organism() {
        this.dna_layers = new ArrayList<>();
        this.metaballs = new ArrayList<>();
        this.traits = new HashMap<>();
    }

    public Organism(String id, double x, double y, double vx, double vy, double size, double energy, List<String> dna_layers, List<List<Double>> metaballs, Map<String,Object> traits, String state, long spawnedAt, long expiresAt) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.energy = energy;
        this.dna_layers = dna_layers;
        this.metaballs = metaballs;
        this.traits = traits;
        this.state = state;
        this.spawnedAt = spawnedAt;
        this.expiresAt = expiresAt;
        this.age = 0;
    }
}
