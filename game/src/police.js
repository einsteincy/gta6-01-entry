import { WANTED, CITY, PALETTE } from './config.js';
export function createPolice(G) {
  const THREE = G.THREE;
  const rng = G.rng ?? Math.random;
  const half = CITY.half - 6;
  let sinceCrime = 0; 
  let removeTimer = 0; 
  let clearing = false; 
  let lastAnnounce = { why: '', at: -99 };
  let lastRamAt = -99; 
  let heli = null; 
  const policeCars = []; 
  const footCops = []; 
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5, metalness: 0.2 });
  const matBlue = new THREE.MeshStandardMaterial({ color: PALETTE.police, roughness: 0.5, metalness: 0.2 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.6, metalness: 0.3 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x16222e, roughness: 0.2, metalness: 0.6 });
  const matNavy = new THREE.MeshStandardMaterial({ color: 0x1e2a4a, roughness: 0.85 });
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.8 });
  const matRed = new THREE.MeshStandardMaterial({ color: 0xd23b2e, roughness: 0.4, emissive: 0x881111, emissiveIntensity: 0.6 });
  const matBlueLight = new THREE.MeshStandardMaterial({
    color: 0x2244ff, roughness: 0.3, emissive: 0x2244ff, emissiveIntensity: 1.6,
  });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12);
  const matBeam = new THREE.MeshBasicMaterial({
    color: 0xfff2cc, transparent: true, opacity: 0.07,
    depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const beamGeo = new THREE.CylinderGeometry(0.5, 6, 40, 12, 1, true);
  function box(mat, sx, sy, sz, x, y, z, parent) {
    const m = new THREE.Mesh(boxGeo, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    m.castShadow = true;
    (parent ?? G.scene).add(m);
    return m;
  }
  function buildPoliceCarFallback(x, z, angle) {
    const group = new THREE.Group();
    box(matWhite, 2.0, 0.55, 4.4, 0, 0.55, 0, group);
    box(matBlue, 2.04, 0.18, 4.42, 0, 0.62, 0, group); 
    box(matGlass, 1.7, 0.5, 2.0, 0, 1.05, -0.2, group);
    box(matRed, 0.5, 0.16, 0.5, -0.5, 1.38, -0.2, group);
    box(matBlueLight, 0.5, 0.16, 0.5, 0.5, 1.38, -0.2, group);
    for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
      const w = new THREE.Mesh(cylGeo, matDark);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.34, wz);
      w.castShadow = true;
      group.add(w);
    }
    group.position.set(x, 0, z);
    group.rotation.y = angle;
    G.scene.add(group);
    const car = {
      group, pos: group.position, angle, speed: 0,
      color: 0xf2f2f2, kind: 'police', hp: 100, driver: 'police',
    };
    G.cars.push(car);
    return car;
  }
  function spawnPoliceCar(x, z, angle, speed = 0) {
    let car = null;
    const spawn = G.api.vehicles?.spawnCar;
    if (typeof spawn === 'function') {
      try {
        car = spawn.call(G.api.vehicles, x, z, angle, 0xf2f2f2, 'police');
      } catch {
        car = null;
      }
    }
    if (!car || !car.group || !car.pos) car = buildPoliceCarFallback(x, z, angle);
    car.kind = 'police';
    car.driver = 'police';
    car.speed = speed;
    car._ramAt = -99;
    if (!policeCars.includes(car)) policeCars.push(car);
    return car;
  }
  function removePoliceCar(car) {
    const i = policeCars.indexOf(car);
    if (i >= 0) policeCars.splice(i, 1);
    const j = G.cars.indexOf(car);
    if (j >= 0) G.cars.splice(j, 1);
    if (car.group) G.scene.remove(car.group);
  }
  function nearestEdgePoint(px, pz) {
    const d = [
      { x: px, z: -half, dist: pz + half }, 
      { x: px, z: half, dist: half - pz }, 
      { x: -half, z: pz, dist: px + half }, 
      { x: half, z: pz, dist: half - px }, 
    ];
    d.sort((a, b) => a.dist - b.dist);
    const p = d[0];
    const c = G.clampToCity ? G.clampToCity(p.x, p.z, 2) : p;
    return { x: c.x, z: c.z };
  }
  function playerForward() {
    const p = G.player;
    if (!p) return { x: 0, z: -1 };
    return { x: Math.sin(p.angle), z: Math.cos(p.angle) };
  }
  function playerVelocity() {
    const p = G.player;
    if (!p) return { x: 0, z: 0 };
    const f = playerForward();
    const sp = p.car ? p.car.speed : p.speed;
    return { x: f.x * sp, z: f.z * sp };
  }
  function distToPlayer(x, z) {
    const p = G.player;
    if (!p) return Infinity;
    const dx = x - p.pos.x;
    const dz = z - p.pos.z;
    return Math.hypot(dx, dz);
  }
  function anyCopNear() {
    for (const car of policeCars) {
      if (distToPlayer(car.pos.x, car.pos.z) < WANTED.copNearDist) return true;
    }
    for (const cop of footCops) {
      if (distToPlayer(cop.pos.x, cop.pos.z) < WANTED.copNearDist) return true;
    }
    return false;
  }
  function announceOnce(why) {
    const now = G.clock?.time ?? 0;
    if (lastAnnounce.why === why && now - lastAnnounce.at < 4) return;
    lastAnnounce = { why, at: now };
    G.announce?.(why);
  }
  function addHeat(n, why) {
    if (!n || n <= 0) return;
    const before = G.wanted;
    G.wanted = Math.min(WANTED.max, (G.wanted ?? 0) + n);
    if (G.wanted > (G.bestWanted ?? 0)) G.bestWanted = G.wanted;
    sinceCrime = 0;
    clearing = false;
    if (why) announceOnce(why);
    if (before < 2 && G.wanted >= 2) G.api.audio?.sfx('siren-on');
  }
  function setWanted(n) {
    const before = G.wanted;
    G.wanted = Math.max(0, Math.min(WANTED.max, n | 0));
    if (G.wanted > (G.bestWanted ?? 0)) G.bestWanted = G.wanted;
    sinceCrime = 0;
    clearing = G.wanted === 0 && (policeCars.length > 0 || footCops.length > 0);
    if (before < 2 && G.wanted >= 2) G.api.audio?.sfx('siren-on');
  }
  function spawnChase(n) {
    const p = G.player;
    if (!p) return;
    const f = playerForward();
    for (let i = 0; i < n; i += 1) {
      const back = 9 + i * 7;
      const side = (i % 2 === 0 ? -1 : 1) * (2 + (i % 3));
      const x = p.pos.x - f.x * back - f.z * side;
      const z = p.pos.z - f.z * back + f.x * side;
      const c = G.clampToCity ? G.clampToCity(x, z, 2) : { x, z };
      spawnPoliceCar(c.x, c.z, p.angle, 24 + rng() * 4);
    }
  }
  function buildCop(x, z) {
    const group = new THREE.Group();
    box(matNavy, 0.55, 0.65, 0.32, 0, 1.05, 0, group); 
    box(matNavy, 0.34, 0.3, 0.3, 0, 1.55, 0, group); 
    box(matDark, 0.4, 0.1, 0.36, 0, 1.74, 0, group); 
    box(matNavy, 0.16, 0.6, 0.18, -0.36, 1.05, 0, group); 
    box(matNavy, 0.16, 0.6, 0.18, 0.36, 1.05, 0, group);
    box(matDark, 0.2, 0.65, 0.22, -0.14, 0.35, 0, group); 
    box(matDark, 0.2, 0.65, 0.22, 0.14, 0.35, 0, group);
    box(matSkin, 0.3, 0.22, 0.06, 0, 1.52, 0.16, group);
    group.position.set(x, 0, z);
    G.scene.add(group);
    const cop = { group, pos: group.position, angle: 0, speed: 5.5, hp: 50, _hitAt: -99 };
    G.cops.push(cop);
    footCops.push(cop);
    return cop;
  }
  function removeFootCop(cop) {
    const i = footCops.indexOf(cop);
    if (i >= 0) footCops.splice(i, 1);
    const j = G.cops.indexOf(cop);
    if (j >= 0) G.cops.splice(j, 1);
    if (cop.group) G.scene.remove(cop.group);
  }
  function spawnHeli() {
    const p = G.player;
    if (!p || heli) return;
    const group = new THREE.Group();
    box(matWhite, 3.4, 1.3, 1.9, 0, 0, 0, group); 
    box(matGlass, 1.9, 0.9, 1.7, 0, 0.35, 0.9, group); 
    box(matBlue, 3.5, 0.2, 1.95, 0, 0.1, 0, group); 
    box(matDark, 2.6, 0.5, 0.6, 0, 0.2, -2.2, group); 
    box(matBlue, 0.3, 1.4, 0.9, 0, 0.5, -3.4, group); 
    box(matDark, 0.18, 0.18, 2.6, -0.8, -0.75, 0, group); 
    box(matDark, 0.18, 0.18, 2.6, 0.8, -0.75, 0, group);
    const rotor = new THREE.Group();
    for (const rotY of [0, Math.PI / 2]) {
      const blade = new THREE.Mesh(boxGeo, matDark);
      blade.scale.set(8.5, 0.08, 0.55);
      blade.rotation.y = rotY;
      blade.castShadow = true;
      rotor.add(blade);
    }
    rotor.position.y = 0.95;
    group.add(rotor);
    const cone = new THREE.Mesh(beamGeo, matBeam);
    cone.position.y = -20;
    group.add(cone);
    const spot = new THREE.SpotLight(0xfff2cc, 80, 130, 0.42, 0.55, 1.1);
    spot.position.set(0, -0.5, 0);
    group.add(spot);
    const target = new THREE.Object3D();
    target.position.set(p.pos.x, 0, p.pos.z);
    G.scene.add(target);
    spot.target = target;
    group.position.set(p.pos.x, 40, p.pos.z);
    G.scene.add(group);
    heli = { group, rotor, spot, target, angle: 0 };
    G.announce?.('Air support is overhead — lose them!');
  }
  function removeHeli() {
    if (!heli) return;
    G.scene.remove(heli.group);
    G.scene.remove(heli.target);
    heli = null;
  }
  function spawnFootCop() {
    const p = G.player;
    if (!p) return;
    const a = rng() * Math.PI * 2;
    const d = 12 + rng() * 8;
    const x = p.pos.x + Math.sin(a) * d;
    const z = p.pos.z + Math.cos(a) * d;
    const c0 = G.clampToCity ? G.clampToCity(x, z, 1) : { x, z };
    const c = G.collideCircle ? G.collideCircle(c0.x, c0.z, 1) : c0;
    buildCop(c.x, c.z);
  }
  function units() {
    const names = ['GULL-1', 'PATROL-2', 'PATROL-3', 'INTERCEPT-4', 'PATROL-5', 'UNIT-6', 'UNIT-7'];
    const st = (d) => (d < 10 ? 'RAMMING' : d < 35 ? 'PURSUIT' : 'SEARCHING');
    const out = [];
    for (let i = 0; i < policeCars.length; i += 1) {
      const d = Math.round(distToPlayer(policeCars[i].pos.x, policeCars[i].pos.z));
      out.push({ name: names[i % names.length], dist: d, state: st(d) });
    }
    for (let i = 0; i < footCops.length; i += 1) {
      const d = Math.round(distToPlayer(footCops[i].pos.x, footCops[i].pos.z));
      out.push({ name: `FOOT-${i + 1}`, dist: d, state: st(d) });
    }
    if (heli) {
      out.push({ name: 'AIR-1', dist: Math.round(distToPlayer(heli.group.position.x, heli.group.position.z)), state: 'SPOTLIGHT' });
    }
    return out;
  }
  function reset() {
    G.wanted = 0;
    sinceCrime = 0;
    clearing = false;
    removeHeli();
    for (const car of [...policeCars]) removePoliceCar(car);
    for (const cop of [...footCops]) removeFootCop(cop);
  }
  function update(dt) {
    const p = G.player;
    if (!p) return;
    const now = G.clock?.time ?? 0;
    for (let i = policeCars.length - 1; i >= 0; i -= 1) {
      if (!G.cars.includes(policeCars[i])) policeCars.splice(i, 1);
    }
    for (let i = footCops.length - 1; i >= 0; i -= 1) {
      if (!G.cops.includes(footCops[i])) footCops.splice(i, 1);
    }
    if (G.wanted > 0) {
      sinceCrime += dt;
      if (sinceCrime >= WANTED.decaySeconds && !anyCopNear() && !heli) {
        G.wanted -= 1;
        sinceCrime = 0;
        if (G.wanted === 0) clearing = true;
      }
    }
    const wantCars = Math.min(G.wanted * WANTED.policeCarsPerStar, WANTED.maxPoliceCars);
    const wantCops = G.wanted >= WANTED.footCopsFrom
      ? Math.min((G.wanted - WANTED.footCopsFrom + 1), WANTED.maxFootCops)
      : 0;
    if (G.wanted > 0) {
      if (policeCars.length < wantCars) {
        const e = nearestEdgePoint(p.pos.x, p.pos.z);
        const angle = Math.atan2(p.pos.x - e.x, p.pos.z - e.z);
        spawnPoliceCar(e.x, e.z, angle, 18);
      }
      if (footCops.length < wantCops) spawnFootCop();
    }
    removeTimer -= dt;
    if (removeTimer <= 0) {
      if (clearing && (policeCars.length > 0 || footCops.length > 0)) {
        if (footCops.length > 0) removeFootCop(footCops[footCops.length - 1]);
        else removePoliceCar(policeCars[policeCars.length - 1]);
        removeTimer = 0.6;
        if (policeCars.length === 0 && footCops.length === 0) clearing = false;
      } else if (G.wanted > 0 && policeCars.length > wantCars) {
        let far = policeCars[0];
        for (const car of policeCars) {
          if (distToPlayer(car.pos.x, car.pos.z) > distToPlayer(far.pos.x, far.pos.z)) far = car;
        }
        removePoliceCar(far);
        removeTimer = 0.5;
      } else if (G.wanted > 0 && footCops.length > wantCops) {
        removeFootCop(footCops[footCops.length - 1]);
        removeTimer = 0.5;
      }
    }
    if (G.wanted >= 4 && !heli) spawnHeli();
    if (G.wanted < 4 && heli) removeHeli();
    if (heli) {
      const dx = p.pos.x - heli.group.position.x;
      const dz = p.pos.z - heli.group.position.z;
      const d = Math.hypot(dx, dz);
      const spd = Math.min(28, d * 1.5);
      if (d > 0.01) {
        heli.group.position.x += (dx / d) * spd * dt;
        heli.group.position.z += (dz / d) * spd * dt;
      }
      heli.group.position.y = 40 + Math.sin(now * 1.3) * 1.2; 
      heli.rotor.rotation.y += dt * 22; 
      if (d > 2) heli.angle = Math.atan2(dx, dz);
      heli.group.rotation.y = heli.angle;
      heli.target.position.set(p.pos.x, 0, p.pos.z); 
    }
    const vel = playerVelocity();
    const leadX = p.pos.x + vel.x * 0.5;
    const leadZ = p.pos.z + vel.z * 0.5;
    for (const car of policeCars) {
      const dx = leadX - car.pos.x;
      const dz = leadZ - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      let diff = desired - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turn = Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      car.angle += turn;
      if (car._cruise === undefined) car._cruise = 30 + rng() * 6;
      const want = Math.abs(diff) > 0.9 ? 16 : car._cruise;
      car.speed += Math.max(-22 * dt, Math.min(14 * dt, want - car.speed));
      car.pos.x += Math.sin(car.angle) * car.speed * dt;
      car.pos.z += Math.cos(car.angle) * car.speed * dt;
      const fixed = G.collideCircle ? G.collideCircle(car.pos.x, car.pos.z, 1.6) : null;
      if (fixed) { car.pos.x = fixed.x; car.pos.z = fixed.z; }
      const clamped = G.clampToCity ? G.clampToCity(car.pos.x, car.pos.z, 2) : null;
      if (clamped) { car.pos.x = clamped.x; car.pos.z = clamped.z; }
      car.group.rotation.y = car.angle;
      car.group.position.set(car.pos.x, 0, car.pos.z);
      if (dist < 3.4 && now - (car._ramAt ?? -99) > 1.5 && now - lastRamAt > 1.0) {
        car._ramAt = now;
        lastRamAt = now;
        G.api.audio?.sfx('crash');
        G.api.hud?.flash?.();
        if (p.car) {
          p.car.hp = (p.car.hp ?? 100) - (G.armor ? 2 : 4);
        } else {
          p.health = Math.max(0, (p.health ?? 100) - (G.armor ? 2.5 : 5));
          const sx = p.pos.x - car.pos.x;
          const sz = p.pos.z - car.pos.z;
          const sl = Math.hypot(sx, sz) || 1;
          const shoved = G.collideCircle
            ? G.collideCircle(p.pos.x + (sx / sl) * 1.5, p.pos.z + (sz / sl) * 1.5, 0.55)
            : { x: p.pos.x + (sx / sl) * 1.5, z: p.pos.z + (sz / sl) * 1.5 };
          p.pos.x = shoved.x;
          p.pos.z = shoved.z;
        }
        car.speed = Math.max(6, car.speed * 0.4);
        car.angle += 0.6;
      }
    }
    for (const cop of [...footCops]) {
      const dx = p.pos.x - cop.pos.x;
      const dz = p.pos.z - cop.pos.z;
      const dist = Math.hypot(dx, dz);
      cop.angle = Math.atan2(dx, dz);
      cop.group.rotation.y = cop.angle;
      if (dist > 1.4) {
        cop.pos.x += Math.sin(cop.angle) * cop.speed * dt;
        cop.pos.z += Math.cos(cop.angle) * cop.speed * dt;
        const fixed = G.collideCircle ? G.collideCircle(cop.pos.x, cop.pos.z, 0.55) : null;
        if (fixed) { cop.pos.x = fixed.x; cop.pos.z = fixed.z; }
        const clamped = G.clampToCity ? G.clampToCity(cop.pos.x, cop.pos.z, 1) : null;
        if (clamped) { cop.pos.x = clamped.x; cop.pos.z = clamped.z; }
      }
      cop.group.position.set(cop.pos.x, 0, cop.pos.z);
      if (dist < 1.6 && p.onFoot && now - (cop._hitAt ?? -99) > 1.2) {
        cop._hitAt = now;
        lastRamAt = now; 
        p.health = Math.max(0, (p.health ?? 100) - (G.armor ? 4 : 8));
        G.api.audio?.sfx('crash');
        G.api.hud?.flash?.();
        const sl = dist || 1;
        const shoved = G.collideCircle
          ? G.collideCircle(p.pos.x + (dx / sl) * 1.6, p.pos.z + (dz / sl) * 1.6, 0.55)
          : { x: p.pos.x + (dx / sl) * 1.6, z: p.pos.z + (dz / sl) * 1.6 };
        p.pos.x = shoved.x;
        p.pos.z = shoved.z;
      }
    }
  }
  return { update, addHeat, setWanted, spawnChase, reset, units };
}
