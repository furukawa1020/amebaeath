package com.ameba;

import io.javalin.Javalin;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class SidecarApp {
    public static void main(String[] args) {
        int port = 4001;
        if (System.getenv().containsKey("SIDE_CAR_PORT")) {
            try { port = Integer.parseInt(System.getenv("SIDE_CAR_PORT")); } catch (Exception ignored) {}
        }
    // create Javalin app (use default JSON behavior; individual endpoints set JSON responses)
    Javalin app = Javalin.create();
        ObjectMapper mapper = new ObjectMapper();

        // create a world and start ticking
        World world = new World(2000, 2000, 24);
        ScheduledExecutorService svc = Executors.newSingleThreadScheduledExecutor();
        svc.scheduleAtFixedRate(() -> {
            try { world.step(); } catch (Exception e) { e.printStackTrace(); }
        }, 200, 200, TimeUnit.MILLISECONDS);

        // state endpoint returns JSON similar to frontend expectation
        app.get("/state", ctx -> {
            ObjectNode root = mapper.createObjectNode();
            root.put("tick", world.getTick());
            ArrayNode arr = mapper.createArrayNode();
            for (Organism o : world.snapshotOrganisms()) {
                ObjectNode oNode = mapper.createObjectNode();
                oNode.put("id", o.id);
                ObjectNode pos = mapper.createObjectNode();
                pos.put("x", o.x);
                pos.put("y", o.y);
                oNode.set("position", pos);
                oNode.put("size", o.size);
                oNode.put("energy", o.energy);
                ArrayNode dna = mapper.createArrayNode();
                if (o.dna_layers != null) {
                    for (String d : o.dna_layers) dna.add(d);
                }
                oNode.set("dna_layers", dna);
                oNode.put("state", o.state == null ? "normal" : o.state);
                arr.add(oNode);
            }
            // include simple world maps (food list)
            ArrayNode foods = mapper.createArrayNode();
            for (Food f : world.getFoodsSnapshot()) {
                ObjectNode fn = mapper.createObjectNode(); fn.put("id", f.id); fn.put("x", f.x); fn.put("y", f.y); fn.put("energy", f.energy); foods.add(fn);
            }
            ObjectNode maps = mapper.createObjectNode(); maps.set("foods", foods);
            root.set("maps", maps);
            root.set("organisms", arr);
            ctx.result(mapper.writeValueAsString(root));
        });

        // spawn via Java sidecar
        app.post("/spawn", ctx -> {
            Map seed = null;
            try { seed = mapper.readValue(ctx.body(), Map.class); } catch (Exception ignored) {}
            Organism o = world.spawn(seed);
            ObjectNode res = mapper.createObjectNode();
            res.set("organism", mapper.valueToTree(o));
            ctx.status(201).result(mapper.writeValueAsString(res));
        });

        // touch endpoint
        app.post("/touch", ctx -> {
            try {
                Map body = mapper.readValue(ctx.body(), Map.class);
                double x = ((Number)body.getOrDefault("x", 0)).doubleValue();
                double y = ((Number)body.getOrDefault("y", 0)).doubleValue();
                double amplitude = ((Number)body.getOrDefault("amplitude", 0.6)).doubleValue();
                double sigma = ((Number)body.getOrDefault("sigma", 30)).doubleValue();
                Map<String,Object> touch = world.touch(x,y,amplitude,sigma);
                ctx.json(touch);
            } catch (Exception e) {
                ctx.status(400).json(mapper.createObjectNode().put("error", "invalid body"));
            }
        });

        // health
        app.get("/health", ctx -> ctx.json(mapper.createObjectNode().put("ok", true).put("sim", "java-sidecar")));

        app.start(port);
        System.out.println("Java sidecar started on port " + port);
    }
}
