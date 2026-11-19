import { CITY, PALETTE } from './config.js';
export function createCity(G) {
  const THREE = G.THREE;
  const rng = G.rng;
  const scene = G.scene;
  const { half, pitch, roadW, sidewalk, beachX, waterX, blockPad } = CITY;
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);
  scene.background = new THREE.Color(0x74c2f2); 
  scene.fog = new THREE.Fog(0xf0e3c8, 200, 560); 
  scene.traverse((obj) => {
    if (obj.isDirectionalLight) {
      obj.intensity = 3.1; 
      obj.color.set(0xfff0bd); 
    }
    if (obj.isHemisphereLight) obj.intensity = 1.05; 
  });
  function shade(hex, f) {
    const r = Math.min(255, Math.max(0, Math.round(((hex >> 16) & 255) * f)));
    const g = Math.min(255, Math.max(0, Math.round(((hex >> 8) & 255) * f)));
    const b = Math.min(255, Math.max(0, Math.round((hex & 255) * f)));
    return (r << 16) | (g << 8) | b;
  }
  function flat(w, d, color, y, opts = {}) {
    const mat = opts.material
      || new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.95, metalness: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(opts.x ?? 0, y, opts.z ?? 0);
    if (opts.receiveShadow !== false) mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function makeWindowTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#b9dff2');
    grad.addColorStop(0.55, '#9ccbe8');
    grad.addColorStop(1, '#7fb6dd');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
    const cols = 8;
    const rows = 16;
    const cw = 128 / cols;
    const ch = 256 / rows;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const lit = rng() < 0.52;
        ctx.fillStyle = lit
          ? (rng() < 0.7 ? '#ffd98a' : '#ffeec2')
          : (rng() < 0.5 ? '#8fc8e8' : '#a9d8ef');
        ctx.fillRect(x * cw + 2, y * ch + 3, cw - 4, ch - 6);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  const windowTex = makeWindowTexture();
  const sideMats = PALETTE.building.map(
    (c) => new THREE.MeshStandardMaterial({ color: shade(c, 1.18), map: windowTex, emissive: shade(c, 0.16), roughness: 0.8, metalness: 0.05 }),
  );
  const roofMats = PALETTE.building.map(
    (c) => new THREE.MeshStandardMaterial({ color: shade(c, 0.72), roughness: 0.95, metalness: 0 }),
  );
  const groundMat = new THREE.MeshStandardMaterial({ color: shade(PALETTE.ground, 1.12), roughness: 1, metalness: 0 });
  flat(half * 2, half * 2, PALETTE.ground, 0, { material: groundMat });
  const beach = flat(waterX - beachX, half * 2, PALETTE.sand, 0.01);
  beach.position.x = (beachX + waterX) / 2;
  const seaMat = new THREE.MeshStandardMaterial({ color: PALETTE.water, roughness: 0.35, metalness: 0.1 });
  const sea = flat(64, half * 2, PALETTE.water, 0.02, { material: seaMat });
  sea.position.x = waterX + 32;
  const streets = [];
  for (let c = -half + 20; c <= half - 20; c += pitch) streets.push(c); 
  const roadMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 0.95, metalness: 0 });
  const walkMat = new THREE.MeshStandardMaterial({ color: shade(PALETTE.sidewalk, 1.15), roughness: 0.95, metalness: 0 });
  const roadGeoX = new THREE.PlaneGeometry(half * 2, roadW);
  const roadGeoZ = new THREE.PlaneGeometry(roadW, half * 2);
  const walkGeoX = new THREE.PlaneGeometry(half * 2, sidewalk);
  const walkGeoZ = new THREE.PlaneGeometry(sidewalk, half * 2);
  for (const c of streets) {
    const rx = new THREE.Mesh(roadGeoX, roadMat);
    rx.rotation.x = -Math.PI / 2; rx.position.set(0, 0.03, c); rx.receiveShadow = true; group.add(rx);
    const rz = new THREE.Mesh(roadGeoZ, roadMat);
    rz.rotation.x = -Math.PI / 2; rz.position.set(c, 0.035, 0); rz.receiveShadow = true; group.add(rz);
    for (const s of [-1, 1]) {
      const off = roadW / 2 + sidewalk / 2;
      const wx = new THREE.Mesh(walkGeoX, walkMat);
      wx.rotation.x = -Math.PI / 2; wx.position.set(0, 0.025, c + s * off); wx.receiveShadow = true; group.add(wx);
      const wz = new THREE.Mesh(walkGeoZ, walkMat);
      wz.rotation.x = -Math.PI / 2; wz.position.set(c + s * off, 0.025, 0); wz.receiveShadow = true; group.add(wz);
    }
  }
  const dashGeo = new THREE.PlaneGeometry(0.35, 3);
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  const dashSpots = [];
  for (const c of streets) {
    for (let p = -half + 12; p <= half - 12; p += 8) {
      if (streets.some((s) => Math.abs(p - s) < 7)) continue;
      dashSpots.push({ x: p, z: c, rot: 0 });
      dashSpots.push({ x: c, z: p, rot: Math.PI / 2 });
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashSpots.length);
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler(-Math.PI / 2, 0, 0);
    const s = new THREE.Vector3(1, 1, 1);
    dashSpots.forEach((d, i) => {
      e.set(-Math.PI / 2, 0, d.rot);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(d.x, 0.045, d.z), q, s);
      dashes.setMatrixAt(i, m);
    });
  }
  dashes.instanceMatrix.needsUpdate = true;
  group.add(dashes);
  const nodes = [];
  const nodeIndex = new Map();
  streets.forEach((sx, ix) => {
    streets.forEach((sz, iz) => {
      nodeIndex.set(`${ix},${iz}`, nodes.length);
      nodes.push({ x: sx, z: sz });
    });
  });
  const edges = [];
  streets.forEach((_, ix) => {
    streets.forEach((_, iz) => {
      if (ix + 1 < streets.length) edges.push([nodeIndex.get(`${ix},${iz}`), nodeIndex.get(`${ix + 1},${iz}`)]);
      if (iz + 1 < streets.length) edges.push([nodeIndex.get(`${ix},${iz}`), nodeIndex.get(`${ix},${iz + 1}`)]);
    });
  });
  const roads = { streets: [...streets], graph: { nodes, edges } };
  const blockCentres = [];
  for (let c = -half + 40; c <= half - 40; c += pitch) blockCentres.push(c);
  const inset = sidewalk + blockPad; 
  const usable = pitch - roadW - inset * 2; 
  const towerBlocks = new Set(['0,-80', '80,0']);
  function addBuilding(cx, cz, w, d, h, colorIdx) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const side = sideMats[colorIdx];
    const roof = roofMats[colorIdx];
    const mesh = new THREE.Mesh(geo, [side, side, roof, side, side, side]);
    mesh.position.set(cx, h / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 });
    return mesh;
  }
  function buildingHeight(bx, bz) {
    const dist = Math.hypot(bx, bz);
    const centreBoost = (1 - Math.min(dist, 240) / 300) * 18;
    return Math.min(45, 8 + centreBoost + rng() * 16);
  }
  for (const bx of blockCentres) {
    for (const bz of blockCentres) {
      if (bx >= beachX) continue; 
      if (towerBlocks.has(`${bx},${bz}`)) continue; 
      const nearCentre = Math.abs(bx) <= 40 && Math.abs(bz) <= 40;
      const roll = rng();
      const count = roll < 0.25 ? 1 : roll < 0.6 ? 2 : roll < 0.85 ? 3 : 4;
      const colorIdx = Math.floor(rng() * PALETTE.building.length);
      const halfU = usable / 2;
      if (count === 1) {
        const w = 10 + rng() * 6;
        const d = 10 + rng() * 6;
        const h = nearCentre && rng() < 0.5 ? 38 + rng() * 7 : buildingHeight(bx, bz);
        addBuilding(bx + (rng() - 0.5) * 2, bz + (rng() - 0.5) * 2, w, d, h, colorIdx);
      } else if (count === 2) {
        const vertical = rng() < 0.5;
        for (let i = 0; i < 2; i += 1) {
          const off = (i === 0 ? -1 : 1) * halfU / 2;
          const w = vertical ? usable * 0.92 : usable / 2 - 1;
          const d = vertical ? usable / 2 - 1 : usable * 0.92;
          addBuilding(
            bx + (vertical ? 0 : off), bz + (vertical ? off : 0),
            w, d, buildingHeight(bx, bz), (colorIdx + i) % PALETTE.building.length,
          );
        }
      } else {
        const skip = count === 3 ? Math.floor(rng() * 4) : -1;
        let q = 0;
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            if (q === skip) { q += 1; continue; }
            q += 1;
            const w = usable / 2 - 1 + rng() * 1.5;
            const d = usable / 2 - 1 + rng() * 1.5;
            const h = nearCentre && q === 1 && rng() < 0.4 ? 38 + rng() * 7 : buildingHeight(bx, bz);
            addBuilding(bx + sx * halfU / 2, bz + sz * halfU / 2, w, d, h, (colorIdx + q) % PALETTE.building.length);
          }
        }
      }
    }
  }
  addBuilding(0, -80, 16, 16, 45, 4); 
  addBuilding(80, 0, 14, 14, 42, 7); 
  const palmSpots = [];
  for (let i = 0; i < 56; i += 1) {
    const bx = blockCentres[Math.floor(rng() * blockCentres.length)];
    const bz = blockCentres[Math.floor(rng() * blockCentres.length)];
    if (bx >= beachX) continue;
    const sx = rng() < 0.5 ? -1 : 1;
    const sz = rng() < 0.5 ? -1 : 1;
    palmSpots.push({
      x: bx + sx * (pitch / 2 - roadW / 2 - sidewalk / 2),
      z: bz + sz * (pitch / 2 - roadW / 2 - sidewalk / 2),
      h: 4.5 + rng() * 2,
      rot: rng() * Math.PI * 2,
    });
  }
  for (let i = 0; i < 10; i += 1) {
    palmSpots.push({ x: 204 + rng() * 26, z: -220 + rng() * 440, h: 5 + rng() * 2, rot: rng() * Math.PI * 2 });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.trunk, roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
  const frondGeo = new THREE.PlaneGeometry(3.2, 0.9);
  const frondMat = new THREE.MeshStandardMaterial({ color: PALETTE.palm, roughness: 0.9, side: THREE.DoubleSide });
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, palmSpots.length * 6);
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    palmSpots.forEach((p, i) => {
      e.set(0, p.rot, 0.08);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(p.x, p.h / 2, p.z), q, new THREE.Vector3(1, p.h, 1));
      trunks.setMatrixAt(i, m);
      for (let f = 0; f < 6; f += 1) {
        e.set(0, p.rot + (f / 6) * Math.PI * 2, 0);
        q.setFromEuler(e);
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0, 0));
        q.multiply(tilt);
        m.compose(
          new THREE.Vector3(p.x + Math.sin(p.rot + (f / 6) * Math.PI * 2) * 1.1, p.h + 0.2, p.z + Math.cos(p.rot + (f / 6) * Math.PI * 2) * 1.1),
          q, one,
        );
        fronds.setMatrixAt(i * 6 + f, m);
      }
    });
  }
  trunks.instanceMatrix.needsUpdate = true;
  fronds.instanceMatrix.needsUpdate = true;
  trunks.castShadow = true;
  group.add(trunks);
  group.add(fronds);
  const lampSpots = [];
  for (const sx of streets) {
    for (const sz of streets) lampSpots.push({ x: sx + 8, z: sz + 8 });
  }
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 5, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.6, metalness: 0.6 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
  const bulbGeo = new THREE.SphereGeometry(0.28, 8, 6);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffdf8a, emissiveIntensity: 1.2 });
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampSpots.length);
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    lampSpots.forEach((p, i) => {
      m.compose(new THREE.Vector3(p.x, 2.5, p.z), q, one);
      poles.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, 5.1, p.z), q, one);
      bulbs.setMatrixAt(i, m);
    });
  }
  poles.instanceMatrix.needsUpdate = true;
  bulbs.instanceMatrix.needsUpdate = true;
  group.add(poles);
  group.add(bulbs);
  function makeBillboardTexture(lines, bg, fg) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.fillText(lines[0], 256, lines[1] ? 96 : 128);
    if (lines[1]) {
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText(lines[1], 256, 182);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const billboards = [];
  function addBillboard(x, z, angle, lines, bg, fg) {
    const tex = makeBillboardTexture(lines, bg, fg);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.6,
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), mat);
    board.position.set(x, 11, z);
    board.rotation.y = angle;
    board.castShadow = true;
    group.add(board);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.8, metalness: 0.4 });
    for (const dx of [-5, 5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 6), postMat);
      post.position.set(x + Math.cos(angle) * dx, 3.5, z - Math.sin(angle) * dx);
      post.castShadow = true;
      group.add(post);
    }
    billboards.push({ mat, base: 0.55 });
  }
  addBillboard(-60, -140, Math.PI / 2, ['SOLMAR', 'SUNSET CITY'], '#e8543f', '#fff2cc');
  addBillboard(140, 60, -Math.PI / 2, ['Costa Verde FM', '98.5 • ALL DAY'], '#2a4a66', '#ffd98a');
  addBillboard(60, 180, Math.PI, ['Marina', 'BOATS • SUNSET TOURS'], '#2e7f9e', '#ffffff');
  const landmarks = {
    garage: { x: -60, z: 60 }, 
    hospital: { x: 20, z: -100 }, 
    docks: { x: 180, z: 140 }, 
    motel: { x: -140, z: 100 }, 
    safehouse: { x: -180, z: -180 }, 
    corner: { x: 60, z: -60 }, 
  };
  const DISTRICTS = [
    { name: 'Palm Heights', x0: -240, z0: -240, x1: -120, z1: 0 },
    { name: 'Old Town', x0: -120, z0: -240, x1: 0, z1: 0 },
    { name: 'Downtown', x0: 0, z0: -240, x1: 120, z1: 0 },
    { name: 'Sunset Beach', x0: 120, z0: -240, x1: 240, z1: 0 },
    { name: 'Solmar Hills', x0: -240, z0: 0, x1: -120, z1: 240 },
    { name: 'Marlin Quarter', x0: -120, z0: 0, x1: 0, z1: 240 },
    { name: 'Sunset Strip', x0: 0, z0: 0, x1: 120, z1: 240 },
    { name: 'Marina District', x0: 120, z0: 0, x1: 240, z1: 240 },
  ];
  function districtAt(x, z) {
    const cx = Math.max(-half, Math.min(half - 0.001, x));
    const cz = Math.max(-half, Math.min(half - 0.001, z));
    for (const d of DISTRICTS) {
      if (cx >= d.x0 && cx < d.x1 && cz >= d.z0 && cz < d.z1) return d;
    }
    return DISTRICTS[0];
  }
  let time = 0;
  let nextBlink = 6 + rng() * 4;
  let blinkUntil = -1;
  let blinkIdx = -1;
  function update(dt) {
    time += dt;
    sea.position.y = 0.02 + Math.sin(time * 0.8) * 0.06;
    sea.position.x = waterX + 32 + Math.sin(time * 0.5) * 0.4;
    if (blinkIdx >= 0 && time >= blinkUntil) {
      billboards[blinkIdx].mat.emissiveIntensity = billboards[blinkIdx].base;
      blinkIdx = -1;
      nextBlink = time + 6 + rng() * 6;
    } else if (blinkIdx < 0 && time >= nextBlink) {
      blinkIdx = Math.floor(rng() * billboards.length);
      billboards[blinkIdx].mat.emissiveIntensity = 0.05;
      blinkUntil = time + 0.35;
    }
  }
  const city = { update, colliders, roads, landmarks, DISTRICTS, districtAt };
  G.city = city;
  return city;
}
