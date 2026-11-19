import { MISSIONS, COMBAT, PALETTE } from './config.js';
const ARRIVE_DIST = 6; 
const INTRO = {
  m1: {
    who: 'DARIO',
    text: 'Leo — I need wheels. Steal any car and bring it to the garage on Marlin Street. Make it quick.',
  },
  m2: {
    who: 'MARLA',
    text: 'Package is waiting at the docks. Pick it up and run it to the Coral Motel. Cops watch the docks — keep it clean.',
  },
  m3: {
    who: 'DARIO',
    text: 'The Vipers took the corner on 5th. Clear them out, then lose the heat at the safehouse.',
  },
  m4: {
    who: 'DARIO',
    text: 'Leo — I need a fast car and a loud exit. Steal something quick, get the whole city looking at you, then shake them off at the marina lookout.',
  },
  m5: {
    who: 'MARLA',
    text: 'A client at the hospital needs a rush delivery to the Coral Motel. Ninety seconds, Leo — the clock is already running.',
  },
  m6: {
    who: 'DARIO',
    text: 'The Vipers regrouped on the corner on 9th — more of them this time. Wipe them out, then vanish to the safehouse.',
  },
  m7: {
    who: 'MARLA',
    text: 'There is a stash at the docks. Grab it quiet and bring it to the safehouse. Stay under the radar and there is a bonus in it for you.',
  },
  m8: {
    who: 'DARIO',
    text: 'Last job, Leo. Meet me at the garage, run the package to the docks, and we finish this on the beach at sunset. Make it count.',
  },
};
function dist2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}
export function createMissions(G) {
  const THREE = G.THREE;
  let pillar = null;
  let diamond = null;
  let beaconTime = 0;
  function ensureBeacon() {
    if (pillar) return;
    const pillarGeo = new THREE.CylinderGeometry(1.4, 1.4, 34, 12, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: PALETTE.marker,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.visible = false;
    G.scene.add(pillar);
    const diamondGeo = new THREE.OctahedronGeometry(1.3);
    const diamondMat = new THREE.MeshBasicMaterial({ color: PALETTE.marker });
    diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.visible = false;
    G.scene.add(diamond);
  }
  function placeBeacon(x, z) {
    ensureBeacon();
    pillar.position.set(x, 17, z);
    diamond.position.set(x, 5, z);
    pillar.visible = true;
    diamond.visible = true;
    if (G.mission) G.mission.marker = new THREE.Vector3(x, 0, z);
  }
  function hideBeacon() {
    if (pillar) pillar.visible = false;
    if (diamond) diamond.visible = false;
  }
  function removeBeacon() {
    if (pillar) {
      G.scene.remove(pillar);
      pillar.geometry.dispose();
      pillar.material.dispose();
      pillar = null;
    }
    if (diamond) {
      G.scene.remove(diamond);
      diamond.geometry.dispose();
      diamond.material.dispose();
      diamond = null;
    }
  }
  let current = null;
  function landmark(name) {
    return G.city?.landmarks?.[name] ?? null;
  }
  function nearestParkedCar() {
    let best = null;
    let bestD = Infinity;
    for (const car of G.cars ?? []) {
      if (car.kind !== 'parked') continue;
      const d = dist2D(G.player.pos.x, G.player.pos.z, car.pos.x, car.pos.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }
  function setStage(stage, objective, markerPos) {
    current.stage = stage;
    current.stageTime = 0;
    if (markerPos) placeBeacon(markerPos.x, markerPos.z);
    G.setMission({
      id: current.def.id,
      title: current.def.title,
      stage,
      objective,
      marker: markerPos ? new THREE.Vector3(markerPos.x, 0, markerPos.z) : null,
    });
    G.announce(objective);
  }
  function complete() {
    const def = current.def;
    const reward = def.reward;
    const id = def.id;
    hideBeacon();
    G.clearMission();
    current = null;
    G.addCash(reward);
    const respectGain = id === 'm8' ? 15 : 10;
    G.respect = (G.respect | 0) + respectGain;
    G.announce(`Mission complete: ${def.title} — +$${reward} · Respect +${respectGain}`);
    if (id === 'm1') G.garage += 1;
    if (!G.doneMissions.includes(id)) G.doneMissions.push(id);
    G.api.save?.save({
      cash: G.cash,
      done: G.doneMissions,
      garage: G.garage,
      bestWanted: G.bestWanted,
      respect: G.respect | 0,
    });
    G.api.hud?.setMissionList();
  }
  function start(id) {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def) return false;
    if (!G.player || !G.city?.landmarks) return false;
    if (current) abort();
    current = { def, stage: 1, stageTime: 0, targetCar: null, enemies: [], startCar: G.player.car ?? null };
    const intro = INTRO[id];
    if (intro) G.api.hud?.dialog(intro.who, intro.text);
    G.api.audio?.sfx('click');
    if (id === 'm1') {
      current.targetCar = nearestParkedCar();
      const markerPos = current.targetCar
        ? { x: current.targetCar.pos.x, z: current.targetCar.pos.z }
        : { x: G.player.pos.x, z: G.player.pos.z };
      setStage(1, 'Steal a car', markerPos);
    } else if (id === 'm2') {
      setStage(1, 'Go to the docks', landmark('docks'));
    } else if (id === 'm3') {
      setStage(1, 'Go to the corner on 5th', landmark('corner'));
    } else if (id === 'm4') {
      current.targetCar = nearestParkedCar();
      const markerPos = current.targetCar
        ? { x: current.targetCar.pos.x, z: current.targetCar.pos.z }
        : { x: G.player.pos.x, z: G.player.pos.z };
      setStage(1, 'Steal a fast car', markerPos);
    } else if (id === 'm5') {
      setStage(1, 'Pick up the delivery at the hospital', landmark('hospital'));
    } else if (id === 'm6') {
      setStage(1, 'Go to the corner on 9th', { x: -100, z: -20 });
    } else if (id === 'm7') {
      setStage(1, 'Grab the stash at the docks', landmark('docks'));
    } else if (id === 'm8') {
      setStage(1, 'Meet Dario at the garage', landmark('garage'));
    }
    return true;
  }
  function abort() {
    if (!current) {
      hideBeacon();
      G.clearMission();
      return;
    }
    for (const e of current.enemies) e.mission = false;
    current = null;
    hideBeacon();
    G.clearMission();
  }
  function reset() {
    abort();
    removeBeacon();
    beaconTime = 0;
  }
  function list() {
    return MISSIONS.map((m) => ({
      ...m,
      done: G.doneMissions.includes(m.id),
    }));
  }
  function updateM1(dt) {
    const p = G.player;
    if (current.stage === 1) {
      if (!p.onFoot && p.car && p.car !== current.startCar) {
        const garage = landmark('garage');
        G.announce('Nice wheels. Now bring it to the garage.');
        setStage(2, 'Drive to the garage', garage);
        return;
      }
      const parked = nearestParkedCar();
      if (parked && parked !== current.targetCar) current.targetCar = parked;
      if (current.targetCar && current.targetCar.kind === 'parked') {
        placeBeacon(current.targetCar.pos.x, current.targetCar.pos.z);
      }
    } else if (current.stage === 2) {
      const garage = landmark('garage');
      if (!garage) return;
      if (!p.onFoot && p.car && dist2D(p.pos.x, p.pos.z, garage.x, garage.z) <= ARRIVE_DIST) {
        complete();
      }
    }
  }
  function updateM2(dt) {
    const p = G.player;
    if (current.stage === 1) {
      const docks = landmark('docks');
      if (!docks) return;
      if (dist2D(p.pos.x, p.pos.z, docks.x, docks.z) <= ARRIVE_DIST) {
        G.announce('Package secured. Deliver it to the Coral Motel.');
        G.api.audio?.sfx('pickup');
        G.addHeat(1, 'picked up the package');
        setStage(2, 'Deliver the package to the motel', landmark('motel'));
      }
    } else if (current.stage === 2) {
      const motel = landmark('motel');
      if (!motel) return;
      if (dist2D(p.pos.x, p.pos.z, motel.x, motel.z) <= ARRIVE_DIST) {
        complete();
      }
    }
  }
  function updateM3(dt) {
    const p = G.player;
    if (current.stage === 1) {
      const corner = landmark('corner');
      if (!corner) return;
      if (dist2D(p.pos.x, p.pos.z, corner.x, corner.z) <= ARRIVE_DIST) {
        const spawn = G.api.combat?.spawnEnemy;
        if (typeof spawn !== 'function') {
          G.announce('The Vipers never showed — job called off.');
          abort();
          return;
        }
        const offsets = [
          { x: 7, z: 2 },
          { x: -6, z: 5 },
          { x: 1, z: -8 },
        ];
        current.enemies = [];
        for (const o of offsets) {
          const e = spawn.call(G.api.combat, corner.x + o.x, corner.z + o.z, COMBAT.enemyHp);
          if (e) {
            e.mission = true; 
            current.enemies.push(e);
          }
        }
        if (current.enemies.length === 0) {
          abort();
          return;
        }
        G.announce('The Vipers are here — clear them out!');
        setStage(2, 'Clear out the Vipers (0/3 down)', corner);
      }
    } else if (current.stage === 2) {
      const alive = current.enemies.filter(
        (e) => e.alive !== false && e.hp > 0 && G.enemies.includes(e),
      );
      const down = current.enemies.length - alive.length;
      const objective = `Clear out the Vipers (${down}/${current.enemies.length} down)`;
      if (G.mission && G.mission.objective !== objective) {
        G.setMission({ ...G.mission, objective });
      }
      if (alive.length === 0) {
        G.announce('Corner is clear. Lose the heat at the safehouse.');
        setStage(3, 'Escape to the safehouse', landmark('safehouse'));
      }
    } else if (current.stage === 3) {
      const safehouse = landmark('safehouse');
      if (!safehouse) return;
      if (dist2D(p.pos.x, p.pos.z, safehouse.x, safehouse.z) <= ARRIVE_DIST) {
        complete();
      }
    }
  }
  const MARINA_LOOKOUT = { x: 216, z: 120 };
  const BEACH_FINISH = { x: 216, z: -60 };
  const CORNER_9TH = { x: -100, z: -20 };
  function updateM4(dt) {
    const p = G.player;
    if (current.stage === 1) {
      if (!p.onFoot && p.car && p.car !== current.startCar) {
        G.announce('Nice wheels. Now make some noise — the cops need to notice you.');
        G.addHeat(1, 'the getaway was spotted');
        setStage(2, 'Draw heat — reach wanted 3', null);
        hideBeacon(); 
        return;
      }
      const parked = nearestParkedCar();
      if (parked && parked !== current.targetCar) current.targetCar = parked;
      if (current.targetCar && current.targetCar.kind === 'parked') {
        placeBeacon(current.targetCar.pos.x, current.targetCar.pos.z);
      }
    } else if (current.stage === 2) {
      const wanted = G.wanted | 0;
      const objective = `Draw heat — wanted ${Math.min(wanted, 3)}/3`;
      if (G.mission && G.mission.objective !== objective) {
        G.setMission({ ...G.mission, objective });
      }
      if (current.stageTime > 25 && wanted < 3 && !current.nudged) {
        current.nudged = true;
        G.addHeat(1, 'the cops spotted the stolen car');
        G.announce('They made the plates — the heat is rising!');
      }
      if (wanted >= 3) {
        G.announce('Three stars! Now lose them at the marina lookout.');
        setStage(3, 'Outrun them — reach the marina lookout', MARINA_LOOKOUT);
      }
    } else if (current.stage === 3) {
      if (dist2D(p.pos.x, p.pos.z, MARINA_LOOKOUT.x, MARINA_LOOKOUT.z) <= ARRIVE_DIST) {
        complete();
      }
    }
  }
  function updateM5(dt) {
    const p = G.player;
    if (current.stage === 1) {
      const hospital = landmark('hospital');
      if (!hospital) return;
      if (dist2D(p.pos.x, p.pos.z, hospital.x, hospital.z) <= ARRIVE_DIST) {
        G.announce('Delivery picked up. 90 seconds — go!');
        G.api.audio?.sfx('pickup');
        setStage(2, 'Deliver to the motel — 90s left', landmark('motel'));
      }
    } else if (current.stage === 2) {
      const left = Math.ceil(90 - current.stageTime);
      if (left <= 0) {
        G.announce('Out of time — the client walked.');
        abort();
        return;
      }
      const objective = `Deliver to the motel — ${left}s left`;
      if (G.mission && G.mission.objective !== objective) {
        G.setMission({ ...G.mission, objective });
      }
      const motel = landmark('motel');
      if (!motel) return;
      if (dist2D(p.pos.x, p.pos.z, motel.x, motel.z) <= ARRIVE_DIST) {
        complete();
      }
    }
  }
  function updateM6(dt) {
    const p = G.player;
    if (current.stage === 1) {
      if (dist2D(p.pos.x, p.pos.z, CORNER_9TH.x, CORNER_9TH.z) <= ARRIVE_DIST) {
        const spawn = G.api.combat?.spawnEnemy;
        if (typeof spawn !== 'function') {
          G.announce('The Vipers never showed — job called off.');
          abort();
          return;
        }
        const offsets = [
          { x: 7, z: 2 },
          { x: -6, z: 5 },
          { x: 1, z: -8 },
          { x: -9, z: -3 },
          { x: 5, z: 8 },
        ];
        current.enemies = [];
        for (const o of offsets) {
          const e = spawn.call(G.api.combat, CORNER_9TH.x + o.x, CORNER_9TH.z + o.z, COMBAT.enemyHp);
          if (e) {
            e.mission = true; 
            current.enemies.push(e);
          }
        }
        if (current.enemies.length === 0) {
          abort();
          return;
        }
        G.announce('The Vipers are here — clear them out!');
        setStage(2, `Clear out the Vipers (0/${current.enemies.length} down)`, CORNER_9TH);
      }
    } else if (current.stage === 2) {
      const alive = current.enemies.filter(
        (e) => e.alive !== false && e.hp > 0 && G.enemies.includes(e),
      );
      const down = current.enemies.length - alive.length;
      const objective = `Clear out the Vipers (${down}/${current.enemies.length} down)`;
      if (G.mission && G.mission.objective !== objective) {
        G.setMission({ ...G.mission, objective });
      }
      if (alive.length === 0) {
        G.announce('Corner is clear. Lose the heat at the safehouse.');
        setStage(3, 'Escape to the safehouse', landmark('safehouse'));
      }
    } else if (current.stage === 3) {
      const safehouse = landmark('safehouse');
      if (!safehouse) return;
      if (dist2D(p.pos.x, p.pos.z, safehouse.x, safehouse.z) <= ARRIVE_DIST) {
        complete();
      }
    }
  }
  function updateM7(dt) {
    const p = G.player;
    if (current.stage === 1) {
      const docks = landmark('docks');
      if (!docks) return;
      if (dist2D(p.pos.x, p.pos.z, docks.x, docks.z) <= ARRIVE_DIST) {
        current.clean = true; 
        G.announce('Stash secured. Stay quiet — keep wanted at 1 or below.');
        G.api.audio?.sfx('pickup');
        setStage(2, 'Reach the safehouse — stay quiet', landmark('safehouse'));
      }
    } else if (current.stage === 2) {
      if (current.clean && (G.wanted | 0) > 1) {
        current.clean = false;
        G.announce('You drew heat — the clean bonus is gone. The job still pays.');
      }
      const safehouse = landmark('safehouse');
      if (!safehouse) return;
      if (dist2D(p.pos.x, p.pos.z, safehouse.x, safehouse.z) <= ARRIVE_DIST) {
        if (current.clean) {
          G.addCash(500);
          G.respect = (G.respect | 0) + 5;
          G.announce('Clean bonus: +$500 · Respect +5');
        }
        complete();
      }
    }
  }
  function updateM8(dt) {
    const p = G.player;
    if (current.stage === 1) {
      const garage = landmark('garage');
      if (!garage) return;
      if (dist2D(p.pos.x, p.pos.z, garage.x, garage.z) <= ARRIVE_DIST) {
        G.announce('Dario hands you the package. The whole city is about to know your name.');
        G.api.audio?.sfx('pickup');
        G.addHeat(2, 'the Sunset Run is on');
        setStage(2, 'Deliver the package to the docks — 120s left', landmark('docks'));
      }
    } else if (current.stage === 2) {
      const left = Math.ceil(120 - current.stageTime);
      if (left <= 0) {
        G.announce('Too slow — the buyer walked.');
        abort();
        return;
      }
      const objective = `Deliver the package to the docks — ${left}s left`;
      if (G.mission && G.mission.objective !== objective) {
        G.setMission({ ...G.mission, objective });
      }
      const docks = landmark('docks');
      if (!docks) return;
      if (dist2D(p.pos.x, p.pos.z, docks.x, docks.z) <= ARRIVE_DIST) {
        G.announce('Package delivered. One last stop — the beach at sunset.');
        setStage(3, 'Finish at the beach — sunset is waiting', BEACH_FINISH);
      }
    } else if (current.stage === 3) {
      if (dist2D(p.pos.x, p.pos.z, BEACH_FINISH.x, BEACH_FINISH.z) <= ARRIVE_DIST) {
        complete();
      }
    }
  }
  function update(dt) {
    if (current && pillar?.visible && diamond?.visible) {
      beaconTime += dt;
      const pulse = 0.5 + 0.5 * Math.sin(beaconTime * 3);
      pillar.material.opacity = 0.16 + 0.12 * pulse;
      diamond.position.y = 5 + Math.sin(beaconTime * 2.2) * 0.6;
      diamond.rotation.y += dt * 1.5;
      const s = 1 + 0.18 * pulse;
      diamond.scale.set(s, s, s);
    }
    if (!current || !G.player) return;
    current.stageTime += dt;
    if (current.def.id === 'm1') updateM1(dt);
    else if (current.def.id === 'm2') updateM2(dt);
    else if (current.def.id === 'm3') updateM3(dt);
    else if (current.def.id === 'm4') updateM4(dt);
    else if (current.def.id === 'm5') updateM5(dt);
    else if (current.def.id === 'm6') updateM6(dt);
    else if (current.def.id === 'm7') updateM7(dt);
    else if (current.def.id === 'm8') updateM8(dt);
  }
  return { update, start, abort, reset, list };
}
