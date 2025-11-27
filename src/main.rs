use macroquad::prelude::*;

mod simulation;
mod iot;

use simulation::World;
use iot::WeatherService;

#[macroquad::main("Ameba Earth")]
async fn main() {
    let mut world = World::new(screen_width(), screen_height());
    let weather_service = WeatherService::new();

    loop {
        let dt = get_frame_time();
        
        // Update world dimensions in case of resize
        world.width = screen_width();
        world.height = screen_height();

        // Update temperature from IoT service
        world.temperature = weather_service.get_temp();

        // Update simulation
        world.update(dt);

        // Draw
        clear_background(BLACK);
        
        world.draw();

        // UI
        draw_text(&format!("FPS: {}", get_fps()), 10.0, 20.0, 20.0, WHITE);
        draw_text(&format!("Entities: {}", world.amoebas.len()), 10.0, 40.0, 20.0, WHITE);
        draw_text(&format!("Food: {}", world.foods.len()), 10.0, 60.0, 20.0, WHITE);
        draw_text(&format!("Temp: {:.1} C", world.temperature), 10.0, 80.0, 20.0, YELLOW);

        next_frame().await
    }
}
