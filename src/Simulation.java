import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.awt.Color;

class Vector2 {
    float x, y;

    Vector2(float x, float y) {
        this.x = x;
        this.y = y;
    }

    Vector2 add(Vector2 v) {
        return new Vector2(x + v.x, y + v.y);
    }

    Vector2 sub(Vector2 v) {
        return new Vector2(x - v.x, y - v.y);
    }

    Vector2 mult(float s) {
        return new Vector2(x * s, y * s);
    }

    float mag() {
        return (float) Math.sqrt(x * x + y * y);
    }

    Vector2 normalize() {
        float m = mag();
        if (m == 0)
            return new Vector2(0, 0);
        return new Vector2(x / m, y / m);
    }

    float dist(Vector2 v) {
        return sub(v).mag();
    }

    Vector2 limit(float max) {
        if (mag() > max) {
            return normalize().mult(max);
        }
        return this;
    }
}

class Node {
    Vector2 pos, vel, acc;
    float mass = 1.0f;
    float radius = 8.0f;

    Node(float x, float y) {
        pos = new Vector2(x, y);
        vel = new Vector2(0, 0);
        acc = new Vector2(0, 0);
    }
}

class Spring {
    Node a, b;
    float restLength;
    float stiffness = 80.0f;
    float damping = 2.5f;

    Spring(Node a, Node b, float len) {
        this.a = a;
        this.b = b;
        this.restLength = len;
    }
}

class Genes {
    float maxSpeed;
    float senseRadius;
    float metabolism; // Affects growth rate and energy cost
    Color color;

    Genes() {
        Random r = new Random();
        maxSpeed = 60.0f + r.nextFloat() * 40.0f;
        senseRadius = 100.0f + r.nextFloat() * 100.0f;
        metabolism = 0.8f + r.nextFloat() * 0.4f;
        color = new Color(r.nextInt(100), 150 + r.nextInt(105), 200 + r.nextInt(55)); // Cyan-ish base
    }

    Genes(Genes parent) {
        Random r = new Random();
        // Mutation
        maxSpeed = parent.maxSpeed + (r.nextFloat() - 0.5f) * 10.0f;
        senseRadius = parent.senseRadius + (r.nextFloat() - 0.5f) * 20.0f;
        metabolism = parent.metabolism + (r.nextFloat() - 0.5f) * 0.1f;

        int red = clamp(parent.color.getRed() + r.nextInt(40) - 20);
        int green = clamp(parent.color.getGreen() + r.nextInt(40) - 20);
        int blue = clamp(parent.color.getBlue() + r.nextInt(40) - 20);
        color = new Color(red, green, blue);
    }

    private int clamp(int val) {
        return Math.max(0, Math.min(255, val));
    }
}

class Amoeba {
    List<Node> nodes = new ArrayList<>();
    List<Spring> springs = new ArrayList<>();
    Vector2 center;
    float targetRadius;
    Genes genes;
    float energy = 50.0f; // Energy for reproduction

    Amoeba(float x, float y, float radius, int numNodes, Genes genes) {
        this.targetRadius = radius;
        this.genes = (genes == null) ? new Genes() : genes;
        center = new Vector2(x, y);

        for (int i = 0; i < numNodes; i++) {
            float angle = (float) (i * 2 * Math.PI / numNodes);
            float nx = x + (float) Math.cos(angle) * radius;
            float ny = y + (float) Math.sin(angle) * radius;
            nodes.add(new Node(nx, ny));
        }

        buildSprings();
    }

    void buildSprings() {
        springs.clear();
        int numNodes = nodes.size();
        for (int i = 0; i < numNodes; i++) {
            Node n1 = nodes.get(i);
            Node n2 = nodes.get((i + 1) % numNodes);
            springs.add(new Spring(n1, n2, n1.pos.dist(n2.pos)));
        }
        for (int i = 0; i < numNodes; i++) {
            Node n1 = nodes.get(i);
            Node n2 = nodes.get((i + numNodes / 2) % numNodes);
            if (i < (i + numNodes / 2) % numNodes) {
                springs.add(new Spring(n1, n2, n1.pos.dist(n2.pos)));
            }
        }
    }

    void update(float dt, int width, int height) {
        // Physics (Springs & Pressure) - Same as before but tuned
        for (Spring s : springs) {
            Vector2 dir = s.b.pos.sub(s.a.pos);
            float dist = dir.mag();
            if (dist == 0)
                continue;
            dir = dir.normalize();
            float stretch = dist - s.restLength;
            float force = -s.stiffness * stretch;
            Vector2 relVel = s.b.vel.sub(s.a.vel);
            float dampingForce = -s.damping * (relVel.x * dir.x + relVel.y * dir.y);
            Vector2 totalForce = dir.mult(force + dampingForce);
            s.a.acc = s.a.acc.add(totalForce.mult(-1));
            s.b.acc = s.b.acc.add(totalForce);
        }

        float currentArea = 0;
        for (int i = 0; i < nodes.size(); i++) {
            Node n1 = nodes.get(i);
            Node n2 = nodes.get((i + 1) % nodes.size());
            currentArea += (n1.pos.x * n2.pos.y - n2.pos.x * n1.pos.y);
        }
        currentArea = Math.abs(currentArea) * 0.5f;
        float targetArea = (float) (Math.PI * targetRadius * targetRadius);
        float pressure = (targetArea - currentArea) * 50.0f;

        for (int i = 0; i < nodes.size(); i++) {
            Node n1 = nodes.get(i);
            Node n2 = nodes.get((i + 1) % nodes.size());
            Vector2 edge = n2.pos.sub(n1.pos);
            Vector2 normal = new Vector2(-edge.y, edge.x).normalize();
            Vector2 pForce = normal.mult(pressure * dt);
            n1.acc = n1.acc.add(pForce);
            n2.acc = n2.acc.add(pForce);
        }

        Vector2 centerSum = new Vector2(0, 0);
        for (Node n : nodes) {
            n.vel = n.vel.add(n.acc.mult(dt));
            n.pos = n.pos.add(n.vel.mult(dt));
            n.acc = new Vector2(0, 0);

            if (n.pos.x < 0) {
                n.pos.x = 0;
                n.vel.x *= -0.5;
            }
            if (n.pos.x > width) {
                n.pos.x = width;
                n.vel.x *= -0.5;
            }
            if (n.pos.y < 0) {
                n.pos.y = 0;
                n.vel.y *= -0.5;
            }
            if (n.pos.y > height) {
                n.pos.y = height;
                n.vel.y *= -0.5;
            }

            n.vel = n.vel.mult(0.98f);
            centerSum = centerSum.add(n.pos);
        }
        center = centerSum.mult(1.0f / nodes.size());
    }

    Amoeba divide() {
        // Simple division: Create two new amoebas near the parent
        // Offspring mutates
        Genes childGenes = new Genes(this.genes);
        float newRadius = this.targetRadius * 0.7f; // Conserve mass roughly
        return new Amoeba(center.x + 10, center.y + 10, newRadius, nodes.size(), childGenes);
    }
}

class Food {
    Vector2 pos;
    float value = 10.0f;

    Food(float x, float y) {
        pos = new Vector2(x, y);
    }
}

public class Simulation {
    List<Amoeba> amoebas = new ArrayList<>();
    List<Food> foods = new ArrayList<>();
    float temperature = 20.0f;
    int width, height;
    Random rand = new Random();

    public Simulation(int width, int height) {
        this.width = width;
        this.height = height;
        // Spawn initial population
        for (int i = 0; i < 5; i++) {
            amoebas.add(new Amoeba(rand.nextFloat() * width, rand.nextFloat() * height, 30, 12, null));
        }
    }

    public void update(float dt) {
        List<Amoeba> newAmoebas = new ArrayList<>();
        List<Amoeba> deadAmoebas = new ArrayList<>();

        for (Amoeba a : amoebas) {
            Vector2 force = new Vector2(0, 0);

            // 1. Foraging (Seek Food)
            Food nearest = null;
            float minDist = a.genes.senseRadius;
            for (Food f : foods) {
                float d = a.center.dist(f.pos);
                if (d < minDist) {
                    minDist = d;
                    nearest = f;
                }
            }
            if (nearest != null) {
                Vector2 dir = nearest.pos.sub(a.center).normalize();
                force = force.add(dir.mult(a.genes.maxSpeed));
            } else {
                // Wander
                force = force.add(
                        new Vector2(rand.nextFloat() - 0.5f, rand.nextFloat() - 0.5f).mult(a.genes.maxSpeed * 0.5f));
            }

            // 2. Flocking / Swarming (Separation only for now to prevent clumps)
            for (Amoeba other : amoebas) {
                if (other == a)
                    continue;
                float d = a.center.dist(other.center);
                if (d < a.targetRadius + other.targetRadius) {
                    Vector2 push = a.center.sub(other.center).normalize();
                    force = force.add(push.mult(100.0f)); // Separation force
                }
            }

            // Apply force to nodes
            for (Node n : a.nodes) {
                n.vel = n.vel.add(force.mult(dt));
            }

            a.update(dt, width, height);

            // Metabolism cost
            a.energy -= dt * a.genes.metabolism;
            if (a.energy <= 0) {
                // Starvation (shrink)
                a.targetRadius -= 5.0f * dt;
                if (a.targetRadius < 10.0f)
                    deadAmoebas.add(a);
            }
        }

        // Interactions
        // Eating Food
        List<Food> eatenFood = new ArrayList<>();
        for (Food f : foods) {
            for (Amoeba a : amoebas) {
                if (a.center.dist(f.pos) < a.targetRadius) {
                    eatenFood.add(f);
                    a.energy += f.value * 2.0f;
                    a.targetRadius += 1.0f;
                    // Update springs for new size
                    for (Spring s : a.springs)
                        s.restLength *= 1.01f;
                    break;
                }
            }
        }
        foods.removeAll(eatenFood);

        // Reproduction
        for (Amoeba a : amoebas) {
            if (a.targetRadius > 50.0f && a.energy > 100.0f) {
                newAmoebas.add(a.divide());
                a.targetRadius *= 0.7f; // Shrink parent
                a.energy *= 0.5f; // Split energy
                for (Spring s : a.springs)
                    s.restLength *= 0.7f;
            }
        }

        // Predation (Big eats small)
        for (Amoeba predator : amoebas) {
            for (Amoeba prey : amoebas) {
                if (predator == prey)
                    continue;
                if (deadAmoebas.contains(prey))
                    continue;

                if (predator.targetRadius > prey.targetRadius * 1.5f &&
                        predator.center.dist(prey.center) < predator.targetRadius) {
                    // Eat prey
                    predator.energy += prey.energy * 0.8f;
                    predator.targetRadius += prey.targetRadius * 0.2f;
                    deadAmoebas.add(prey);
                }
            }
        }

        amoebas.removeAll(deadAmoebas);
        amoebas.addAll(newAmoebas);

        // Spawn food
        float spawnChance = 0.05f * Math.max(0.1f, temperature / 20.0f);
        if (rand.nextFloat() < spawnChance) {
            foods.add(new Food(rand.nextFloat() * width, rand.nextFloat() * height));
        }
    }
}
