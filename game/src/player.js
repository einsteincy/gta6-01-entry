import { PLAYER, PALETTE } from './config.js';
function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
export function createPlayer(G) {
  const THREE = G.THREE;
  const jacketMat = new THREE.MeshStandardMaterial({ color: PALETTE.player, roughness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.9 });
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.32), jacketMat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skinMat);
  head.position.y = 1.62;
  head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), hairMat);
  hair.position.y = 1.8;
  group.add(torso, head, hair);
  function limb(mat, w, h, d, px, py) {
    const pivot = new THREE.Group();
    pivot.position.set(px, py, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = -h / 2;
    m.castShadow = true;
    pivot.add(m);
    group.add(pivot);
    return pivot;
  }
  const legL = limb(darkMat, 0.22, 0.78, 0.24, -0.15, 0.82);
  const legR = limb(darkMat, 0.22, 0.78, 0.24, 0.15, 0.82);
  const armL = limb(jacketMat, 0.17, 0.62, 0.2, -0.37, 1.38);
  const armR = limb(jacketMat, 0.17, 0.62, 0.2, 0.37, 1.38);
  for (const arm of [armL, armR]) {
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.16), skinMat);
    hand.position.y = -0.68;
    arm.add(hand);
  }
  group.position.set(0, 0, 20);
  group.rotation.y = Math.PI;
  G.scene.add(group);
  const player = {
    group,
    pos: group.position, 
    angle: Math.PI,
    speed: 0,
    health: PLAYER.health,
    maxHealth: 100,
    onFoot: true,
    car: null,
    alive: true,
    stealFreeze: 0, 
  };
  G.player = player;
  let walkPhase = 0;
  function teleport(x, z, angle) {
    if (player.car) {
      player.car.driver = null;
      player.car.kind = 'parked';
      player.car = null;
    }
    player.onFoot = true;
    player.stealFreeze = 0;
    player.speed = 0;
    player.pos.set(x, 0, z);
    player.angle = angle;
    group.rotation.y = angle;
    group.visible = true;
  }
  function update(dt) {
    if (!player.alive) return;
    if (!player.onFoot && player.car) {
      group.visible = false;
      player.pos.set(player.car.pos.x, 0, player.car.pos.z);
      player.angle = player.car.angle;
      group.rotation.y = player.angle;
      player.speed = Math.abs(player.car.speed);
      return;
    }
    group.visible = true;
    if (player.stealFreeze > 0) {
      player.speed = 0;
      return;
    }
    const { f, s } = G.input.move();
    const running = G.input.running();
    const camA = player.angle + G.camYaw;
    const fx = Math.sin(camA);
    const fz = Math.cos(camA);
    const rx = -Math.cos(camA);
    const rz = Math.sin(camA);
    let dx = fx * f + rx * s;
    let dz = fz * f + rz * s;
    const len = Math.hypot(dx, dz);
    if (len > 0.001) {
      dx /= len;
      dz /= len;
    }
    const targetSpeed = len > 0.001 ? (running ? PLAYER.run : PLAYER.walk) : 0;
    player.speed += (targetSpeed - player.speed) * Math.min(1, 10 * dt);
    if (player.speed > 0.05 && len > 0.001) {
      const nx = player.pos.x + dx * player.speed * dt;
      const nz = player.pos.z + dz * player.speed * dt;
      const afterCollide = G.collideCircle(nx, nz, PLAYER.radius);
      const afterClamp = G.clampToCity(afterCollide.x, afterCollide.z, PLAYER.radius);
      player.pos.set(afterClamp.x, 0, afterClamp.z);
      const targetAngle = Math.atan2(dx, dz);
      player.angle = lerpAngle(player.angle, targetAngle, Math.min(1, 14 * dt));
    }
    group.rotation.y = player.angle;
    const swing = Math.min(1, player.speed / PLAYER.walk);
    walkPhase += player.speed * dt * 2.4;
    const sw = Math.sin(walkPhase) * 0.65 * swing;
    legL.rotation.x = sw;
    legR.rotation.x = -sw;
    armL.rotation.x = -sw * 0.85;
    armR.rotation.x = sw * 0.85;
    if (swing < 0.05) {
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      armL.rotation.x = Math.sin(G.clock.time * 1.6) * 0.03;
      armR.rotation.x = -Math.sin(G.clock.time * 1.6) * 0.03;
    }
  }
  return { update, teleport };
}
