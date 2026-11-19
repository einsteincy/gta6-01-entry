import { TRAFFIC, WANTED, CITY } from './config.js';
const CAR_COLORS = [
  0xc0392b, 0x2e86c1, 0xe67e22, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xecf0f1,
  0x2c3e50, 0x16a085, 0xd35400, 0x95a5a6, 0x5d6d7e, 0xca6f1e, 0x7fb3d5,
];
const SHIRT_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22,
  0xf5f6fa, 0x34495e, 0xfd79a8, 0x00cec9, 0x6c5ce7,
];
const SKIN_COLORS = [0xe8b88a, 0xc98d64, 0x8a5a3b, 0xf0c8a0];
const PANTS_COLORS = [0x2c3e50, 0x34495e, 0x5d6d7e, 0x1a1a2e, 0x6b4f2a];
const SIDEWALK_OFF = CITY.roadW / 2 + CITY.sidewalk / 2; 
const STREET_MIN = -220;
const STREET_MAX = 220;
function angleForDir(dx, dz) {
  return Math.atan2(dx, dz);
}
function turnToward(cur, target, maxStep) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (d > maxStep) d = maxStep;
  else if (d < -maxStep) d = -maxStep;
  return cur + d;
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
export function createTraffic(G) {
  const THREE = G.THREE;
  const rng = typeof G.rng === 'function' ? G.rng : Math.random;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const range = (lo, hi) => lo + rng() * (hi - lo);
  let graph = null; 
  let myCars = []; 
  let myPeds = []; 
  const geoLeg = new THREE.BoxGeometry(0.18, 0.8, 0.2);
  geoLeg.translate(0, -0.4, 0); 
  const geoArm = new THREE.BoxGeometry(0.13, 0.62, 0.16);
  geoArm.translate(0, -0.31, 0); 
  const geoTorso = new THREE.BoxGeometry(0.5, 0.62, 0.28);
  const geoHead = new THREE.BoxGeometry(0.3, 0.3, 0.28);
  function readGraph() {
    const g = G.city?.roads?.graph;
    if (g && Array.isArray(g.nodes) && g.nodes.length > 1
      && Array.isArray(g.edges) && g.edges.length > 0) {
      const adj = g.nodes.map(() => []);
      for (const e of g.edges) {
        const a = e[0];
        const b = e[1];
        if (a === b || a < 0 || b < 0 || a >= g.nodes.length || b >= g.nodes.length) continue;
        adj[a].push(b);
        adj[b].push(a);
      }
      return { nodes: g.nodes, adj };
    }
    const centres = [];
    for (let c = STREET_MIN; c <= STREET_MAX; c += CITY.pitch) centres.push(c);
    const nodes = [];
    const index = new Map();
    for (const x of centres) {
      for (const z of centres) {
        index.set(`${x},${z}`, nodes.length);
        nodes.push({ x, z });
      }
    }
    const adj = nodes.map(() => []);
    const link = (a, b) => { adj[a].push(b); adj[b].push(a); };
    for (const x of centres) {
      for (const z of centres) {
        const i = index.get(`${x},${z}`);
        if (x + CITY.pitch <= STREET_MAX) link(i, index.get(`${x + CITY.pitch},${z}`));
        if (z + CITY.pitch <= STREET_MAX) link(i, index.get(`${x},${z + CITY.pitch}`));
      }
    }
    return { nodes, adj };
  }
  function isEdgeNode(i) {
    const n = graph.nodes[i];
    return Math.abs(n.x) >= STREET_MAX - 1 || Math.abs(n.z) >= STREET_MAX - 1;
  }
  function randomNode(edgeOnly) {
    for (let tries = 0; tries < 24; tries += 1) {
      const i = Math.floor(rng() * graph.nodes.length);
      if (!edgeOnly || isEdgeNode(i)) return i;
    }
    for (let i = 0; i < graph.nodes.length; i += 1) {
      if (!edgeOnly || isEdgeNode(i)) return i;
    }
    return 0;
  }
  function randomRoute(start) {
    const route = [start];
    let prev = -1;
    const steps = 6 + Math.floor(rng() * 7); 
    for (let s = 0; s < steps; s += 1) {
      const cur = route[route.length - 1];
      const options = graph.adj[cur].filter((n) => n !== prev);
      const next = options.length > 0 ? pick(options) : pick(graph.adj[cur]);
      if (next === undefined) break;
      route.push(next);
      prev = cur;
      if (route.length >= 5 && isEdgeNode(next)) break; 
    }
    return route;
  }
  function buildFallbackCar(x, z, angle, color) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.4), bodyMat);
    body.position.y = 0.55;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.55, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x2a4a66 }),
    );
    cabin.position.set(0, 1.15, 0.2);
    group.add(body, cabin);
    group.position.set(x, 0, z);
    group.rotation.y = angle;
    G.scene.add(group);
    const car = {
      group,
      pos: group.position,
      angle,
      speed: 0,
      color,
      kind: 'traffic',
      hp: 100,
      driver: 'traffic',
    };
    G.cars.push(car);
    return car;
  }
  function spawnTrafficCar(atEdge) {
    if (!graph || graph.nodes.length < 2) return null;
    const route = randomRoute(randomNode(atEdge));
    if (route.length < 2) return null;
    const from = graph.nodes[route[0]];
    const to = graph.nodes[route[1]];
    const angle = angleForDir(to.x - from.x, to.z - from.z);
    const color = pick(CAR_COLORS);
    const spawn = G.api?.vehicles?.spawnCar;
    let car = null;
    if (typeof spawn === 'function') {
      try {
        car = spawn(from.x, from.z, angle, color, 'traffic');
      } catch {
        car = null;
      }
    }
    if (!car || !car.group || !car.pos) car = buildFallbackCar(from.x, from.z, angle, color);
    car.speed = 0;
    car.driver = 'traffic';
    const rec = { car, route, leg: 0, cruise: range(TRAFFIC.speedMin, TRAFFIC.speedMax) };
    myCars.push(rec);
    return rec;
  }
  function removeCar(rec) {
    const i = myCars.indexOf(rec);
    if (i >= 0) myCars.splice(i, 1);
    const car = rec.car;
    if (car.kind !== 'traffic') return; 
    const gi = G.cars.indexOf(car);
    if (gi >= 0) G.cars.splice(gi, 1);
    if (car.group) G.scene.remove(car.group);
  }
  function carAhead(car) {
    const fx = Math.sin(car.angle);
    const fz = Math.cos(car.angle);
    for (const other of G.cars) {
      if (other === car) continue;
      const dx = other.pos.x - car.pos.x;
      const dz = other.pos.z - car.pos.z;
      const along = dx * fx + dz * fz;
      if (along <= 0 || along > 8) continue;
      const lateral = Math.abs(-dx * fz + dz * fx);
      if (lateral < 2.2) return true;
    }
    return false;
  }
  function updateCar(rec, dt) {
    const car = rec.car;
    const target = graph.nodes[rec.route[rec.leg + 1]];
    if (!target) return;
    const dx = target.x - car.pos.x;
    const dz = target.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2.5) {
      rec.leg += 1;
      if (rec.leg >= rec.route.length - 1) {
        removeCar(rec);
        spawnTrafficCar(true);
      }
      return;
    }
    car.angle = turnToward(car.angle, angleForDir(dx, dz), 2.4 * dt);
    let targetSpeed = rec.cruise;
    if (dist < 12) targetSpeed = Math.max(4, rec.cruise * 0.45);
    if (carAhead(car)) targetSpeed = 0;
    const rate = targetSpeed < car.speed ? 14 : 6; 
    car.speed += clamp(targetSpeed - car.speed, -rate * dt, rate * dt);
    car.pos.x += Math.sin(car.angle) * car.speed * dt;
    car.pos.z += Math.cos(car.angle) * car.speed * dt;
    if (car.group) {
      car.group.position.set(car.pos.x, 0, car.pos.z);
      car.group.rotation.y = car.angle;
    }
  }
  function buildPed() {
    const shirt = pick(SHIRT_COLORS);
    const skin = pick(SKIN_COLORS);
    const pants = pick(PANTS_COLORS);
    const matShirt = new THREE.MeshLambertMaterial({ color: shirt, transparent: true });
    const matSkin = new THREE.MeshLambertMaterial({ color: skin, transparent: true });
    const matPants = new THREE.MeshLambertMaterial({ color: pants, transparent: true });
    const group = new THREE.Group();
    const legL = new THREE.Mesh(geoLeg, matPants);
    legL.position.set(-0.12, 0.85, 0);
    const legR = new THREE.Mesh(geoLeg, matPants);
    legR.position.set(0.12, 0.85, 0);
    const torso = new THREE.Mesh(geoTorso, matShirt);
    torso.position.y = 1.16;
    const armL = new THREE.Mesh(geoArm, matShirt);
    armL.position.set(-0.32, 1.42, 0);
    const armR = new THREE.Mesh(geoArm, matShirt);
    armR.position.set(0.32, 1.42, 0);
    const head = new THREE.Mesh(geoHead, matSkin);
    head.position.y = 1.62;
    group.add(legL, legR, torso, armL, armR, head);
    return { group, legL, legR, armL, armR, mats: [matShirt, matSkin, matPants] };
  }
  function sidewalkPoint(a, b, side, t) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = (-dz / len) * side * SIDEWALK_OFF;
    const pz = (dx / len) * side * SIDEWALK_OFF;
    return { x: a.x + dx * t + px, z: a.z + dz * t + pz };
  }
  function spawnPed() {
    if (!graph || graph.nodes.length < 2) return null;
    const from = randomNode(false);
    const neighbours = graph.adj[from];
    if (!neighbours || neighbours.length === 0) return null;
    const to = pick(neighbours);
    const side = rng() < 0.5 ? -1 : 1;
    const t = rng();
    const a = graph.nodes[from];
    const b = graph.nodes[to];
    const p = sidewalkPoint(a, b, side, t);
    const built = buildPed();
    built.group.position.set(p.x, 0, p.z);
    built.group.rotation.y = angleForDir(b.x - a.x, b.z - a.z);
    G.scene.add(built.group);
    const ped = {
      group: built.group,
      pos: built.group.position,
      angle: built.group.rotation.y,
      speed: TRAFFIC.pedSpeed * range(0.85, 1.2),
      state: 'walking',
    };
    G.peds.push(ped);
    const rec = {
      ped, from, to, side,
      phase: rng() * Math.PI * 2,
      downT: 0,
      turning: false,
      target: sidewalkPoint(a, b, side, 1), 
      legL: built.legL, legR: built.legR,
      armL: built.armL, armR: built.armR,
      mats: built.mats,
    };
    myPeds.push(rec);
    return rec;
  }
  function removePed(rec) {
    const i = myPeds.indexOf(rec);
    if (i >= 0) myPeds.splice(i, 1);
    const gi = G.peds.indexOf(rec.ped);
    if (gi >= 0) G.peds.splice(gi, 1);
    if (rec.ped.group) G.scene.remove(rec.ped.group);
  }
  function knockDown(rec) {
    const ped = rec.ped;
    ped.state = 'down';
    ped.speed = 0;
    rec.downT = 0;
    G.addHeat(WANTED.hitPed, 'hit a pedestrian');
    G.api.audio?.sfx('crash');
  }
  function advancePed(rec) {
    if (rec.turning) {
      rec.turning = false;
      const a = graph.nodes[rec.from];
      const b = graph.nodes[rec.to];
      rec.target = sidewalkPoint(a, b, rec.side, 1);
      return;
    }
    const corner = graph.nodes[rec.to];
    const prev = graph.nodes[rec.from];
    const d1 = { x: corner.x - prev.x, z: corner.z - prev.z };
    const len1 = Math.hypot(d1.x, d1.z) || 1;
    d1.x /= len1;
    d1.z /= len1;
    const p1 = { x: -d1.z, z: d1.x };
    const options = graph.adj[rec.to].filter((n) => n !== rec.from);
    const next = options.length > 0 ? pick(options) : rec.from;
    const nb = graph.nodes[next];
    const d2 = { x: nb.x - corner.x, z: nb.z - corner.z };
    const len2 = Math.hypot(d2.x, d2.z) || 1;
    d2.x /= len2;
    d2.z /= len2;
    const p2 = { x: -d2.z, z: d2.x };
    const straight = d2.x === d1.x && d2.z === d1.z;
    rec.from = rec.to;
    rec.to = next;
    if (straight) {
      rec.target = sidewalkPoint(corner, nb, rec.side, 1);
    } else {
      const s2 = Math.sign(p2.x * d1.x + p2.z * d1.z) || 1;
      const sideOld = rec.side;
      rec.side = s2;
      rec.turning = true;
      rec.target = {
        x: corner.x + p1.x * sideOld * SIDEWALK_OFF + p2.x * s2 * SIDEWALK_OFF,
        z: corner.z + p1.z * sideOld * SIDEWALK_OFF + p2.z * s2 * SIDEWALK_OFF,
      };
    }
  }
  function updatePed(rec, dt) {
    const ped = rec.ped;
    if (ped.state === 'down') {
      rec.downT += dt;
      const k = Math.min(1, rec.downT * 4);
      ped.group.rotation.x = -k * Math.PI * 0.5;
      const opacity = rec.downT < 1.4 ? 1 : Math.max(0, 1 - (rec.downT - 1.4) / 0.8);
      for (const m of rec.mats) m.opacity = opacity;
      if (rec.downT > 2.3) {
        removePed(rec);
        spawnPed();
      }
      return;
    }
    const dx = rec.target.x - ped.pos.x;
    const dz = rec.target.z - ped.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.6) {
      advancePed(rec);
      return;
    }
    const heading = angleForDir(dx, dz);
    ped.angle = turnToward(ped.angle, heading, 6 * dt);
    ped.pos.x += Math.sin(ped.angle) * ped.speed * dt;
    ped.pos.z += Math.cos(ped.angle) * ped.speed * dt;
    ped.group.position.set(ped.pos.x, 0, ped.pos.z);
    ped.group.rotation.y = ped.angle;
    rec.phase += ped.speed * dt * 2.4;
    const swing = Math.sin(rec.phase) * 0.45;
    rec.legL.rotation.x = swing;
    rec.legR.rotation.x = -swing;
    rec.armL.rotation.x = -swing * 0.6;
    rec.armR.rotation.x = swing * 0.6;
  }
  function checkPedHits() {
    if (G.screen !== 'playing') return;
    const pc = G.player?.car;
    if (!pc || Math.abs(pc.speed) <= 6) return;
    for (const rec of myPeds) {
      if (rec.ped.state !== 'walking') continue;
      const dx = rec.ped.pos.x - pc.pos.x;
      const dz = rec.ped.pos.z - pc.pos.z;
      if (dx * dx + dz * dz < 2.4 * 2.4) knockDown(rec);
    }
  }
  function reset() {
    for (const rec of [...myCars]) removeCar(rec);
    for (const rec of [...myPeds]) removePed(rec);
    myCars = [];
    myPeds = [];
    graph = readGraph();
    for (let i = 0; i < TRAFFIC.cars; i += 1) {
      if (!spawnTrafficCar(false)) break;
    }
    for (let i = 0; i < TRAFFIC.peds; i += 1) {
      if (!spawnPed()) break;
    }
  }
  function update(dt) {
    if (!graph) graph = readGraph();
    if (!graph) return;
    myCars = myCars.filter((rec) => G.cars.includes(rec.car) && rec.car.kind === 'traffic');
    myPeds = myPeds.filter((rec) => G.peds.includes(rec.ped));
    for (const rec of [...myCars]) updateCar(rec, dt);
    for (const rec of [...myPeds]) updatePed(rec, dt);
    checkPedHits();
    let guard = 0;
    while (myCars.length < TRAFFIC.cars && guard < 8) {
      if (!spawnTrafficCar(true)) break;
      guard += 1;
    }
    guard = 0;
    while (myPeds.length < TRAFFIC.peds && guard < 8) {
      if (!spawnPed()) break;
      guard += 1;
    }
  }
  reset(); 
  return { update, reset };
}
