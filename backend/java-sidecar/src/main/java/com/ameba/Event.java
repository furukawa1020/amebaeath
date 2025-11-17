package com.ameba;

public class Event {
    public String type;
    public String id;
    public String predatorId;
    public String victimId;
    public String organismId;
    public long at;

    public Event() {}

    public static Event predation(String predatorId, String victimId) {
        Event e = new Event();
        e.type = "predation";
        e.predatorId = predatorId;
        e.victimId = victimId;
        e.at = System.currentTimeMillis();
        return e;
    }

    public static Event evolve(String id) {
        Event e = new Event();
        e.type = "evolve";
        e.organismId = id;
        e.at = System.currentTimeMillis();
        return e;
    }

    public static Event foodConsumed(String organismId, String foodId) {
        Event e = new Event();
        e.type = "food_consumed";
        e.organismId = organismId;
        e.victimId = foodId;
        e.at = System.currentTimeMillis();
        return e;
    }

    public static Event birth(String parentId, String childId) {
        Event e = new Event();
        e.type = "birth";
        e.predatorId = parentId; // reusing field for parent
        e.organismId = childId;  // child
        e.at = System.currentTimeMillis();
        return e;
    }

    public static Event mutation(String organismId, String detail) {
        Event e = new Event();
        e.type = "mutation";
        e.organismId = organismId;
        e.victimId = detail; // carry mutation detail in victimId field (string)
        e.at = System.currentTimeMillis();
        return e;
    }
}
