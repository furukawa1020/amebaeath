use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tokio::time::{self, Duration};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone)]
struct Position { x: f64, y: f64 }

#[derive(Serialize, Deserialize, Clone)]
struct Velocity { vx: f64, vy: f64 }

#[derive(Serialize, Deserialize, Clone)]
struct Traits { cohesion: f64, escape: f64, predation: f64, warmth_preference: f64 }

#[derive(Serialize, Deserialize, Clone)]
struct Organism {
    id: String,
    position: Position,
    velocity: Velocity,
    size: f64,
    traits: Traits,
    dna_layers: Vec<String>,
    energy: f64,
}

#[derive(Clone, Serialize)]
struct WorldMaps {
    temperatureMap: Vec<Vec<f64>>,
    foodMap: Vec<Vec<f64>>,
    densityMap: Vec<Vec<u32>>,
}

#[derive(Clone, Serialize)]
struct World {
    organisms: Vec<Organism>,
    touch_events: Vec<TouchRequest>,
    maps: WorldMaps,
}

#[derive(Deserialize)]
struct SpawnRequest { seedTraits: Option<Traits> }

#[derive(Deserialize)]
struct TouchRequest { x: f64, y: f64, amplitude: Option<f64>, sigma: Option<f64> }

async fn state(world: web::Data<Arc<Mutex<World>>>) -> impl Responder {
    let w = world.lock().unwrap();
    HttpResponse::Ok().json(&*w)
}

async fn spawn(req: web::Json<SpawnRequest>, world: web::Data<Arc<Mutex<World>>>) -> impl Responder {
    let s = req.into_inner();
    let mut w = world.lock().unwrap();
    let id = Uuid::new_v4().to_string();
    let pos = Position { x: (rand::random::<f64>()*2000.0), y: (rand::random::<f64>()*2000.0) };
    let traits = s.seedTraits.unwrap_or(Traits { cohesion: 0.5, escape: 0.4, predation: 0.2, warmth_preference: 0.5 });
    let org = Organism { id, position: pos, velocity: Velocity { vx:0.0, vy:0.0 }, size: 1.0 + rand::random::<f64>()*0.5, traits, dna_layers: vec!["#88c1ff".to_string()], energy: 1.0 };
    w.organisms.push(org.clone());
    HttpResponse::Created().json(org)
}

async fn handle_touch(payload: web::Json<TouchRequest>, world: web::Data<Arc<Mutex<World>>>) -> impl Responder {
    // MVP: just accept and ignore, but would update temperatureMap in real implementation
    let t = payload.into_inner();
    let mut w = world.lock().unwrap();
    w.touch_events.push(t.clone());
    let res = serde_json::json!({"ok": true, "touch": {"x": t.x, "y": t.y, "amplitude": t.amplitude.unwrap_or(0.6), "sigma": t.sigma.unwrap_or(30.0)}});
    HttpResponse::Ok().json(res)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // seed world
    let world = World { organisms: vec![], touch_events: vec![], maps: WorldMaps { temperatureMap: vec![vec![0.0; 200]; 200], foodMap: vec![vec![0.0;200];200], densityMap: vec![vec![0;200];200] } };
    let world = Arc::new(Mutex::new(world));

    // initial 10 organisms
    {
        let mut w = world.lock().unwrap();
        for _ in 0..10 {
            let id = Uuid::new_v4().to_string();
            let pos = Position { x: (rand::random::<f64>()*2000.0), y: (rand::random::<f64>()*2000.0) };
            w.organisms.push(Organism { id, position: pos, velocity: Velocity { vx: 0.0, vy: 0.0 }, size: 0.9 + rand::random::<f64>()*0.7, traits: Traits { cohesion: 0.5, escape: 0.3, predation: 0.2, warmth_preference: 0.5 }, dna_layers: vec!["#88c1ff".to_string()], energy: 0.9 });
        }
    }

    // Spawn a background loop that updates world (very simple for MVP)
    let w = world.clone();
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_millis(500));
        loop {
            interval.tick().await;
            let mut world = w.lock().unwrap();
            for org in &mut world.organisms {
                // simple wandering
                org.energy = (org.energy - 0.01).max(0.0);
                org.position.x = (org.position.x + (rand::random::<f64>() - 0.5) * 2.0) % 2000.0;
                org.position.y = (org.position.y + (rand::random::<f64>() - 0.5) * 2.0) % 2000.0;
            }
            // decay temperature and clear density
            for gy in 0..200 {
                for gx in 0..200 {
                    world.maps.temperatureMap[gy][gx] = (world.maps.temperatureMap[gy][gx] - 0.01).max(0.0);
                    world.maps.densityMap[gy][gx] = 0;
                }
            }
            // apply touches
            while let Some(t) = world.touch_events.pop() {
                let sigma = t.sigma.unwrap_or(30.0);
                for gy in 0..200 {
                    for gx in 0..200 {
                        let cx = gx as f64 * 10.0 + 5.0;
                        let cy = gy as f64 * 10.0 + 5.0;
                        let dx = cx - t.x;
                        let dy = cy - t.y;
                        let dist2 = dx*dx + dy*dy;
                        let influence = (t.amplitude.unwrap_or(0.6)) * (-dist2/(2.0*sigma*sigma)).exp();
                        world.maps.temperatureMap[gy][gx] += influence * 0.5;
                    }
                }
            }
            // update density
            for org in &world.organisms {
                let gx = (org.position.x / 10.0).floor() as usize;
                let gy = (org.position.y / 10.0).floor() as usize;
                if gx < 200 && gy < 200 { world.maps.densityMap[gy][gx] += 1; }
            }
        }
    });

    println!("Rust sim server running: http://localhost:4001");
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(world.clone()))
            .route("/state", web::get().to(state))
            .route("/spawn", web::post().to(spawn))
            .route("/touch", web::post().to(handle_touch))
    })
    .bind(("127.0.0.1", 4001))?
    .run()
    .await
}
