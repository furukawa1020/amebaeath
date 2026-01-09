// Ameba Earth - Web Version
// Simplified JavaScript port of the Java simulation

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    
    sub(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    
    mult(s) {
        return new Vector2(this.x * s, this.y * s);
    }
    
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const m = this.mag();
        if (m === 0) return new Vector2(0, 0);
        return new Vector2(this.x / m, this.y / m);
    }
    
    dist(v) {
        return this.sub(v).mag();
    }
    
    limit(max) {
        if (this.mag() > max) {
            return this.normalize().mult(max);
        }
        return this;
    }
}

class Amoeba {
    constructor(x, y) {
        this.pos = new Vector2(x, y);
        this.vel = new Vector2(Math.random() - 0.5, Math.random() - 0.5);
        this.energy = 50 + Math.random() * 50;
        this.size = 15 + Math.random() * 10;
        this.color = {
            r: Math.floor(100 + Math.random() * 155),
            g: Math.floor(100 + Math.random() * 155),
            b: Math.floor(200 + Math.random() * 55)
        };
        this.speed = 0.5 + Math.random() * 0.5;
        this.senseRadius = 80 + Math.random() * 40;
        this.metabolism = 0.05 + Math.random() * 0.05;
        this.generation = 1;
        this.age = 0;
    }
    
    update(dt, width, height, food, amoebas, temperature) {
        // Age and metabolism
        this.age += dt;
        this.energy -= this.metabolism * dt * 10;
        
        // Find nearest food
        let nearestFood = null;
        let minDist = Infinity;
        
        for (let f of food) {
            const d = this.pos.dist(f.pos);
            if (d < this.senseRadius && d < minDist) {
                minDist = d;
                nearestFood = f;
            }
        }
        
        // Seek food
        if (nearestFood) {
            const desired = nearestFood.pos.sub(this.pos).normalize().mult(this.speed);
            this.vel = this.vel.mult(0.9).add(desired.mult(0.1));
        }
        
        // Find predators (larger amoebas)
        for (let other of amoebas) {
            if (other === this) continue;
            const d = this.pos.dist(other.pos);
            
            // Flee from larger amoebas
            if (d < this.senseRadius && other.size > this.size * 1.5) {
                const flee = this.pos.sub(other.pos).normalize().mult(this.speed * 1.5);
                this.vel = this.vel.add(flee.mult(0.2));
            }
            
            // Chase smaller amoebas
            if (d < this.senseRadius && this.size > other.size * 1.5) {
                const chase = other.pos.sub(this.pos).normalize().mult(this.speed);
                this.vel = this.vel.add(chase.mult(0.1));
            }
        }
        
        // Update position
        this.vel = this.vel.limit(this.speed * 2);
        this.pos = this.pos.add(this.vel.mult(dt * 60));
        
        // Wrap around edges
        if (this.pos.x < 0) this.pos.x = width;
        if (this.pos.x > width) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = height;
        if (this.pos.y > height) this.pos.y = 0;
        
        // Size based on energy
        this.size = Math.max(8, Math.min(40, 10 + this.energy * 0.3));
    }
    
    canReproduce() {
        return this.energy > 120 && this.size > 25 && this.age > 5;
    }
    
    reproduce() {
        const child = new Amoeba(this.pos.x, this.pos.y);
        child.color = {
            r: Math.max(50, Math.min(255, this.color.r + (Math.random() - 0.5) * 30)),
            g: Math.max(50, Math.min(255, this.color.g + (Math.random() - 0.5) * 30)),
            b: Math.max(50, Math.min(255, this.color.b + (Math.random() - 0.5) * 30))
        };
        child.speed = Math.max(0.3, Math.min(1.5, this.speed + (Math.random() - 0.5) * 0.2));
        child.senseRadius = Math.max(50, Math.min(150, this.senseRadius + (Math.random() - 0.5) * 20));
        child.metabolism = Math.max(0.02, Math.min(0.15, this.metabolism + (Math.random() - 0.5) * 0.02));
        child.generation = this.generation + 1;
        
        this.energy -= 60;
        this.age = 0;
        
        return child;
    }
    
    draw(ctx) {
        // Draw body with gradient
        const gradient = ctx.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, this.size);
        gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.9)`);
        gradient.addColorStop(0.7, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.6)`);
        gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.2)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eye direction based on velocity
        if (this.vel.mag() > 0.1) {
            const eyeOffset = this.vel.normalize().mult(this.size * 0.3);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.pos.x + eyeOffset.x, this.pos.y + eyeOffset.y, this.size * 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(this.pos.x + eyeOffset.x, this.pos.y + eyeOffset.y, this.size * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Food {
    constructor(x, y) {
        this.pos = new Vector2(x, y);
        this.energy = 20;
        this.size = 4;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Simulation {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.amoebas = [];
        this.food = [];
        this.temperature = 20;
        this.paused = false;
        this.maxGeneration = 1;
        
        this.init();
        this.fetchTemperature();
        this.lastTime = performance.now();
        this.animate();
    }
    
    init() {
        // Spawn initial amoebas
        for (let i = 0; i < 5; i++) {
            this.amoebas.push(new Amoeba(
                Math.random() * this.width,
                Math.random() * this.height
            ));
        }
        
        // Spawn initial food
        for (let i = 0; i < 30; i++) {
            this.spawnFood();
        }
    }
    
    spawnFood() {
        this.food.push(new Food(
            Math.random() * this.width,
            Math.random() * this.height
        ));
    }
    
    async fetchTemperature() {
        try {
            const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&current_weather=true');
            const data = await response.json();
            this.temperature = data.current_weather.temperature;
        } catch (error) {
            console.log('Failed to fetch temperature, using default');
            this.temperature = 20;
        }
        
        // Update every 10 minutes
        if (!this._temperatureTimeout) {
            this._temperatureTimeout = setTimeout(() => {
                this._temperatureTimeout = null;
                this.fetchTemperature();
            }, 600000);
        }
    }
    
    update(dt) {
        if (this.paused) return;
        
        // Update amoebas
        for (let amoeba of this.amoebas) {
            amoeba.update(dt, this.width, this.height, this.food, this.amoebas, this.temperature);
        }
        
        // Check food consumption
        for (let i = this.food.length - 1; i >= 0; i--) {
            for (let amoeba of this.amoebas) {
                if (amoeba.pos.dist(this.food[i].pos) < amoeba.size) {
                    amoeba.energy += this.food[i].energy;
                    this.food.splice(i, 1);
                    break;
                }
            }
        }
        
        // Check predation
        for (let i = 0; i < this.amoebas.length; i++) {
            for (let j = i + 1; j < this.amoebas.length; j++) {
                const a1 = this.amoebas[i];
                const a2 = this.amoebas[j];
                const dist = a1.pos.dist(a2.pos);
                
                if (dist < Math.max(a1.size, a2.size) * 0.5) {
                    if (a1.size > a2.size * 1.5) {
                        a1.energy += a2.energy * 0.5;
                        this.amoebas.splice(j, 1);
                        j--;
                    } else if (a2.size > a1.size * 1.5) {
                        a2.energy += a1.energy * 0.5;
                        this.amoebas.splice(i, 1);
                        i--;
                        break;
                    }
                }
            }
        }
        
        // Reproduction
        const newAmoebas = [];
        for (let amoeba of this.amoebas) {
            if (amoeba.canReproduce()) {
                const child = amoeba.reproduce();
                newAmoebas.push(child);
                if (child.generation > this.maxGeneration) {
                    this.maxGeneration = child.generation;
                }
            }
        }
        this.amoebas.push(...newAmoebas);
        
        // Remove dead amoebas
        this.amoebas = this.amoebas.filter(a => a.energy > 0);
        
        // Spawn new food based on temperature
        const foodSpawnRate = Math.max(0.5, 1 + (this.temperature - 20) * 0.05);
        if (Math.random() < foodSpawnRate * dt && this.food.length < 100) {
            this.spawnFood();
        }
        
        // Maintain minimum population
        if (this.amoebas.length < 3) {
            this.amoebas.push(new Amoeba(
                Math.random() * this.width,
                Math.random() * this.height
            ));
        }
        
        // Update stats
        document.getElementById('amoeba-count').textContent = this.amoebas.length;
        document.getElementById('food-count').textContent = this.food.length;
        document.getElementById('temperature').textContent = this.temperature.toFixed(1) + '°C';
        document.getElementById('generation').textContent = this.maxGeneration;
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw food
        for (let f of this.food) {
            f.draw(this.ctx);
        }
        
        // Draw amoebas
        for (let amoeba of this.amoebas) {
            amoeba.draw(this.ctx);
        }
        
        // Draw pause indicator
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
        }
    }
    
    animate() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        
        // Run 5x faster (5 updates per frame)
        for (let i = 0; i < 5; i++) {
            this.update(dt);
        }
        
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
    
    reset() {
        this.amoebas = [];
        this.food = [];
        this.maxGeneration = 1;
        this.init();
    }
    
    togglePause() {
        this.paused = !this.paused;
    }
}

// Initialize simulation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.simulation = new Simulation();
    });
} else {
    window.simulation = new Simulation();
}

