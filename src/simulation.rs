use macroquad::prelude::*;
use std::f32::consts::PI;

#[derive(Clone)]
pub struct Node {
    pub pos: Vec2,
    pub vel: Vec2,
    pub mass: f32,
    pub radius: f32,
}

#[derive(Clone)]
pub struct Spring {
    pub node_a: usize,
    pub node_b: usize,
    pub rest_length: f32,
    pub stiffness: f32,
    pub damping: f32,
}

#[derive(Clone)]
pub struct Amoeba {
    pub nodes: Vec<Node>,
    pub springs: Vec<Spring>,
    pub color: Color,
    pub center: Vec2,
    pub radius: f32, // Approximate radius for broad-phase collision
}

impl Amoeba {
    pub fn new(x: f32, y: f32, radius: f32, num_nodes: usize, color: Color) -> Self {
        let mut nodes = Vec::new();
        let mut springs = Vec::new();

        for i in 0..num_nodes {
            let angle = (i as f32 / num_nodes as f32) * 2.0 * PI;
            let nx = x + angle.cos() * radius;
            let ny = y + angle.sin() * radius;
            nodes.push(Node {
                pos: vec2(nx, ny),
                vel: vec2(0.0, 0.0),
                mass: 1.0,
                radius: 5.0,
            });
        }

        // Connect adjacent nodes with springs
        for i in 0..num_nodes {
            let next = (i + 1) % num_nodes;
            let dist = nodes[i].pos.distance(nodes[next].pos);
            springs.push(Spring {
                node_a: i,
                node_b: next,
                rest_length: dist,
                stiffness: 100.0,
                damping: 2.0,
            });
        }

        // Internal structural springs (connect to opposite nodes)
        for i in 0..num_nodes {
            let opposite = (i + num_nodes / 2) % num_nodes;
            if i < opposite {
                 let dist = nodes[i].pos.distance(nodes[opposite].pos);
                 springs.push(Spring {
                    node_a: i,
                    node_b: opposite,
                    rest_length: dist,
                    stiffness: 50.0,
                    damping: 2.0,
                });
            }
        }

        Amoeba {
            nodes,
            springs,
            color,
            center: vec2(x, y),
            radius,
        }
    }

    pub fn update(&mut self, dt: f32, screen_width: f32, screen_height: f32) {
        // 1. Accumulate forces
        let mut forces = vec![Vec2::ZERO; self.nodes.len()];

        // Spring forces
        for spring in &self.springs {
            let p_a = self.nodes[spring.node_a].pos;
            let p_b = self.nodes[spring.node_b].pos;
            let v_a = self.nodes[spring.node_a].vel;
            let v_b = self.nodes[spring.node_b].vel;

            let delta = p_b - p_a;
            let dist = delta.length();
            
            if dist > 0.001 {
                let dir = delta / dist;
                let spring_force = (dist - spring.rest_length) * spring.stiffness;
                let rel_vel = v_b - v_a;
                let damping_force = rel_vel.dot(dir) * spring.damping;
                
                let total_force = dir * (spring_force + damping_force);
                
                forces[spring.node_a] += total_force;
                forces[spring.node_b] -= total_force;
            }
        }

        // Pressure force (Volume preservation - simplified)
        // Calculate polygon area
        let mut area = 0.0;
        let n = self.nodes.len();
        for i in 0..n {
            let j = (i + 1) % n;
            area += self.nodes[i].pos.x * self.nodes[j].pos.y;
            area -= self.nodes[j].pos.x * self.nodes[i].pos.y;
        }
        area *= 0.5;
        let current_volume = area.abs();
        let target_volume = PI * self.radius * self.radius; // Target based on initial radius
        let pressure = (target_volume - current_volume) * 10.0; // Pressure constant

        for i in 0..n {
            let j = (i + 1) % n;
            let p1 = self.nodes[i].pos;
            let p2 = self.nodes[j].pos;
            let normal = vec2(p1.y - p2.y, p2.x - p1.x).normalize_or_zero();
            forces[i] += normal * pressure * dt;
            forces[j] += normal * pressure * dt;
        }


        // 2. Integrate
        let mut center_sum = Vec2::ZERO;
        for (i, node) in self.nodes.iter_mut().enumerate() {
            let accel = forces[i] / node.mass;
            node.vel += accel * dt;
            node.pos += node.vel * dt;
            
            // Wall collisions
            if node.pos.x < 0.0 { node.pos.x = 0.0; node.vel.x *= -0.5; }
            if node.pos.x > screen_width { node.pos.x = screen_width; node.vel.x *= -0.5; }
            if node.pos.y < 0.0 { node.pos.y = 0.0; node.vel.y *= -0.5; }
            if node.pos.y > screen_height { node.pos.y = screen_height; node.vel.y *= -0.5; }

            // Drag/Friction
            node.vel *= 0.99;

            center_sum += node.pos;
        }
        self.center = center_sum / self.nodes.len() as f32;
    }

    pub fn draw(&self) {
        // Draw filled polygon
        // Macroquad doesn't have a direct "fill polygon" for arbitrary vertices easily without triangulation,
        // but we can draw a fan from the center.
        let n = self.nodes.len();
        for i in 0..n {
            let next = (i + 1) % n;
            draw_triangle(
                self.center,
                self.nodes[i].pos,
                self.nodes[next].pos,
                self.color
            );
        }
        
        // Draw outline
        for i in 0..n {
            let next = (i + 1) % n;
            draw_line(
                self.nodes[i].pos.x, self.nodes[i].pos.y,
                self.nodes[next].pos.x, self.nodes[next].pos.y,
                2.0,
                WHITE
            );
        }
    }
}

pub struct Food {
    pub pos: Vec2,
    pub value: f32,
    pub color: Color,
}

impl Food {
    pub fn new(x: f32, y: f32) -> Self {
        Food {
            pos: vec2(x, y),
            value: 10.0,
            color: GREEN,
        }
    }
    
    pub fn draw(&self) {
        draw_circle(self.pos.x, self.pos.y, 5.0, self.color);
    }
}

pub struct World {
    pub amoebas: Vec<Amoeba>,
    pub foods: Vec<Food>,
    pub temperature: f32,
    pub width: f32,
    pub height: f32,
}

impl World {
    pub fn new(width: f32, height: f32) -> Self {
        let mut amoebas = Vec::new();
        // Spawn a few initial amoebas
        amoebas.push(Amoeba::new(width / 2.0, height / 2.0, 30.0, 12, BLUE));
        
        World {
            amoebas,
            foods: Vec::new(),
            temperature: 20.0, // Default Celsius
            width,
            height,
        }
    }

    pub fn update(&mut self, dt: f32) {
        // Update Amoebas
        for amoeba in &mut self.amoebas {
            // Move towards nearest food if exists
            let mut nearest_food: Option<Vec2> = None;
            let mut min_dist = f32::MAX;
            
            for food in &self.foods {
                let d = amoeba.center.distance(food.pos);
                if d < min_dist {
                    min_dist = d;
                    nearest_food = Some(food.pos);
                }
            }

            if let Some(target) = nearest_food {
                let dir = (target - amoeba.center).normalize_or_zero();
                // Apply force to all nodes to move towards food
                for node in &mut amoeba.nodes {
                    node.vel += dir * 50.0 * dt; // Motility force
                }
            } else {
                // Random movement if no food
                 for node in &mut amoeba.nodes {
                    node.vel += vec2(rand::gen_range(-10.0, 10.0), rand::gen_range(-10.0, 10.0)) * dt;
                }
            }

            amoeba.update(dt, self.width, self.height);
        }

        // Collision: Amoeba vs Food
        let mut eaten_indices = Vec::new();
        for (f_idx, food) in self.foods.iter().enumerate() {
            for amoeba in &mut self.amoebas {
                if amoeba.center.distance(food.pos) < amoeba.radius {
                    // Eat!
                    eaten_indices.push(f_idx);
                    // Grow
                    amoeba.radius += 1.0;
                    // Update rest lengths to match new radius (simplified)
                    for spring in &mut amoeba.springs {
                        spring.rest_length *= 1.02; // Grow slightly
                    }
                    break; // Food eaten by one amoeba
                }
            }
        }
        // Remove eaten food (reverse sort to avoid index shifting)
        eaten_indices.sort_by(|a, b| b.cmp(a));
        eaten_indices.dedup();
        for idx in eaten_indices {
            self.foods.remove(idx);
        }

        // Spawn food based on temperature
        // Higher temp -> more food (up to a limit)
        let spawn_chance = 0.01 * (self.temperature / 20.0).max(0.1);
        if rand::gen_range(0.0, 1.0) < spawn_chance {
            self.foods.push(Food::new(
                rand::gen_range(0.0, self.width),
                rand::gen_range(0.0, self.height)
            ));
        }
    }

    pub fn draw(&self) {
        for food in &self.foods {
            food.draw();
        }
        for amoeba in &self.amoebas {
            amoeba.draw();
        }
    }
}
