function holdKey(G, code, seconds) {
  G.input.keys.add(code);
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) G.stepWorld(1 / 60);
  G.input.keys.delete(code);
}
function placeCamera(G, px, py, pz, lx, ly, lz) {
  G.shotCamera = {
    pos: new G.THREE.Vector3(px, py, pz),
    lookAt: new G.THREE.Vector3(lx, ly, lz),
  };
}
export function stageShot(G, name) {
  G.resetWorld();
  G.screen = 'playing';
  G.api.hud?.show(false);
  if (name === 'drive') {
    G.api.vehicles.spawnPlayerCar(20, 140, Math.PI, 0xc0392b);
    G.api.traffic.reset();
    holdKey(G, 'KeyW', 3);
    const p = G.player.pos;
    G.api.vehicles.spawnCar(p.x + 2, p.z - 20, Math.PI, 0xe67e22, 'traffic');
    placeCamera(G, p.x, 7, p.z + 26, p.x, 2, p.z - 30);
    return 'drive';
  }
  if (name === 'chase') {
    G.api.vehicles.spawnPlayerCar(20, 120, Math.PI, 0x2e86c1);
    G.api.police.setWanted(3);
    holdKey(G, 'KeyW', 2);
    G.api.police.spawnChase(3);
    const p = G.player.pos;
    placeCamera(G, p.x + 2, 9, p.z + 40, p.x, 2, p.z - 20);
    return 'chase';
  }
  if (name === 'mission') {
    G.api.vehicles.spawnCar(6, 24, Math.PI / 2, 0xe67e22, 'parked');
    G.api.player.teleport(2, 28, Math.PI / 2);
    G.api.missions.start('m1');
    holdKey(G, 'KeyW', 0.5);
    const m = G.mission?.marker ?? { x: 0, z: -40 };
    const p = G.player.pos;
    placeCamera(G, p.x - 16, 5, p.z - 6, m.x, 2, m.z);
    return 'mission';
  }
  G.api.vehicles.spawnPlayerCar(20, 140, Math.PI, 0xc0392b);
  G.api.police.setWanted(2);
  G.api.traffic.reset();
  holdKey(G, 'KeyW', 2.5);
  G.api.police.spawnChase(2);
  const p = G.player.pos;
  placeCamera(G, p.x - 8, 7, p.z + 28, p.x, 2, p.z - 25);
  return 'cover';
}
