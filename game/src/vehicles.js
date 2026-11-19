import { CAR, PLAYER, WANTED, PALETTE } from './config.js';
const WHEEL_R = 0.35;
const CAR_CAR_DIST = 3.2;
export function createVehicles(G) {
  const THREE = G.THREE;
  const bodyGeo = new THREE.BoxGeometry(2.0, 0.62, 4.4);
  const cabinGeo = new THREE.BoxGeometry(1.7, 0.55, 2.2);
  const glassGeo = new THREE.BoxGeometry(1.66, 0.5, 0.08);
  const stripeGeo = new THREE.BoxGeometry(2.04, 0.16, 4.42);
  const lightBarBaseGeo = new THREE.BoxGeometry(1.2, 0.1, 0.4);
  const lightBoxGeo = new THREE.BoxGeometry(0.5, 0.16, 0.36);
  const headGeo = new THREE.BoxGeometry(0.42, 0.16, 0.08);
  const tailGeo = new THREE.BoxGeometry(0.42, 0.14, 0.08);
  const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.26, 12);
  wheelGeo.rotateZ(Math.PI / 2); 
  const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 8);
  hubGeo.rotateZ(Math.PI / 2);
  const bumperGeo = new THREE.BoxGeometry(2.02, 0.18, 0.3);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.15, metalness: 0.6 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff6c0, emissive: 0xffedb0, emissiveIntensity: 1.4, roughness: 0.3,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0x880000, emissive: 0xcc1111, emissiveIntensity: 0.9, roughness: 0.4,
  });
  const barBaseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.45, metalness: 0.25 });
  const blueMat = new THREE.MeshStandardMaterial({ color: PALETTE.police, roughness: 0.45, metalness: 0.25 });
  const bodyMats = new Map(); 
  const smokeMatBase = new THREE.SpriteMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.65, depthWrite: false });
  function bodyMaterial(color) {
    let m = bodyMats.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.3 });
      bodyMats.set(color, m);
    }
    return m;
  }
  function mesh(geo, mat, x, y, z, shadow = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    return m;
  }
  const effects = [];
  function spawnSmoke(x, y, z, count, big) {
    for (let i = 0; i < count; i += 1) {
      const mat = smokeMatBase.clone();
      const s = new THREE.Sprite(mat);
      const spread = big ? 1.2 : 0.5;
      s.position.set(
        x + (G.rng() - 0.5) * spread * 2,
        y + G.rng() * 0.6,
        z + (G.rng() - 0.5) * spread * 2,
      );
      const sc = big ? 2.2 + G.rng() : 1.0 + G.rng() * 0.8;
      s.scale.set(sc, sc, 1);
      G.scene.add(s);
      effects.push({ obj: s, life: 0, maxLife: 1.1 + G.rng() * 0.6, rise: 1.6, grow: 1.8 });
    }
  }
  function spawnExplosion(x, y, z) {
    const light = new THREE.PointLight(0xff7711, 60, 26, 1.6);
    light.position.set(x, y + 1.2, z);
    G.scene.add(light);
    effects.push({ obj: light, life: 0, maxLife: 0.45, rise: 0, grow: 0, light: true });
    spawnSmoke(x, y + 0.8, z, 8, true);
  }
  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const e = effects[i];
      e.life += dt;
      const k = e.life / e.maxLife;
      if (k >= 1) {
        G.scene.remove(e.obj);
        if (e.obj.material) e.obj.material.dispose();
        effects.splice(i, 1);
        continue;
      }
      if (e.light) {
        e.obj.intensity = 60 * (1 - k);
      } else {
        e.obj.position.y += e.rise * dt;
        const s = e.obj.scale.x + e.grow * dt;
        e.obj.scale.set(s, s, 1);
        e.obj.material.opacity = 0.65 * (1 - k);
      }
    }
  }
  function buildCarMesh(color, kind) {
    const group = new THREE.Group();
    const isPolice = kind === 'police';
    const body = mesh(bodyGeo, isPolice ? whiteMat : bodyMaterial(color), 0, 0.58, 0);
    const cabin = mesh(cabinGeo, isPolice ? whiteMat : bodyMaterial(color), 0, 1.12, -0.25);
    group.add(body, cabin);
    group.add(mesh(glassGeo, glassMat, 0, 1.12, 0.88, false));
    group.add(mesh(glassGeo, glassMat, 0, 1.12, -1.38, false));
    group.add(mesh(bumperGeo, tyreMat, 0, 0.32, 2.18, false));
    group.add(mesh(bumperGeo, tyreMat, 0, 0.32, -2.18, false));
    group.add(mesh(headGeo, headMat, -0.68, 0.62, 2.21, false));
    group.add(mesh(headGeo, headMat, 0.68, 0.62, 2.21, false));
    group.add(mesh(tailGeo, tailMat, -0.68, 0.62, -2.21, false));
    group.add(mesh(tailGeo, tailMat, 0.68, 0.62, -2.21, false));
    let lightL = null;
    let lightR = null;
    if (isPolice) {
      group.add(mesh(stripeGeo, blueMat, 0, 0.78, 0, false));
      group.add(mesh(lightBarBaseGeo, barBaseMat, 0, 1.44, -0.25, false));
      lightL = mesh(lightBoxGeo, new THREE.MeshStandardMaterial({
        color: 0xcc0000, emissive: 0xff2222, emissiveIntensity: 2.5, roughness: 0.3,
      }), -0.32, 1.56, -0.25, false);
      lightR = mesh(lightBoxGeo, new THREE.MeshStandardMaterial({
        color: 0x0033cc, emissive: 0x2266ff, emissiveIntensity: 2.5, roughness: 0.3,
      }), 0.32, 1.56, -0.25, false);
      group.add(lightL, lightR);
    }
    const wheels = [];
    const wheelsFront = [];
    const wheelPositions = [
      [-0.95, 1.45, true], [0.95, 1.45, true],
      [-0.95, -1.45, false], [0.95, -1.45, false],
    ];
    for (const [wx, wz, front] of wheelPositions) {
      const w = new THREE.Mesh(wheelGeo, tyreMat);
      w.rotation.order = 'YXZ';
      w.position.set(wx, WHEEL_R, wz);
      w.castShadow = true;
      const hub = new THREE.Mesh(hubGeo, hubMat);
      w.add(hub);
      group.add(w);
      wheels.push(w);
      if (front) wheelsFront.push(w);
    }
    return { group, body, cabin, wheels, wheelsFront, lightL, lightR };
  }
  function spawnCar(x, z, angle, color, kind) {
    const { group, body, cabin, wheels, wheelsFront, lightL, lightR } = buildCarMesh(color, kind);
    group.position.set(x, 0, z);
    group.rotation.y = angle;
    G.scene.add(group);
    const car = {
      group,
      pos: group.position, 
      angle,
      speed: 0,
      color,
      kind,
      hp: 100,
      maxHp: 100,
      driver: null,
      steer: 0,
      wheelSpin: 0,
      wheels,
      wheelsFront,
      lightL,
      lightR,
      bodyMesh: body, 
      cabinMesh: cabin,
      modsApplied: false, 
      _frameApplied: false,
      _neon: null,
      _paint: false,
      flashT: G.rng() * 0.5,
      lastCrash: -10,
    };
    G.cars.push(car);
    return car;
  }
  function removeCar(car) {
    const i = G.cars.indexOf(car);
    if (i >= 0) G.cars.splice(i, 1);
    G.scene.remove(car.group);
  }
  function spawnPlayerCar(x, z, angle, color) {
    const p = G.player;
    if (p && p.car && p.car !== null) {
      p.car.kind = 'parked';
      p.car.driver = null;
    }
    const car = spawnCar(x, z, angle, color, 'player');
    car.driver = 'player';
    applyUpgrades(car);
    if (p) {
      p.onFoot = false;
      p.car = car;
      p.pos.set(x, 0, z);
      p.angle = angle;
      p.speed = 0;
      if (p.group) p.group.visible = false;
    }
    return car;
  }
  const neonGeo = new THREE.PlaneGeometry(2.6, 5.0);
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdde3e8, metalness: 1.0, roughness: 0.12 });
  function applyUpgrades(car) {
    if (!car || !car.group || !G.upgrades || typeof G.upgrades !== 'object') return;
    try {
      if (G.upgrades.frame && !car._frameApplied) {
        car._frameApplied = true;
        car.maxHp = 150;
        car.hp = Math.min(150, car.hp + 50);
      }
      if (G.upgrades.neon && !car._neon) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0x00e5ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
        });
        const glow = new THREE.Mesh(neonGeo, mat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.set(0, 0.07, 0);
        car.group.add(glow);
        car._neon = glow;
      }
      if (G.upgrades.paint && !car._paint) {
        car._paint = true;
        if (car.bodyMesh) car.bodyMesh.material = chromeMat;
        if (car.cabinMesh) car.cabinMesh.material = chromeMat;
      }
      car.modsApplied = true;
    } catch {
    }
  }
  function resetPlayerCar() {
    const p = G.player;
    let car = p?.car ?? null;
    if (!car) car = G.cars.find((c) => c.kind === 'player') ?? null;
    if (!car) return;
    removeCar(car);
    if (p && p.car === car) {
      p.car = null;
      p.onFoot = true;
      p.speed = 0;
      if (p.group) p.group.visible = true;
    }
  }
  let steal = null;
  function nearestCarWithin(dist) {
    const p = G.player;
    if (!p) return null;
    let best = null;
    let bestD = dist;
    for (const car of G.cars) {
      const dx = car.pos.x - p.pos.x;
      const dz = car.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d <= bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }
  function enterCar(car) {
    const p = G.player;
    car.kind = 'player';
    car.driver = 'player';
    applyUpgrades(car);
    p.onFoot = false;
    p.car = car;
    p.pos.set(car.pos.x, 0, car.pos.z);
    p.angle = car.angle;
    p.speed = 0;
    if (p.group) p.group.visible = false;
    G.api.audio?.sfx('door');
  }
  function tryEnterOrSteal() {
    const p = G.player;
    if (!p || !p.alive || steal) return;
    if (!p.onFoot) {
      const car = p.car;
      if (!car) return;
      const rx = -Math.cos(car.angle);
      const rz = Math.sin(car.angle);
      p.car = null;
      p.onFoot = true;
      p.speed = 0;
      car.driver = null;
      const exit = G.collideCircle(car.pos.x + rx * 1.9, car.pos.z + rz * 1.9, PLAYER.radius);
      const clamped = G.clampToCity(exit.x, exit.z, PLAYER.radius);
      p.pos.set(clamped.x, 0, clamped.z);
      p.angle = car.angle;
      if (p.group) p.group.visible = true;
      G.api.audio?.sfx('door');
      return;
    }
    const car = nearestCarWithin(PLAYER.enterDist);
    if (!car) return;
    if (car.kind === 'police') {
      G.announce("That's a cop car.");
      return;
    }
    if (car.kind === 'player') {
      enterCar(car);
      return;
    }
    G.addHeat(WANTED.steal, 'stole a car');
    G.api.audio?.sfx('door');
    p.stealFreeze = PLAYER.stealTime;
    steal = { car, t: PLAYER.stealTime };
  }
  function drivePlayerCar(car, dt) {
    const input = G.input;
    const { f, s } = input.move();
    const prevSpeed = car.speed;
    const up = G.upgrades && typeof G.upgrades === 'object' ? G.upgrades : {};
    const gripK = up.tires ? 1.25 : 1; 
    const maxSpeed = CAR.maxSpeed * (up.engine ? 1.15 : 1); 
    const steerTarget = -s * CAR.steerMax;
    car.steer += (steerTarget - car.steer) * Math.min(1, 10 * gripK * dt);
    if (f > 0) {
      if (car.speed < 0) car.speed += CAR.brake * dt; 
      else car.speed += CAR.accel * dt;
    } else if (f < 0) {
      if (car.speed > 0.5) car.speed -= CAR.brake * dt; 
      else car.speed -= CAR.accel * 0.6 * dt; 
    } else if (input.braking()) {
      const dec = CAR.brake * dt;
      car.speed = Math.abs(car.speed) <= dec ? 0 : car.speed - Math.sign(car.speed) * dec;
    } else {
      const dec = 5 * dt;
      car.speed = Math.abs(car.speed) <= dec ? 0 : car.speed - Math.sign(car.speed) * dec;
    }
    car.speed = Math.max(-CAR.reverseMax, Math.min(maxSpeed, car.speed));
    const speedFactor = Math.max(-1, Math.min(1, car.speed / 10));
    car.angle += car.steer * speedFactor * 2.0 * gripK * dt;
    const fx = Math.sin(car.angle);
    const fz = Math.cos(car.angle);
    const nx = car.pos.x + fx * car.speed * dt;
    const nz = car.pos.z + fz * car.speed * dt;
    let hit = false;
    const afterCollide = G.collideCircle(nx, nz, CAR.radius);
    if (Math.abs(afterCollide.x - nx) > 0.02 || Math.abs(afterCollide.z - nz) > 0.02) hit = true;
    const afterClamp = G.clampToCity(afterCollide.x, afterCollide.z, CAR.radius);
    if (Math.abs(afterClamp.x - afterCollide.x) > 0.02 || Math.abs(afterClamp.z - afterCollide.z) > 0.02) hit = true;
    car.pos.set(afterClamp.x, 0, afterClamp.z);
    if (hit) {
      const speedBefore = Math.abs(prevSpeed);
      car.speed *= 0.35; 
      if (speedBefore - Math.abs(car.speed) > 8 && G.clock.time - car.lastCrash > 0.5) {
        car.lastCrash = G.clock.time;
        car.hp -= 15;
        G.api.audio?.sfx('crash');
        if (car.hp < 40) spawnSmoke(car.pos.x, 0.8, car.pos.z, 4, false);
      }
    }
  }
  function carCarCollisions(dt) {
    const cars = G.cars;
    for (let i = 0; i < cars.length; i += 1) {
      for (let j = i + 1; j < cars.length; j += 1) {
        const a = cars[i];
        const b = cars[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d >= CAR_CAR_DIST || d < 0.001) continue;
        const overlap = (CAR_CAR_DIST - d) / 2;
        const ux = dx / d;
        const uz = dz / d;
        a.pos.x -= ux * overlap;
        a.pos.z -= uz * overlap;
        b.pos.x += ux * overlap;
        b.pos.z += uz * overlap;
        const playerCar = a.driver === 'player' ? a : b.driver === 'player' ? b : null;
        if (playerCar) {
          const other = playerCar === a ? b : a;
          if (other.kind === 'police' || other.driver === 'police') continue;
          const relSpeed = Math.abs(playerCar.speed - other.speed);
          if (relSpeed > 8 && G.clock.time - playerCar.lastCrash > 0.5) {
            playerCar.lastCrash = G.clock.time;
            playerCar.hp -= 15;
            playerCar.speed *= 0.5;
            G.api.audio?.sfx('crash');
            if (playerCar.hp < 40) spawnSmoke(playerCar.pos.x, 0.8, playerCar.pos.z, 4, false);
          }
        }
      }
    }
    void dt;
  }
  function ejectPlayer(car) {
    const p = G.player;
    if (!p || p.car !== car) return;
    p.car = null;
    p.onFoot = true;
    p.speed = 0;
    const rx = -Math.cos(car.angle);
    const rz = Math.sin(car.angle);
    const spot = G.clampToCity(car.pos.x + rx * 1.9, car.pos.z + rz * 1.9, PLAYER.radius);
    p.pos.set(spot.x, 0, spot.z);
    p.angle = car.angle;
    if (p.group) p.group.visible = true;
    G.announce('Your car blew up — get out!');
  }
  function update(dt) {
    const p = G.player;
    if (steal) {
      steal.t -= dt;
      if (p) p.stealFreeze = Math.max(0, steal.t);
      if (steal.t <= 0) {
        const car = steal.car;
        steal = null;
        if (p) p.stealFreeze = 0;
        if (car && G.cars.includes(car) && p && p.alive && p.onFoot) enterCar(car);
      }
    }
    if (p && p.car && !p.onFoot) drivePlayerCar(p.car, dt);
    carCarCollisions(dt);
    for (let i = G.cars.length - 1; i >= 0; i -= 1) {
      const car = G.cars[i];
      car.group.rotation.y = car.angle;
      car.wheelSpin += (car.speed * dt) / WHEEL_R;
      for (const w of car.wheels) w.rotation.x = car.wheelSpin;
      for (const w of car.wheelsFront) w.rotation.y = car.steer;
      if (car.kind === 'police' && car.lightL && car.lightR) {
        car.flashT += dt;
        const phase = Math.floor(car.flashT * 4) % 2 === 0;
        car.lightL.material.emissiveIntensity = phase ? 3.2 : 0.15;
        car.lightR.material.emissiveIntensity = phase ? 0.15 : 3.2;
      }
      if (car.hp <= 0) {
        const wasPlayerCar = p && p.car === car;
        spawnExplosion(car.pos.x, 0, car.pos.z);
        G.api.audio?.sfx('crash');
        removeCar(car);
        if (wasPlayerCar) ejectPlayer(car);
      }
    }
    updateEffects(dt);
  }
  return { update, spawnCar, spawnPlayerCar, tryEnterOrSteal, resetPlayerCar, applyUpgrades };
}
