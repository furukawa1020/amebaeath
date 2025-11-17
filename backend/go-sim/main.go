package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

type Organism struct {
	ID       string             `json:"id"`
	Position map[string]float64 `json:"position"`
	V        map[string]float64 `json:"velocity"`
	Size     float64            `json:"size"`
	Energy   float64            `json:"energy"`
	State    string             `json:"state"`
}

type Food struct {
	ID     string  `json:"id"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Energy float64 `json:"energy"`
}

var (
	mu        sync.Mutex
	organisms       = []Organism{}
	foods           = []Food{}
	tick      int64 = 0
	width           = 2000.0
	height          = 2000.0
)

func stepWorld() {
	mu.Lock()
	defer mu.Unlock()
	tick++
	// simple random walk with food consumption
	for i := range organisms {
		o := &organisms[i]
		if o.State == "dead" {
			continue
		}
		// random small velocity
		vx := (rand.Float64() - 0.5) * 1.0
		vy := (rand.Float64() - 0.5) * 1.0
		o.Position["x"] += vx
		o.Position["y"] += vy
		o.V["x"] = vx
		o.V["y"] = vy
		// clamp
		if o.Position["x"] < 0 {
			o.Position["x"] = 0
		}
		if o.Position["y"] < 0 {
			o.Position["y"] = 0
		}
		if o.Position["x"] > width {
			o.Position["x"] = width
		}
		if o.Position["y"] > height {
			o.Position["y"] = height
		}
		// energy drain
		o.Energy -= 0.002 + 0.001*(math.Abs(vx)+math.Abs(vy))
		if o.Energy <= 0 {
			o.Energy = 0
			o.State = "dead"
		}
		// check food
		eatenIdx := -1
		for j, f := range foods {
			dx := f.X - o.Position["x"]
			dy := f.Y - o.Position["y"]
			if dx*dx+dy*dy < (10.0+o.Size)*(10.0+o.Size) {
				eatenIdx = j
				break
			}
		}
		if eatenIdx >= 0 {
			o.Energy = math.Min(1.5, o.Energy+foods[eatenIdx].Energy)
			// remove food
			foods = append(foods[:eatenIdx], foods[eatenIdx+1:]...)
			// reproduction chance
			if o.Energy > 1.1 && rand.Float64() < 0.06 {
				spawn(nil)
				o.Energy -= 0.4
			}
		}
	}
	// spawn random food occasionally
	if rand.Float64() < 0.15 {
		spawnFoodAt(rand.Float64()*width, rand.Float64()*height)
	}
}

func spawn(seedTraits interface{}) Organism {
	mu.Lock()
	defer mu.Unlock()
	id := fmt.Sprintf("g_spawn_%d", time.Now().UnixNano())
	o := Organism{
		ID:       id,
		Position: map[string]float64{"x": rand.Float64() * width, "y": rand.Float64() * height},
		V:        map[string]float64{"x": 0, "y": 0},
		Size:     8.0 + rand.Float64()*4.0,
		Energy:   0.6 + rand.Float64()*0.9,
		State:    "normal",
	}
	organisms = append(organisms, o)
	return o
}

func spawnFoodAt(x, y float64) Food {
	mu.Lock()
	defer mu.Unlock()
	f := Food{ID: fmt.Sprintf("f_%d", time.Now().UnixNano()), X: x, Y: y, Energy: 0.4 + rand.Float64()*0.8}
	foods = append(foods, f)
	return f
}

func stateHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	res := map[string]interface{}{"tick": tick}
	resOrgs := []Organism{}
	for _, o := range organisms {
		resOrgs = append(resOrgs, o)
	}
	res["organisms"] = resOrgs
	maps := map[string]interface{}{"foods": foods}
	res["maps"] = maps
	_ = json.NewEncoder(w).Encode(res)
}

func spawnHandler(w http.ResponseWriter, r *http.Request) {
	var body map[string]interface{}
	_ = json.NewDecoder(r.Body).Decode(&body)
	o := spawn(body["seedTraits"])
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"organism": o})
}

func touchHandler(w http.ResponseWriter, r *http.Request) {
	var body map[string]float64
	_ = json.NewDecoder(r.Body).Decode(&body)
	x := body["x"]
	y := body["y"]
	// create a simple touch event -- here we just spawn a few food items nearby
	for i := 0; i < 3; i++ {
		nx := x + (rand.Float64()-0.5)*60
		ny := y + (rand.Float64()-0.5)*60
		spawnFoodAt(nx, ny)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "x": x, "y": y})
}

func main() {
	rand.Seed(time.Now().UnixNano())
	// initial population
	for i := 0; i < 20; i++ {
		spawn(nil)
	}
	for i := 0; i < 12; i++ {
		spawnFoodAt(rand.Float64()*width, rand.Float64()*height)
	}
	// start tick loop
	go func() {
		ticker := time.NewTicker(200 * time.Millisecond)
		for range ticker.C {
			stepWorld()
		}
	}()

	http.HandleFunc("/state", stateHandler)
	http.HandleFunc("/spawn", spawnHandler)
	http.HandleFunc("/touch", touchHandler)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "sim": "go-sim"})
	})

	log.Println("Go sim listening on :5001")
	log.Fatal(http.ListenAndServe(":5001", nil))
}
