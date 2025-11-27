import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class IoT {
    private float temperature = 20.0f;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public IoT() {
        scheduler.scheduleAtFixedRate(this::fetchWeather, 0, 60, TimeUnit.SECONDS);
    }

    private void fetchWeather() {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current_weather=true"))
                .build();

            client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(HttpResponse::body)
                .thenAccept(this::parseTemperature)
                .exceptionally(e -> {
                    System.err.println("Failed to fetch weather: " + e.getMessage());
                    return null;
                });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void parseTemperature(String json) {
        // Simple regex parsing to avoid external dependencies like Jackson/Gson
        Pattern pattern = Pattern.compile("\"temperature\":([0-9.]+)");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            this.temperature = Float.parseFloat(matcher.group(1));
            System.out.println("Updated temperature: " + this.temperature);
        }
    }

    public float getTemperature() {
        return temperature;
    }
}
