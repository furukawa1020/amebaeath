package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strconv"
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
	Dna      []string           `json:"dna_layers"`
	Traits   map[string]float64 `json:"traits"`
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
	births    int64 = 0
	deaths    int64 = 0
	events          = []map[string]interface{}{}
	// runtime tunables
	foodSpawnProb          = 0.15
	reproductionBaseChance = 0.12
	configPath             = "config/world.json"
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
			deaths++
			events = append(events, map[string]interface{}{"type": "death", "organism": o.ID, "at": time.Now().UnixNano()})
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
			// consume
			consumed := foods[eatenIdx]
			o.Energy = math.Min(1.6, o.Energy+consumed.Energy)
			// remove food
			foods = append(foods[:eatenIdx], foods[eatenIdx+1:]...)
			events = append(events, map[string]interface{}{"type": "food_consumed", "organism": o.ID, "food": consumed.ID, "at": time.Now().UnixNano()})
			// reproduction chance
			if o.Energy > 1.1 && rand.Float64() < reproductionBaseChance {
				// inherit dna and mutate
				mutationRate := 0.02
				childDna := mutateDna(o.Dna, mutationRate)
				child := spawnWithDna(childDna, nil)
				births++
				events = append(events, map[string]interface{}{"type": "birth", "parent": o.ID, "child": child.ID, "at": time.Now().UnixNano()})
				// if mutated, add a mutation event
				if !dnaEqual(childDna, o.Dna) {
					events = append(events, map[string]interface{}{"type": "mutation", "organism": child.ID, "dna": childDna, "at": time.Now().UnixNano()})
				}
				o.Energy -= 0.45
			}
		}
	}
	// spawn random food occasionally
	if rand.Float64() < foodSpawnProb {
		spawnFoodAt(rand.Float64()*width, rand.Float64()*height)
	}
}

func spawn(seedTraits interface{}) Organism {
	return spawnWithDna(nil, seedTraits)
}

func spawnWithDna(dna []string, seedTraits interface{}) Organism {
	mu.Lock()
	defer mu.Unlock()
	id := fmt.Sprintf("g_spawn_%d", time.Now().UnixNano())
	if dna == nil || len(dna) == 0 {
		dna = []string{"#88c1ff"}
	}
	traits := map[string]float64{}
	if seedTraits != nil {
		if smap, ok := seedTraits.(map[string]interface{}); ok {
			for k, v := range smap {
				if fv, ok := v.(float64); ok {
					traits[k] = fv
				}
			}
		}
	}
	o := Organism{
		ID:       id,
		Position: map[string]float64{"x": rand.Float64() * width, "y": rand.Float64() * height},
		V:        map[string]float64{"x": 0, "y": 0},
		Size:     8.0 + rand.Float64()*4.0,
		Energy:   0.6 + rand.Float64()*0.9,
		State:    "normal",
		Dna:      dna,
		Traits:   traits,
	}
	organisms = append(organisms, o)
	return o
}

func mutateDna(parent []string, mutationRate float64) []string {
	out := make([]string, 0, len(parent))
	changed := false
	for _, layer := range parent {
		if rand.Float64() < mutationRate {
			out = append(out, mutateColor(layer, 0.08))
			changed = true
		} else {
			out = append(out, layer)
		}
	}
	if !changed && rand.Float64() < (mutationRate/3.0) {
		out = append(out, mutateColor("#88c1ff", 0.15))
		changed = true
	}
	return out
}

func mutateColor(hex string, magnitude float64) string {
	h := hex
	if len(h) > 0 && h[0] == '#' {
		h = h[1:]
	}
	if len(h) == 3 {
		h = string(h[0]) + string(h[0]) + string(h[1]) + string(h[1]) + string(h[2]) + string(h[2])
	}
	var val int64
	if n, err := fmt.Sscanf(h, "%x", &val); n == 1 && err == nil {
		// parsed
	}
	// fallback: attempt parse via Atoi base 16
	parsed, err := strconv.ParseInt(h, 16, 32)
	if err != nil {
		return hex
	}
	v := int(parsed)
	r := (v >> 16) & 0xFF
	g := (v >> 8) & 0xFF
	b := v & 0xFF
	change := int(magnitude * 255)
	r = clampInt(r+int((rand.Float64()-0.5)*2*float64(change)), 0, 255)
	g = clampInt(g+int((rand.Float64()-0.5)*2*float64(change)), 0, 255)
	b = clampInt(b+int((rand.Float64()-0.5)*2*float64(change)), 0, 255)
	return fmt.Sprintf("#%02x%02x%02x", r, g, b)
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func dnaEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
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
	births++
	events = append(events, map[string]interface{}{"type": "birth", "child": o.ID, "at": time.Now().UnixNano()})
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
	http.HandleFunc("/config", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		if r.Method == "GET" {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"foodSpawnProb": 0.15, "reproductionBaseChance": 0.12, "worldWidth": width, "worldHeight": height})
			return
		}
		if r.Method == "POST" {
			var body map[string]float64
			_ = json.NewDecoder(r.Body).Decode(&body)
			if v, ok := body["foodSpawnProb"]; ok { /* not persisted: if needed add variable */
				_ = v
			}
			if v, ok := body["reproductionBaseChance"]; ok {
				_ = v
			}
			w.WriteHeader(200)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
			return
		}
		w.WriteHeader(405)
	})
	http.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"foodSpawnProb": foodSpawnProb, "reproductionBaseChance": reproductionBaseChance, "worldWidth": width, "worldHeight": height})
		avgE := 0.0
		if len(organisms) > 0 {
			s := 0.0
			for _, o := range organisms {
				s += o.Energy
			}
			avgE = s / float64(len(organisms))
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"tick": tick, "population": len(organisms), "avgEnergy": avgE, "births": births, "deaths": deaths})
	})

		// Prometheus-compatible metrics
		http.HandleFunc("/metrics/prometheus", func(w http.ResponseWriter, r *http.Request) {
			mu.Lock()
			defer mu.Unlock()
			w.Header().Set("Content-Type", "text/plain; version=0.0.4")
			avgE := 0.0
			if len(organisms) > 0 {
				s := 0.0
				for _, o := range organisms {
					s += o.Energy
				}
				avgE = s / float64(len(organisms))
			}
			fmt.Fprintf(w, "# HELP ameba_population Current population\n")
			fmt.Fprintf(w, "# TYPE ameba_population gauge\n")
			fmt.Fprintf(w, "ameba_population %d\n", len(organisms))
			fmt.Fprintf(w, "# HELP ameba_avg_energy Average organism energy\n")
			fmt.Fprintf(w, "# TYPE ameba_avg_energy gauge\n")
			fmt.Fprintf(w, "ameba_avg_energy %f\n", avgE)
			fmt.Fprintf(w, "# HELP ameba_births Total births\n")
			fmt.Fprintf(w, "# TYPE ameba_births counter\n")
			fmt.Fprintf(w, "ameba_births %d\n", births)
			fmt.Fprintf(w, "# HELP ameba_deaths Total deaths\n")
			fmt.Fprintf(w, "# TYPE ameba_deaths counter\n")
			fmt.Fprintf(w, "ameba_deaths %d\n", deaths)
			fmt.Fprintf(w, "# HELP ameba_tick Current tick\n")
			fmt.Fprintf(w, "# TYPE ameba_tick gauge\n")
			fmt.Fprintf(w, "ameba_tick %d\n", tick)
		})
	http.HandleFunc("/events", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(events)
	})
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "sim": "go-sim"})
	})

	log.Println("Go sim listening on :5001")
	log.Fatal(http.ListenAndServe(":5001", nil))
}
