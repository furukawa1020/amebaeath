import java.util.ArrayList;
import java.util.List;
import java.util.Random;

class Vector2 {
    float x, y;

    Vector2(float x, float y) {
        this.x = x;
        this.y = y;
    }

    Vector2 add(Vector2 v) { return new Vector2(x + v.x, y + v.y); }
    Vector2 sub(Vector2 v) { return new Vector2(x - v.x, y - v.y); }
    Vector2 mult(float s) { return new Vector2(x * s, y * s); }
    float mag() { return (float) Math.sqrt(x * x + y * y); }
    Vector2 normalize() {
        float m = mag();
        if (m == 0) return new Vector2(0, 0);
        return new Vector2(x / m, y / m);
    }
    float dist(Vector2 v) { return sub(v).mag(); }
}

class Node {
    Vector2 pos, vel, acc;
    float mass = 1.0f;
    float radius = 8.0f; // Radius for rendering/collision

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

class Amoeba {
    List<Node> nodes = new ArrayList<>();
    List<Spring> springs = new ArrayList<>();
    Vector2 center;
    float targetRadius;
    
    Amoeba(float x, float y, float radius, int numNodes) {
        this.targetRadius = radius;
        center = new Vector2(x, y);
        
        for (int i = 0; i < numNodes; i++) {
            float angle = (float) (i * 2 * Math.PI / numNodes);
            float nx = x + (float) Math.cos(angle) * radius;
            float ny = y + (float) Math.sin(angle) * radius;
            nodes.add(new Node(nx, ny));
        }

        // Connect adjacent nodes
        for (int i = 0; i < numNodes; i++) {
            Node n1 = nodes.get(i);
            Node n2 = nodes.get((i + 1) % numNodes);
            springs.add(new Spring(n1, n2, n1.pos.dist(n2.pos)));
        }

        // Internal springs (cross-bracing)
        for (int i = 0; i < numNodes; i++) {
            Node n1 = nodes.get(i);
            Node n2 = nodes.get((i + numNodes / 2) % numNodes);
            if (i < (i + numNodes / 2) % numNodes) {
                 springs.add(new Spring(n1, n2, n1.pos.dist(n2.pos)));
            }
        }
    }

    void update(float dt, int width, int height) {
        // 1. Spring Forces
        for (Spring s : springs) {
            Vector2 dir = s.b.pos.sub(s.a.pos);
            float dist = dir.mag();
            if (dist == 0) continue;
            dir = dir.normalize();

            float stretch = dist - s.restLength;
            float force = -s.stiffness * stretch;

            // Damping
            Vector2 relVel = s.b.vel.sub(s.a.vel);
            float dampingForce = -s.damping * (relVel.x * dir.x + relVel.y * dir.y);

            Vector2 totalForce = dir.mult(force + dampingForce);
            s.a.acc = s.a.acc.add(totalForce.mult(-1));
            s.b.acc = s.b.acc.add(totalForce);
        }

        // 2. Pressure (Volume preservation)
        float currentArea = 0;
        for (int i = 0; i < nodes.size(); i++) {
            Node n1 = nodes.get(i);
            Node n2 = nodes.get((i + 1) % nodes.size());
            currentArea += (n1.pos.x * n2.pos.y - n2.pos.x * n1.pos.y);
        }
        currentArea = Math.abs(currentArea) * 0.5f;
        float targetArea = (float) (Math.PI * targetRadius * targetRadius);
        float pressure = (targetArea - currentArea) * 50.0f; // Pressure constant

        for (int i = 0; i < nodes.size(); i++) {
            Node n1 = nodes.get(i);
            Node n2 = nodes.get((i + 1) % nodes.size());
            Vector2 edge = n2.pos.sub(n1.pos);
            Vector2 normal = new Vector2(-edge.y, edge.x).normalize();
            Vector2 pForce = normal.mult(pressure * dt);
            n1.acc = n1.acc.add(pForce);
            n2.acc = n2.acc.add(pForce);
        }

        // 3. Integration
        Vector2 centerSum = new Vector2(0, 0);
        for (Node n : nodes) {
            n.vel = n.vel.add(n.acc.mult(dt));
            n.pos = n.pos.add(n.vel.mult(dt));
            n.acc = new Vector2(0, 0); // Reset acc

            // Wall collisions
            if (n.pos.x < 0) { n.pos.x = 0; n.vel.x *= -0.5; }
            if (n.pos.x > width) { n.pos.x = width; n.vel.x *= -0.5; }
            if (n.pos.y < 0) { n.pos.y = 0; n.vel.y *= -0.5; }
            if (n.pos.y > height) { n.pos.y = height; n.vel.y *= -0.5; }

            // Drag
            n.vel = n.vel.mult(0.98f);
            centerSum = centerSum.add(n.pos);
        }
        center = centerSum.mult(1.0f / nodes.size());
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
        amoebas.add(new Amoeba(width / 2, height / 2, 40, 16));
    }

    public void update(float dt) {
        for (Amoeba a : amoebas) {
            // Move towards food
            Food nearest = null;
            float minDist = Float.MAX_VALUE;
            for (Food f : foods) {
                float d = a.center.dist(f.pos);
                if (d < minDist) {
                    minDist = d;
                    nearest = f;
                }
            }

            if (nearest != null) {
                Vector2 dir = nearest.pos.sub(a.center).normalize();
                for (Node n : a.nodes) {
                    n.vel = n.vel.add(dir.mult(80.0f * dt));
                }
            } else {
                 // Wander
                 for (Node n : a.nodes) {
                    n.vel = n.vel.add(new Vector2(rand.nextFloat()-0.5f, rand.nextFloat()-0.5f).mult(50.0f * dt));
                }
            }

            a.update(dt, width, height);
        }

        // Eating
        List<Food> eaten = new ArrayList<>();
        for (Food f : foods) {
            for (Amoeba a : amoebas) {
                if (a.center.dist(f.pos) < a.targetRadius) {
                    eaten.add(f);
                    a.targetRadius += 2.0f; // Grow
                    // Update rest lengths
                    for(Spring s : a.springs) s.restLength *= 1.02f;
                    break;
                }
            }
        }
        foods.removeAll(eaten);

        // Spawn food
        float spawnChance = 0.02f * Math.max(0.1f, temperature / 20.0f);
        if (rand.nextFloat() < spawnChance) {
            foods.add(new Food(rand.nextFloat() * width, rand.nextFloat() * height));
        }
    }
}
