export function createRoadblocks(G) {
  const rng = G.rng ?? Math.random;
  const MIN_WANTED = 4; 
  const AHEAD_MIN = 35; 
  const AHEAD_MAX = 50; 
  const PASS_DIST = 60; 
  const COOLDOWN = 8; 
  const CAR_HALF_SPACING = 2.2; 
  const CAR_RADIUS = 2; 
  const MAX_SNAP = 9; 
  let block = null; 
  let cooldown = 0; 
  function spawnBlockCar(x, z, angle) {
    const spawn = G.api.vehicles?.spawnCar;
    if (typeof spawn !== 'function') return null;
    try {
      const car = spawn.call(G.api.vehicles, x, z, angle, 0xf2f2f2, 'police');
      if (!car || !car.group || !car.pos) return null;
      car.kind = 'police';
      car.driver = 'police';
      car.speed = 0;
      return car;
    } catch {
      return null;
    }
  }
  function removeBlockCar(car) {
    if (!car) return;
    const i = G.cars.indexOf(car);
    if (i >= 0) G.cars.splice(i, 1);
    if (car.group) G.scene.remove(car.group);
  }
  function clearBlock() {
    if (!block) return;
    for (const car of block.cars) removeBlockCar(car);
    block = null;
    cooldown = COOLDOWN;
  }
  function snapToStreet(x, z) {
    const streets = G.city?.roads?.streets;
    if (!Array.isArray(streets) || streets.length === 0) return null;
    let nearZ = streets[0];
    let nearX = streets[0];
    for (const s of streets) {
      if (Math.abs(z - s) < Math.abs(z - nearZ)) nearZ = s;
      if (Math.abs(x - s) < Math.abs(x - nearX)) nearX = s;
    }
    const dz = Math.abs(z - nearZ); 
    const dx = Math.abs(x - nearX); 
    if (dz <= dx) {
      if (dz > MAX_SNAP) return null;
      return { x, z: nearZ, alongX: true };
    }
    if (dx > MAX_SNAP) return null;
    return { x: nearX, z, alongX: false };
  }
  function spotIsClear(x, z) {
    if (typeof G.clampToCity === 'function') {
      const c = G.clampToCity(x, z, CAR_RADIUS);
      if (Math.abs(c.x - x) > 0.02 || Math.abs(c.z - z) > 0.02) return false;
    }
    if (typeof G.collideCircle === 'function') {
      const c = G.collideCircle(x, z, CAR_RADIUS);
      if (Math.abs(c.x - x) > 0.02 || Math.abs(c.z - z) > 0.02) return false;
    }
    return true;
  }
  function tryPlaceBlock() {
    const p = G.player;
    if (!p || !p.pos) return;
    const fx = Math.sin(p.angle);
    const fz = Math.cos(p.angle);
    const ahead = AHEAD_MIN + rng() * (AHEAD_MAX - AHEAD_MIN);
    const ax = p.pos.x + fx * ahead;
    const az = p.pos.z + fz * ahead;
    const snap = snapToStreet(ax, az);
    if (!snap) return; 
    if (!spotIsClear(snap.x, snap.z)) return; 
    const px = snap.alongX ? 0 : 1; 
    const pz = snap.alongX ? 1 : 0; 
    const faceAngle = Math.atan2(p.pos.x - snap.x, p.pos.z - snap.z);
    const cars = [];
    for (const side of [-1, 1]) {
      const cx = snap.x + px * CAR_HALF_SPACING * side;
      const cz = snap.z + pz * CAR_HALF_SPACING * side;
      if (!spotIsClear(cx, cz)) {
        for (const c of cars) removeBlockCar(c);
        return; 
      }
      const car = spawnBlockCar(cx, cz, faceAngle);
      if (!car) {
        for (const c of cars) removeBlockCar(c);
        return; 
      }
      cars.push(car);
    }
    block = { cars, x: snap.x, z: snap.z };
    G.announce?.('Roadblock ahead — find another way through!');
  }
  function reset() {
    if (block) {
      for (const car of block.cars) removeBlockCar(car);
      block = null;
    }
    cooldown = 0;
  }
  function update(dt) {
    const p = G.player;
    if (!p || !p.pos) return;
    if (cooldown > 0) cooldown = Math.max(0, cooldown - dt);
    if ((G.wanted ?? 0) < MIN_WANTED) {
      if (block) clearBlock();
      return;
    }
    if (block) {
      for (let i = block.cars.length - 1; i >= 0; i -= 1) {
        if (!G.cars.includes(block.cars[i])) block.cars.splice(i, 1);
      }
      if (block.cars.length === 0) {
        block = null;
        cooldown = COOLDOWN;
        return;
      }
      const dx = p.pos.x - block.x;
      const dz = p.pos.z - block.z;
      const along = dx * Math.sin(p.angle) + dz * Math.cos(p.angle);
      if (along > PASS_DIST) clearBlock();
      return;
    }
    if (cooldown <= 0) tryPlaceBlock();
  }
  return {
    update,
    reset,
    get count() {
      return block ? block.cars.length : 0;
    },
    get active() {
      return block !== null;
    },
  };
}
