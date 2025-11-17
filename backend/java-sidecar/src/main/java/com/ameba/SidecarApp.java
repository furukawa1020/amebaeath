package com.ameba;

import io.javalin.Javalin;
import io.javalin.http.Handler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class SidecarApp {
    public static void main(String[] args) {
        int port = 4001;
        if (System.getenv().containsKey("SIDE_CAR_PORT")) {
            try { port = Integer.parseInt(System.getenv("SIDE_CAR_PORT")); } catch (Exception ignored) {}
        }
        Javalin app = Javalin.create(config -> config.defaultContentType = "application/json");
        ObjectMapper mapper = new ObjectMapper();

        // simple state endpoint - returns a small sample or placeholder
        app.get("/state", ctx -> {
            ObjectNode root = mapper.createObjectNode();
            root.put("tick", 0);
            ArrayNode arr = mapper.createArrayNode();
            for (int i = 0; i < 10; i++) {
                ObjectNode o = mapper.createObjectNode();
                o.put("id", "s"+i);
                ObjectNode pos = mapper.createObjectNode();
                pos.put("x", Math.random() * 2000);
                pos.put("y", Math.random() * 2000);
                o.set("position", pos);
                o.put("size", 0.8 + Math.random()*0.8);
                o.put("energy", Math.random());
                ArrayNode dna = mapper.createArrayNode(); dna.add("#88c1ff");
                o.set("dna_layers", dna);
                o.put("state", "normal");
                arr.add(o);
            }
            root.set("organisms", arr);
            ctx.result(root.toString());
        });

        // health
        app.get("/health", ctx -> ctx.json(mapper.createObjectNode().put("ok", true)));

        app.start(port);
        System.out.println("Java sidecar started on port " + port);
    }
}
