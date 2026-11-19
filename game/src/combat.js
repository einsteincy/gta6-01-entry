import { COMBAT, WANTED, PALETTE } from './config.js';
export function createCombat(G) {
  const THREE = G.THREE;
  const rng = G.rng ?? Math.random;
  const WEAPONS = {
    pistol: { name: 'Pistol', dmg: 34, mag: 12, interval: 0.22, range: 70, pellets: 1, spread: 0 },
    smg: { name: 'SMG', dmg: 12, mag: 30, interval: 0.07, range: 55, pellets: 1, spread: 0.03 },
    shotgun: { name: 'Shotgun', dmg: 9, mag: 6, interval: 0.9, range: 30, pellets: 8, spread: 0.09 },
  };
  let cur = 'pistol';
  const mag = { pistol: 12, smg: 30, shotgun: 6 };
  const reserve = { pistol: 48, smg: 120, shotgun: 24 };
  let fireTimer = 0;
  let reloading = false;
  let reloadTimer = 0;
  const tracers = []; 
  const dying = []; 
  const raycaster = new THREE.Raycaster();
  raycaster.far = COMBAT.pistolRange;
  const screenCentre = new THREE.Vector2(0, 0);
  const tmpV = new THREE.Vector3();
  const muzzleLight = new THREE.PointLight(0xffc46b, 0, 9, 1.6);
  muzzleLight.visible = false;
  G.scene.add(muzzleLight);
  let muzzleTimer = 0;
  const tracerMat = new THREE.LineBasicMaterial({
    color: 0xffe9a8, transparent: true, opacity: 0.9,
  });
  function muzzlePos(out) {
    const p = G.player;
    if (!p) return out.set(0, 1.4, 0);
    const fwd = { x: Math.sin(p.angle), z: Math.cos(p.angle) };
    return out.set(p.pos.x + fwd.x * 0.7, p.pos.y + 1.35, p.pos.z + fwd.z * 0.7);
  }
  function addTracer(from, to, life = 0.12) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const line = new THREE.Line(geo, tracerMat.clone());
    G.scene.add(line);
    tracers.push({ line, life, maxLife: life });
  }
  function flashMuzzle(at) {
    muzzleLight.position.copy(at);
    muzzleLight.intensity = 14;
    muzzleLight.visible = true;
    muzzleTimer = 0.06;
  }
  function makeHealthBar() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true }));
    sprite.scale.set(1.7, 0.21, 1);
    sprite.position.set(0, 2.15, 0);
    return { sprite, canvas, ctx, tex };
  }
  function drawHealthBar(bar, frac) {
    const { ctx, canvas, tex } = bar;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = frac > 0.5 ? '#37c24a' : frac > 0.25 ? '#e8a13a' : '#d23b2e';
    ctx.fillRect(1, 1, Math.max(0, (canvas.width - 2) * frac), canvas.height - 2);
    tex.needsUpdate = true;
  }
  function spawnEnemy(x, z, hp) {
    const group = new THREE.Group();
    const matShirt = new THREE.MeshStandardMaterial({ color: PALETTE.enemy, roughness: 0.85 });
    const matPants = new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 0.9 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.8 });
    const matCap = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    function part(mat, sx, sy, sz, px, py, pz) {
      const m = new THREE.Mesh(boxGeo, mat);
      m.scale.set(sx, sy, sz);
      m.position.set(px, py, pz);
      m.castShadow = true;
      group.add(m);
      return m;
    }
    part(matShirt, 0.58, 0.68, 0.34, 0, 1.05, 0); 
    part(matSkin, 0.34, 0.3, 0.3, 0, 1.56, 0); 
    part(matCap, 0.4, 0.1, 0.36, 0, 1.74, 0); 
    part(matShirt, 0.16, 0.6, 0.18, -0.37, 1.05, 0); 
    part(matShirt, 0.16, 0.6, 0.18, 0.37, 1.05, 0);
    part(matPants, 0.2, 0.66, 0.22, -0.14, 0.34, 0); 
    part(matPants, 0.2, 0.66, 0.22, 0.14, 0.34, 0);
    part(matCap, 0.08, 0.08, 0.34, 0.37, 0.78, 0.2);
    const bar = makeHealthBar();
    const maxHp = hp ?? COMBAT.enemyHp;
    drawHealthBar(bar, 1);
    group.add(bar.sprite);
    const fixed = G.collideCircle ? G.collideCircle(x, z, 0.6) : { x, z };
    const clamped = G.clampToCity ? G.clampToCity(fixed.x, fixed.z, 1) : fixed;
    group.position.set(clamped.x, 0, clamped.z);
    G.scene.add(group);
    const enemy = {
      group,
      pos: group.position,
      angle: rng() * Math.PI * 2,
      hp: maxHp,
      maxHp,
      alive: true,
      fireAt: 0,
      mission: false,
      _bar: bar,
      _strafeDir: rng() < 0.5 ? -1 : 1,
      _strafeAt: 0,
    };
    G.enemies.push(enemy);
    return enemy;
  }
  function killEnemy(enemy) {
    enemy.alive = false;
    enemy.group.rotation.x = -Math.PI / 2; 
    enemy.group.position.y = 0.25;
    if (enemy._bar) enemy._bar.sprite.visible = false;
    enemy.group.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.transparent = true;
      }
    });
    dying.push({ enemy, t: 0 });
  }
  function removeEnemy(enemy) {
    const i = G.enemies.indexOf(enemy);
    if (i >= 0) G.enemies.splice(i, 1);
    const d = dying.findIndex((e) => e.enemy === enemy);
    if (d >= 0) dying.splice(d, 1);
    if (enemy.group) G.scene.remove(enemy.group);
  }
  function damageEnemy(enemy, dmg) {
    if (!enemy.alive) return;
    enemy.hp -= dmg;
    if (enemy._bar) drawHealthBar(enemy._bar, Math.max(0, enemy.hp / enemy.maxHp));
    if (enemy.hp <= 0) killEnemy(enemy);
  }
  function damageCop(cop, dmg) {
    cop.hp -= dmg;
    if (cop.hp <= 0) {
      const j = G.cops.indexOf(cop);
      if (j >= 0) G.cops.splice(j, 1);
      cop.group.rotation.x = -Math.PI / 2;
      cop.group.position.y = 0.25;
      cop.group.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.transparent = true;
        }
      });
      dying.push({ enemy: cop, t: 0, isCop: true });
      G.addHeat?.(WANTED.killCop, 'killed a cop');
    }
  }
  function rayHit(origin, dir, range) {
    let best = null;
    function testSphere(cx, cy, cz, radius, kind, target) {
      tmpV.set(cx - origin.x, cy - origin.y, cz - origin.z);
      const t = tmpV.dot(dir);
      if (t < 0 || t > range) return;
      const px = origin.x + dir.x * t;
      const py = origin.y + dir.y * t;
      const pz = origin.z + dir.z * t;
      const d2 = (px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2;
      if (d2 > radius * radius) return;
      if (!best || t < best.t) best = { t, point: new THREE.Vector3(px, py, pz), kind, target };
    }
    for (const e of G.enemies) {
      if (e.alive) testSphere(e.pos.x, e.pos.y + 1.2, e.pos.z, 1.2, 'enemy', e);
    }
    for (const c of G.cops) testSphere(c.pos.x, c.pos.y + 1.2, c.pos.z, 1.2, 'cop', c);
    for (const car of G.cars) {
      if (car.kind === 'traffic') testSphere(car.pos.x, car.pos.y + 1.0, car.pos.z, 1.2, 'car', car);
    }
    return best;
  }
  function spreadDir(dir, s) {
    return new THREE.Vector3(
      dir.x + (rng() - 0.5) * 2 * s,
      dir.y + (rng() - 0.5) * 2 * s,
      dir.z + (rng() - 0.5) * 2 * s,
    ).normalize();
  }
  function shoot() {
    const p = G.player;
    if (!p || !p.alive) return;
    const w = WEAPONS[cur];
    if (reloading || mag[cur] <= 0) return;
    fireTimer = w.interval;
    mag[cur] -= 1;
    if (mag[cur] <= 0) startReload();
    raycaster.setFromCamera(screenCentre, G.camera);
    const origin = raycaster.ray.origin;
    const dir = raycaster.ray.direction;
    const muzzle = muzzlePos(new THREE.Vector3());
    flashMuzzle(muzzle);
    G.api.audio?.sfx('shot');
    let missionTarget = false;
    for (let i = 0; i < w.pellets; i += 1) {
      const d = w.spread ? spreadDir(dir, w.spread) : dir;
      const hit = rayHit(origin, d, w.range);
      const end = hit ? hit.point : origin.clone().addScaledVector(d, w.range);
      addTracer(muzzle, end);
      if (hit) {
        if (hit.kind === 'enemy') {
          damageEnemy(hit.target, w.dmg);
          missionTarget = !!hit.target.mission;
        } else if (hit.kind === 'cop') {
          damageCop(hit.target, w.dmg);
        } else if (hit.kind === 'car') {
          hit.target.hp = (hit.target.hp ?? 100) - w.dmg;
        }
      }
    }
    if (!missionTarget) G.addHeat?.(WANTED.shoot, 'fired a weapon');
  }
  function startReload() {
    const w = WEAPONS[cur];
    if (reloading || mag[cur] >= w.mag || reserve[cur] <= 0) return;
    reloading = true;
    reloadTimer = COMBAT.reloadSeconds;
  }
  function reload() {
    startReload();
  }
  function nearestCoverPoint(x, z) {
    const cols = G.city?.colliders ?? [];
    let best = null;
    let bestD = Infinity;
    for (const c of cols) {
      for (const [cx, cz] of [[c.x0, c.z0], [c.x0, c.z1], [c.x1, c.z0], [c.x1, c.z1]]) {
        const d = (cx - x) ** 2 + (cz - z) ** 2;
        if (d < bestD) { bestD = d; best = { x: cx, z: cz }; }
      }
    }
    return best;
  }
  function update(dt) {
    const p = G.player;
    fireTimer = Math.max(0, fireTimer - dt);
    if (reloading) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) {
        reloading = false;
        const w = WEAPONS[cur];
        const take = Math.min(w.mag - mag[cur], reserve[cur]);
        mag[cur] += take;
        reserve[cur] -= take;
      }
    }
    if (p && p.alive && G.screen === 'playing' && !reloading && fireTimer <= 0) {
      if (G.input?.shooting?.()) shoot();
    }
    if (muzzleTimer > 0) {
      muzzleTimer -= dt;
      if (muzzleTimer <= 0) {
        muzzleLight.visible = false;
        muzzleLight.intensity = 0;
      }
    }
    for (let i = tracers.length - 1; i >= 0; i -= 1) {
      const tr = tracers[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        G.scene.remove(tr.line);
        tr.line.geometry.dispose();
        tr.line.material.dispose();
        tracers.splice(i, 1);
      } else {
        tr.line.material.opacity = 0.9 * (tr.life / tr.maxLife);
      }
    }
    for (let i = dying.length - 1; i >= 0; i -= 1) {
      const d = dying[i];
      d.t += dt;
      const frac = Math.min(1, d.t / 4);
      d.enemy.group.traverse((o) => {
        if (o.isMesh) o.material.opacity = 1 - frac;
      });
      if (d.t >= 4) {
        if (d.isCop) {
          if (d.enemy.group) G.scene.remove(d.enemy.group);
          dying.splice(i, 1);
        } else {
          removeEnemy(d.enemy);
        }
      }
    }
    if (p && p.alive) {
      const now = G.clock?.time ?? 0;
      for (const e of [...G.enemies]) {
        if (!e.alive) continue;
        const dx = p.pos.x - e.pos.x;
        const dz = p.pos.z - e.pos.z;
        const dist = Math.hypot(dx, dz);
        e.angle = Math.atan2(dx, dz);
        e.group.rotation.y = e.angle;
        if (now > e._strafeAt) {
          e._strafeDir *= -1;
          e._strafeAt = now + 1.5 + rng() * 1.5;
        }
        let mx = 0;
        let mz = 0;
        if (e.hp < 40) {
          const cover = nearestCoverPoint(e.pos.x, e.pos.z);
          if (cover) {
            const cx = cover.x - e.pos.x;
            const cz = cover.z - e.pos.z;
            const cl = Math.hypot(cx, cz) || 1;
            mx += (cx / cl) * 2.2;
            mz += (cz / cl) * 2.2;
          }
        } else if (dist > COMBAT.enemyRange * 0.8) {
          mx += (dx / (dist || 1)) * 2.0;
          mz += (dz / (dist || 1)) * 2.0;
        }
        mx += (-dz / (dist || 1)) * e._strafeDir * 1.1;
        mz += (dx / (dist || 1)) * e._strafeDir * 1.1;
        const ml = Math.hypot(mx, mz);
        if (ml > 0.01) {
          e.pos.x += (mx / ml) * Math.min(ml, 2.4) * dt;
          e.pos.z += (mz / ml) * Math.min(ml, 2.4) * dt;
          const fixed = G.collideCircle ? G.collideCircle(e.pos.x, e.pos.z, 0.6) : null;
          if (fixed) { e.pos.x = fixed.x; e.pos.z = fixed.z; }
          const clamped = G.clampToCity ? G.clampToCity(e.pos.x, e.pos.z, 1) : null;
          if (clamped) { e.pos.x = clamped.x; e.pos.z = clamped.z; }
          e.group.position.set(e.pos.x, 0, e.pos.z);
        }
        if (dist <= COMBAT.enemyRange && now >= e.fireAt) {
          e.fireAt = now + COMBAT.enemyFireInterval;
          const from = new THREE.Vector3(e.pos.x, e.pos.y + 1.4, e.pos.z);
          const to = new THREE.Vector3(p.pos.x, p.pos.y + 1.2, p.pos.z);
          addTracer(from, to, 0.1);
          G.api.audio?.sfx('shot');
          if (rng() < COMBAT.enemyAccuracy) {
            const dmg = G.armor ? COMBAT.enemyDamage / 2 : COMBAT.enemyDamage;
            p.health = Math.max(0, (p.health ?? 100) - dmg);
            G.api.hud?.flash?.();
          }
        }
      }
    }
  }
  function reset() {
    for (const e of [...G.enemies]) removeEnemy(e);
    for (const d of [...dying]) {
      if (d.enemy.group) G.scene.remove(d.enemy.group);
    }
    dying.length = 0;
    for (const tr of tracers) {
      G.scene.remove(tr.line);
      tr.line.geometry.dispose();
      tr.line.material.dispose();
    }
    tracers.length = 0;
    muzzleLight.visible = false;
    muzzleLight.intensity = 0;
    cur = 'pistol';
    mag.pistol = 12; mag.smg = 30; mag.shotgun = 6;
    reserve.pistol = 48; reserve.smg = 120; reserve.shotgun = 24;
    reloading = false;
    reloadTimer = 0;
    fireTimer = 0;
  }
  function switchTo(id) {
    if (!WEAPONS[id] || id === cur) return false;
    cur = id;
    reloading = false; reloadTimer = 0; fireTimer = 0;
    G.announce?.(`Weapon: ${WEAPONS[id].name}`);
    return true;
  }
  function addReserve(id, n) {
    if (!WEAPONS[id]) return false;
    reserve[id] += n;
    return true;
  }
  const api = { update, reload, spawnEnemy, reset, switchTo, addReserve };
  Object.defineProperties(api, {
    ammo: { get: () => mag[cur] },
    magSize: { get: () => WEAPONS[cur].mag },
    reloading: { get: () => reloading },
    weapon: { get: () => cur },
    weaponName: { get: () => WEAPONS[cur].name },
    weapons: { get: () => Object.keys(WEAPONS).map((id) => ({ id, name: WEAPONS[id].name, mag: mag[id], reserve: reserve[id], magSize: WEAPONS[id].mag })) },
  });
  return api;
}
