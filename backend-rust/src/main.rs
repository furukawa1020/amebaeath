use actix_web::{post, get, web, App, HttpServer, Responder, HttpResponse};
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::time::interval;

#[derive(Serialize, Deserialize, Clone)]
pub struct Position { pub x: f64, pub y: f64 }

#[derive(Serialize, Deserialize, Clone)]
pub struct Velocity { pub vx: f64, pub vy: f64 }

#[derive(Serialize, Deserialize, Clone)]
pub struct Traits { pub cohesion: f64, pub escape: f64, pub predation: f64, pub warmth_preference: f64 }

#[derive(Serialize, Deserialize, Clone)]
pub struct Organism {
    pub id: String,
    pub position: Position,
    pub velocity: Velocity,
    pub size: f64,
    pub metaballs: Vec<(f64,f64,f64)>,
    pub traits: Traits,
    pub dna_layers: Vec<String>,
    pub energy: f64,
    pub state: String,
    pub spawned_at: u128,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TouchEvent { pub id: String, pub x: f64, pub y: f64, pub amplitude: f64, pub sigma: f64, pub created_at: u128 }

struct AppState { organisms: Mutex<Vec<Organism>>, touches: Mutex<Vec<TouchEvent>> }

#[get("/state")]
async fn state(data: web::Data<AppState>) -> impl Responder {
    let orgs = data.organisms.lock().unwrap().clone();
    HttpResponse::Ok().json(serde_json::json!({ "tick": 0, "organisms": orgs }))
}

#[post("/spawn")]
async fn spawn(data: web::Data<AppState>, body: web::Json<Option<Traits>>) -> impl Responder {
    let id = Uuid::new_v4().to_string();
    let t = body.into_inner();
    let traits = t.unwrap_or(Traits{cohesion: 0.5, escape: 0.3, predation: 0.2, warmth_preference: 0.5});
    let org = Organism{ id: id.clone(), position: Position{x: rand::random::<f64>()*2000.0, y: rand::random::<f64>()*2000.0}, velocity: Velocity{vx:0.0, vy:0.0}, size: 1.0, metaballs: vec![(0.0,0.0,16.0)], traits, dna_layers: vec![random_color()], energy: 0.9, state: "normal".to_string(), spawned_at: now_ms() };
    data.organisms.lock().unwrap().push(org.clone());
    HttpResponse::Created().json(serde_json::json!({ "organism": org }))
}

#[post("/touch")]
async fn touch(data: web::Data<AppState>, body: web::Json<web::JsonValue>) -> impl Responder {
    let x = body.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let y = body.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let amplitude = body.get("amplitude").and_then(|v| v.as_f64()).unwrap_or(0.6);
    let sigma = body.get("sigma").and_then(|v| v.as_f64()).unwrap_or(30.0);
    let ev = TouchEvent{ id: Uuid::new_v4().to_string(), x, y, amplitude, sigma, created_at: now_ms() };
    data.touches.lock().unwrap().push(ev.clone());
    HttpResponse::Ok().json(serde_json::json!({ "ok": true, "touch": ev }))
}

fn now_ms() -> u128 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() }

fn random_color() -> String {
    let palette = ["#88c1ff","#ffccaa","#b8f4a6","#f4b6c2","#ffeeaa","#c8a2ff","#ffd1dc","#aaffc3","#ffe4b5","#ffd27f"];
    let idx = (rand::random::<f64>() * (palette.len() as f64)) as usize % palette.len();
    palette[idx].to_string()
}

async fn simulation_loop(data: web::Data<AppState>) {
    let mut interval = interval(Duration::from_millis(250));
    loop {
        interval.tick().await;
        // Basic simulation per organism
        let mut orgs = data.organisms.lock().unwrap();
        let touches = data.touches.lock().unwrap().clone();
        for o in orgs.iter_mut() {
            // energy decay
            o.energy -= 0.01 * 0.25; if o.energy < 0.0 { o.energy = 0.0 }
            if o.energy < 0.1 { o.state = "sleep".to_string(); } else { o.state = "normal".to_string(); }
            // random movement
            let dx = (rand::random::<f64>() - 0.5) * 0.04;
            let dy = (rand::random::<f64>() - 0.5) * 0.04;
            o.velocity.vx += dx; o.velocity.vy += dy;
            // touch attraction
            if let Some(t) = touches.last() {
                let ddx = t.x - o.position.x; let ddy = t.y - o.position.y;
                let dist2 = ddx*ddx + ddy*ddy + 0.0001;
                let influence = (-(dist2 / (t.sigma * t.sigma))).exp() * t.amplitude;
                o.velocity.vx += (ddx/dist2) * influence * 0.02;
                o.velocity.vy += (ddy/dist2) * influence * 0.02;
            }
            // apply velocity
            o.position.x += o.velocity.vx * 0.25 * 10.0;
            o.position.y += o.velocity.vy * 0.25 * 10.0;
            // wrap
            if o.position.x < 0.0 { o.position.x += 2000.0 }
            if o.position.x > 2000.0 { o.position.x -= 2000.0 }
            if o.position.y < 0.0 { o.position.y += 2000.0 }
            if o.position.y > 2000.0 { o.position.y -= 2000.0 }
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    let state = web::Data::new(AppState{ organisms: Mutex::new(vec![]), touches: Mutex::new(vec![]) });
    // start simulation task
    let state_clone = state.clone();
    tokio::spawn(async move { simulation_loop(state_clone).await });
    HttpServer::new(move || {
        App::new().app_data(state.clone()).service(state).service(spawn).service(touch)
    })
    .bind(("127.0.0.1", 8081))?
    .run()
    .await
}
