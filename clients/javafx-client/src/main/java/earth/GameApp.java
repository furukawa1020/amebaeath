package earth;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import javafx.animation.AnimationTimer;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.scene.Group;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.paint.Color;
import javafx.stage.Stage;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class GameApp extends Application {
    private static final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private static final HttpClient client = HttpClient.newHttpClient();

    private final List<Organism> organisms = new ArrayList<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    private double worldSize = 2000.0; // default, will scale to canvas
    private int canvasSize = 800;

    @Override
    public void start(Stage primaryStage) {
        primaryStage.setTitle("Ameba Earth - JavaFX Client");
        Group root = new Group();
        Canvas canvas = new Canvas(canvasSize, canvasSize);
        root.getChildren().add(canvas);

        Scene scene = new Scene(root);
        primaryStage.setScene(scene);
        primaryStage.show();

        GraphicsContext gc = canvas.getGraphicsContext2D();

        // periodic poll of backend
        String backend = System.getenv().getOrDefault("AMEBA_BACKEND_URL", "http://localhost:3001");
        String stateUrl = backend + "/state";

        scheduler.scheduleAtFixedRate(() -> {
            try {
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(stateUrl))
                        .timeout(Duration.ofSeconds(3))
                        .GET()
                        .build();
                HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 200) {
                    parseState(resp.body());
                }
            } catch (IOException | InterruptedException e) {
                System.err.println("Failed to poll state: " + e.getMessage());
            }
        }, 0, 1, TimeUnit.SECONDS);

        // render loop
        new AnimationTimer() {
            @Override
            public void handle(long now) {
                render(gc);
            }
        }.start();

        primaryStage.setOnCloseRequest(evt -> {
            scheduler.shutdownNow();
            Platform.exit();
            System.exit(0);
        });
    }

    private synchronized void parseState(String json) {
        try {
            ObjectNode root = (ObjectNode) mapper.readTree(json);
            if (root.has("maps") && root.get("maps").has("worldMaps")) {
                // optional
            }
            ArrayNode arr = null;
            if (root.has("organisms") && root.get("organisms").isArray()) arr = (ArrayNode) root.get("organisms");
            else if (root.has("updates") && root.get("updates").isArray()) arr = (ArrayNode) root.get("updates");
            if (arr == null) return;

            List<Organism> next = new ArrayList<>();
            for (int i = 0; i < arr.size(); i++) {
                ObjectNode o = (ObjectNode) arr.get(i);
                String id = o.has("id") ? o.get("id").asText() : Integer.toString(i);
                double x = o.has("position") && o.get("position").has("x") ? o.get("position").get("x").asDouble() : 0;
                double y = o.has("position") && o.get("position").has("y") ? o.get("position").get("y").asDouble() : 0;
                double size = o.has("size") ? o.get("size").asDouble() : 1.0;
                double energy = o.has("energy") ? o.get("energy").asDouble() : 0.5;
                String state = o.has("state") ? o.get("state").asText() : "normal";
                String color = "#88c1ff";
                if (o.has("dna_layers") && o.get("dna_layers").isArray() && o.get("dna_layers").size() > 0) {
                    color = o.get("dna_layers").get(0).asText(color);
                }
                Organism org = new Organism(id, x, y, size, energy, state, color);
                next.add(org);
            }
            synchronized (organisms) {
                organisms.clear();
                organisms.addAll(next);
            }
        } catch (Exception e) {
            System.err.println("parseState error: " + e.getMessage());
        }
    }

    private void render(GraphicsContext gc) {
        // clear
        gc.setFill(Color.web("#0b0f14"));
        gc.fillRect(0, 0, canvasSize, canvasSize);

        // draw organisms
        synchronized (organisms) {
            for (Organism o : organisms) {
                double sx = (o.x / worldSize) * canvasSize;
                double sy = (o.y / worldSize) * canvasSize;
                double r = Math.max(4, o.size * 12);
                try {
                    gc.setFill(Color.web(o.color));
                } catch (Exception ex) {
                    gc.setFill(Color.LIGHTGRAY);
                }
                gc.fillOval(sx - r/2, sy - r/2, r, r);

                // energy bar
                double bw = r;
                double bh = 4;
                double bx = sx - bw/2;
                double by = sy - r/2 - 8;
                gc.setFill(Color.gray(0.2, 0.6));
                gc.fillRect(bx, by, bw, bh);
                gc.setFill(Color.LIMEGREEN);
                gc.fillRect(bx, by, bw * Math.max(0, Math.min(1, o.energy)), bh);

                // optional state marker
                if ("flee".equals(o.state)) {
                    gc.setStroke(Color.ORANGERED);
                    gc.strokeOval(sx - r, sy - r, r*2, r*2);
                }
            }
        }
    }

    public static void main(String[] args) {
        launch(args);
    }

    // simple holder
    static class Organism {
        String id;
        double x,y,size,energy;
        String state;
        String color;
        Organism(String id,double x,double y,double size,double energy,String state,String color){
            this.id=id;this.x=x;this.y=y;this.size=size;this.energy=energy;this.state=state;this.color=color;
        }
    }
}
