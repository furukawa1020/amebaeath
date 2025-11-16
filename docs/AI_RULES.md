# AI ルール詳細（MVP 実装向け）

このファイルは要件定義書に記載した8つの AI ルールを、実装しやすい数式・疑似コード・調整パラメータとともにまとめたドキュメントです。

共通定義:
- dt: 更新間隔（秒）
- clamp(v, a, b)
- queryNeighbors(pos, radius): 近傍検索（quadtree 推奨）

パラメータ（初期値）:
- ENERGY_DECAY_PER_SEC = 0.01
- MAX_SPEED = 2.0
- FOOD_ATTRACTION_FACTOR = 0.5
- COHESION_FACTOR = 0.07
- ESCAPE_FACTOR = 0.15
- PREDATION_CONTACT_TIME = 1.0
- EVOLVE_THRESHOLD = 0.6

各ルールの実装概要:

1) エネルギー消費
```
org.energy = clamp(org.energy - ENERGY_DECAY_PER_SEC * dt, 0, 1)
if org.energy < 0.1: org.state = 'sleep'
elif org.energy < 0.35: org.state = 'low_energy'
else: org.state = 'normal'
```

2) 採食（food）
- foodMap を用意し、細胞グリッド毎に food value を格納
- 食物勾配の大きい方向へ力を加える
```
foodVec = sampleFoodGradient(pos)
org.velocity += normalize(foodVec) * FOOD_ATTRACTION_FACTOR * dt
if food_at(pos) > FEED_THRESHOLD:
  org.size += 0.02
  org.energy = 1.0
  reduce food at cell
```

3) 群れ（cohesion）
```
neighbors = queryNeighbors(pos, NEIGHBOR_RADIUS)
if neighbors:
  desired = avg(neighbors.pos) - pos
  org.velocity += normalize(desired) * org.traits.cohesion * COHESION_FACTOR * dt
```

4) 逃走（escape）
```
threats = neighbors.filter(n => n.size > org.size * 1.1)
if threats:
  threatVec = sum(org.pos - t.pos)
  org.velocity += normalize(threatVec) * org.traits.escape * ESCAPE_FACTOR * dt
  org.state = 'alert'
```

5) 捕食（predation）
- 接触距離 = (org.size + other.size) * HITBOX_SCALE
- 接触時間が PREDATION_CONTACT_TIME を超えたら吸収
吸収時:
```
predator.dna_layers.push(...victim.dna_layers)
predator.size += victim.size * 0.6
remove victim
emit predation event
```

6) 温度適応
```
heat = sampleTemperature(pos)
pref = org.traits.warmth_preference
fit = 1 - abs(heat - pref)
if fit > 0.7:
  org.velocity *= 0.6
  org.energy += 0.001 * dt
```

7) 進化
- eval_window（秒）内で周囲 env と traits の乖離を算出
- divergence > EVOLVE_THRESHOLD で mutate
mutate: shape -> behavior -> eye

8) 睡眠
- sleep: 移動低下、ヒットボックス縮小、低消費

注意点:
- まずはサーバ側で authoritative に更新、その差分をクライアントへ配信。
- 近傍検索は Quadtree/Spatial Hash を推奨。実装は `lib/quadtree.js` に分離すると良い。
