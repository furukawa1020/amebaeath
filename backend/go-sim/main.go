package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
)

type Org struct {
	ID       string             `json:"id"`
	Position map[string]float64 `json:"position"`
	Size     float64            `json:"size"`
	Energy   float64            `json:"energy"`
}

func stateHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	res := map[string]interface{}{"tick": 0}
	orgs := []Org{}
	for i := 0; i < 8; i++ {
		orgs = append(orgs, Org{ID: "g" + string(i+65), Position: map[string]float64{"x": rand.Float64() * 2000, "y": rand.Float64() * 2000}, Size: 1.0 + rand.Float64(), Energy: rand.Float64()})
	}
	res["organisms"] = orgs
	_ = json.NewEncoder(w).Encode(res)
}

func main() {
	http.HandleFunc("/state", stateHandler)
	log.Println("Go sim listening on :5001")
	log.Fatal(http.ListenAndServe(":5001", nil))
}
