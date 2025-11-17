use actix_web::{get, App, HttpServer, Responder, HttpResponse};
use serde::Serialize;

#[derive(Serialize)]
struct Org { id: String, position: Position, size: f64, energy: f64 }

#[derive(Serialize)]
struct Position { x: f64, y: f64 }

#[get("/state")]
async fn state() -> impl Responder {
    let mut orgs = Vec::new();
    for i in 0..6 {
        orgs.push(Org { id: format!("r{}", i), position: Position { x: (i as f64)*300.0 % 2000.0, y: (i as f64)*500.0 % 2000.0 }, size: 1.0 + (i as f64)*0.2, energy: 0.2 + (i as f64)*0.1 });
    }
    let body = serde_json::json!({"tick":0, "organisms": orgs});
    HttpResponse::Ok().json(body)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Rust sim listening on 6001");
    HttpServer::new(|| App::new().service(state))
        .bind(("127.0.0.1", 6001))?
        .run()
        .await
}
