const ITEMS = [
  { id: 'ammo', name: 'Ammo Refill', price: 150, desc: 'Refills the pistol mag (12 rounds).' },
  { id: 'ammo_pistol', name: 'Pistol Ammo', price: 80, desc: '+48 pistol reserve ammo.' },
  { id: 'ammo_smg', name: 'SMG Ammo', price: 120, desc: '+120 SMG reserve ammo.' },
  { id: 'ammo_shotgun', name: 'Shotgun Shells', price: 150, desc: '+24 shotgun reserve ammo.' },
  { id: 'health', name: 'First Aid', price: 100, desc: 'Restores health to 100 instantly.' },
  { id: 'armor', name: 'Body Armor', price: 300, desc: 'Halves damage taken until the next bust.' },
  { id: 'engine', name: 'Engine Tune', price: 800, desc: 'Top speed +15% on any car you drive.', upgrade: true },
  { id: 'tires', name: 'Sport Tires', price: 500, desc: 'Grip +25% — sharper steering, less drift.', upgrade: true },
  { id: 'frame', name: 'Reinforced Frame', price: 600, desc: 'Car max HP +50 (100 → 150).', upgrade: true },
  { id: 'neon', name: 'Neon Underglow', price: 300, desc: 'Cyan underglow on your ride.', upgrade: true },
  { id: 'paint', name: 'Chrome Paint', price: 400, desc: 'Mirror-chrome paint job.', upgrade: true },
];
export const UPGRADE_IDS = ['engine', 'tires', 'frame', 'neon', 'paint'];
export function createShop(G) {
  if (!G.upgrades || typeof G.upgrades !== 'object') {
    G.upgrades = { engine: false, tires: false, frame: false, neon: false, paint: false };
  }
  const SHOP_POS = { x: -60, z: 44 }; 
  const SHOP_RADIUS = 6;
  const SAFE_RADIUS = 7;
  const HEAL_RATE = 12; 
  const safe = G.city?.landmarks?.safehouse ?? { x: -180, z: -180 };
  const SAFE_POS = { x: safe.x, z: safe.z };
  function addRing(x, z, color) {
    if (!G.scene || !G.THREE) return null;
    const geo = new G.THREE.RingGeometry(2.2, 3, 32);
    const mat = new G.THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: G.THREE.DoubleSide,
    });
    const mesh = new G.THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    G.scene.add(mesh);
    return mesh;
  }
  const shopRing = addRing(SHOP_POS.x, SHOP_POS.z, 0xffc93c);
  const safeRing = addRing(SAFE_POS.x, SAFE_POS.z, 0x7ee787);
  let time = 0;
  function distTo(p) {
    const pp = G.player?.pos;
    if (!pp) return Infinity;
    return Math.hypot(pp.x - p.x, pp.z - p.z);
  }
  function nearShop() {
    return distTo(SHOP_POS) <= SHOP_RADIUS;
  }
  function nearSafehouse() {
    return distTo(SAFE_POS) <= SAFE_RADIUS;
  }
  function listItems() {
    return ITEMS.map((i) => ({
      ...i,
      owned: i.upgrade ? !!G.upgrades?.[i.id] : undefined,
    }));
  }
  function hasUpgrade(id) {
    return !!G.upgrades?.[id];
  }
  function buy(id) {
    const item = ITEMS.find((i) => i.id === id);
    if (!item) return false;
    if (!nearShop()) {
      G.announce?.('Too far from the shop — head to Marlin Street by the garage.');
      return false;
    }
    const p = G.player;
    if (id === 'ammo') {
      const combat = G.api.combat;
      if (!combat) return false;
      if (combat.ammo >= combat.magSize) {
        G.announce?.('Mag already full.');
        return false;
      }
      if (combat.reloading) {
        G.announce?.('Already reloading — wait a second.');
        return false;
      }
    } else if (id === 'health') {
      if (!p || p.health >= 100) {
        G.announce?.('Already at full health.');
        return false;
      }
    } else if (id === 'armor') {
      if (G.armor) {
        G.announce?.('Already wearing armor.');
        return false;
      }
    } else if (item.upgrade) {
      if (G.upgrades?.[id]) {
        G.announce?.(`${item.name} already installed.`);
        return false;
      }
    }
    if (G.cash < item.price) {
      G.announce?.(`Not enough cash — ${item.name} costs $${item.price}.`);
      return false;
    }
    G.cash -= item.price;
    if (id === 'ammo') {
      G.api.combat.reload();
      G.announce?.('Ammo restocked — reloading…');
    } else if (id === 'health') {
      p.health = 100;
      G.announce?.('Patched up — full health.');
    } else if (id === 'armor') {
      G.armor = true;
      G.announce?.('Body armor on — damage halved until the next bust.');
    } else if (id.startsWith('ammo_')) {
      const n = { pistol: 48, smg: 120, shotgun: 24 }[id.slice(5)];
      G.api.combat?.addReserve(id.slice(5), n);
      G.announce?.(`${item.name} bought — +${n} reserve.`);
    } else if (item.upgrade) {
      if (!G.upgrades || typeof G.upgrades !== 'object') {
        G.upgrades = { engine: false, tires: false, frame: false, neon: false, paint: false };
      }
      G.upgrades[id] = true;
      const car = G.player?.car ?? null;
      if (car) G.api.vehicles?.applyUpgrades?.(car);
      G.announce?.(`${item.name} installed — applies to any car you drive.`);
    }
    G.api.audio?.sfx('cash');
    return true;
  }
  function hasArmor() {
    return !!G.armor;
  }
  function setArmor(v) {
    G.armor = !!v;
  }
  function update(dt) {
    time += dt;
    const pulse = 0.55 + 0.25 * Math.sin(time * 2.4);
    if (shopRing) shopRing.material.opacity = pulse;
    if (safeRing) safeRing.material.opacity = pulse;
    if (G.screen === 'over' && G.armor) G.armor = false;
    const p = G.player;
    if (p && p.alive && nearSafehouse() && p.health < 100) {
      p.health = Math.min(100, p.health + HEAL_RATE * dt);
      if (p.health >= 100) G.announce?.('Safehouse — patched up, full health.');
    }
  }
  return {
    update,
    listItems,
    buy,
    hasUpgrade,
    nearShop,
    nearSafehouse,
    hasArmor,
    setArmor,
    shopPos: { ...SHOP_POS },
    safePos: { ...SAFE_POS },
    SHOP_RADIUS,
    SAFE_RADIUS,
    distToShop: () => distTo(SHOP_POS),
    distToSafehouse: () => distTo(SAFE_POS),
  };
}
