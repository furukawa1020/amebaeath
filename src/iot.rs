use reqwest::blocking::Client;
use serde::Deserialize;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

#[derive(Deserialize, Debug)]
struct WeatherResponse {
    current_weather: CurrentWeather,
}

#[derive(Deserialize, Debug)]
struct CurrentWeather {
    temperature: f32,
}

pub struct WeatherService {
    pub temperature: Arc<Mutex<f32>>,
}

impl WeatherService {
    pub fn new() -> Self {
        let temperature = Arc::new(Mutex::new(20.0)); // Default temp
        let temp_clone = temperature.clone();

        // Spawn a thread to fetch weather periodically
        thread::spawn(move || {
            let client = Client::new();
            loop {
                // Fetch for Tokyo (default)
                let url = "https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current_weather=true";
                
                match client.get(url).send() {
                    Ok(resp) => {
                        if let Ok(weather_data) = resp.json::<WeatherResponse>() {
                            let mut temp = temp_clone.lock().unwrap();
                            *temp = weather_data.current_weather.temperature;
                            println!("Updated temperature: {} C", *temp);
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to fetch weather: {}", e);
                    }
                }

                // Wait for 60 seconds before next fetch
                thread::sleep(Duration::from_secs(60));
            }
        });

        WeatherService { temperature }
    }

    pub fn get_temp(&self) -> f32 {
        *self.temperature.lock().unwrap()
    }
}
