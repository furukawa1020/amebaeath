package com.ameba;

import java.util.List;

public class Organism {
    public String id;
    public double x;
    public double y;
    public double size;
    public double energy;
    public String state;
    public List<String> dna_layers;

    public Organism(String id, double x, double y, double size, double energy, List<String> dna_layers, String state) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.size = size;
        this.energy = energy;
        this.dna_layers = dna_layers;
        this.state = state;
    }
}
