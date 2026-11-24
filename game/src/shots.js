function holdKey(G, code, seconds) {
  G.input.keys.add(code);
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) G.stepWorld(1 / 60);
  G.input.keys.delete(code);
}
function step(G, seconds) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) G.stepWorld(1 / 60);
}
function placeCamera(G, px, py, pz, lx, ly, lz) {
  G.shotCamera = {
    pos: new G.THREE.Vector3(px, py, pz),
    lookAt: new G.THREE.Vector3(lx, ly, lz),
  };
}
function heliTo(G, x, y, z) {
  G.scene.traverse((o) => { if (o.isSpotLight) o.parent.position.set(x, y, z); });
}
export function stageShot(G, name) {
  G.resetWorld();
  G.screen = 'playing';
  G.api.hud?.show(false);
  if (name === 'drive') {
    G.cash = 1250;
    G.respect = 10;
    G.api.missions.start('m1');
    G.api.player.teleport(14, 27, Math.PI);
    G.api.vehicles.tryEnterOrSteal();
    step(G, 1);
    holdKey(G, 'KeyW', 1);
    G.announce('VEHICLE STOLEN');
    const p = G.player.pos;
    placeCamera(G, p.x, 8, p.z + 20, p.x, 1, p.z);
    return 'drive';
  }
  if (name === 'chase') {
    G.cash = 4200;
    G.respect = 80;
    G.api.missions.start('m4');
    G.api.vehicles.spawnPlayerCar(20, 120, Math.PI, 0x2e86c1);
    holdKey(G, 'KeyW', 2);
    G.api.police.setWanted(5);
    G.api.police.spawnChase(2);
    step(G, 0.3);
    const p = G.player.pos;
    placeCamera(G, p.x + 2, 3.5, p.z - 11, p.x, 0.5, p.z + 1);
    heliTo(G, p.x - 4, 9, p.z + 12);
    return 'chase';
  }
  if (name === 'mission') {
    G.cash = 2400;
    G.respect = 60;
    G.upgrades.neon = true;
    G.api.player.teleport(-60, 44, 0);
    G.api.hud.toggleShop(true);
    placeCamera(G, -44, 7, 60, -60, 1.5, 44);
    return 'mission';
  }
  G.cash = 6850;
  G.respect = 120;
  G.clock.time = 44;
  G.api.missions.start('m8');
  G.api.vehicles.spawnPlayerCar(20, 140, Math.PI, 0xc0392b);
  holdKey(G, 'KeyW', 2.5);
  G.api.police.setWanted(4);
  G.api.police.spawnChase(2);
  step(G, 0.3);
  const p = G.player.pos;
  placeCamera(G, p.x + 2, 3.5, p.z - 11, p.x, 0.5, p.z + 1);
  heliTo(G, p.x - 4, 9, p.z + 12);
  G.api.hud.dialog('DARIO', 'Last job, Leo — make it count.');
  return 'cover';
}
