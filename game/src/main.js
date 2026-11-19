import * as THREE from '../vendor/three.module.min.js';
import { STEP, MAX_FRAME, CITY, PALETTE, MISSIONS } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_SHOOT, ACTION_RELOAD, ACTION_RADIO, ACTION_SHOP, ACTION_WEAPON1, ACTION_WEAPON2, ACTION_WEAPON3 } from './input.js';
import { createCity } from './city.js';
import { createVehicles } from './vehicles.js';
import { createPlayer } from './player.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createRoadblocks } from './roadblocks.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { createRadio } from './radio.js';
import { createShop } from './shop.js';
import { createHUD } from './hud.js';
import { createAudio } from './audio.js';
import { createSave } from './save.js';
import { stageShot } from './shots.js';
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const G = {
  THREE,
  scene: null,
  camera: null,
  renderer: null,
  rng: createRandom(seed),
  input: null,
  screen: 'title',
  clock: { time: 0, dayMinutes: 480 }, 
  player: null, 
  city: null, 
  cars: [], 
  peds: [], 
  cops: [], 
  enemies: [], 
  wanted: 0,
  cash: 0,
  garage: 0,
  doneMissions: [],
  bestWanted: 0,
  mission: null, 
  pendingMission: null, 
  respect: 0, 
  armor: false, 
  camYaw: 0, 
  shotCamera: null, 
  api: {},
  announce,
  addCash,
  addHeat,
  setMission,
  clearMission,
  collideCircle,
  clampToCity,
  resetWorld,
  stepWorld,
  render,
};
function announce(text) {
  G.api.hud?.message(text);
  status.textContent = text;
}
function addCash(n) {
  G.cash = Math.max(0, G.cash + n);
  if (n > 0) G.api.audio?.sfx('cash');
}
function addHeat(n, why) {
  G.api.police?.addHeat(n, why);
}
function setMission(mission) {
  G.mission = mission;
  G.api.hud?.setObjective(mission ? mission.objective : 'Free roam — explore Solmar');
}
function clearMission() {
  G.mission = null;
  G.api.hud?.setObjective('Free roam — explore Solmar');
}
function collideCircle(x, z, r) {
  const cols = G.city?.colliders ?? [];
  for (let i = 0; i < cols.length; i += 1) {
    const c = cols[i];
    if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) {
      const dxl = x + r - c.x0;
      const dxr = c.x1 - (x - r);
      const dzl = z + r - c.z0;
      const dzr = c.z1 - (z - r);
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) x = c.x0 - r;
      else if (m === dxr) x = c.x1 + r;
      else if (m === dzl) z = c.z0 - r;
      else z = c.z1 + r;
    }
  }
  return { x, z };
}
function clampToCity(x, z, r) {
  const h = CITY.half - r;
  x = Math.max(-h, Math.min(h, x));
  z = Math.max(-h, Math.min(h, z));
  if (x > CITY.waterX - r) x = CITY.waterX - r; 
  return { x, z };
}
function buildScene() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 180, 520);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 40, 90);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.6);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 600;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(PALETTE.sky, 0x8a7f6a, 0.9);
  scene.add(hemi);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  G.renderer = renderer;
  G.scene = scene;
  G.camera = camera;
}
function updateCamera(dt) {
  const p = G.player;
  if (!p) return;
  if (G.shotCamera) {
    G.camera.position.copy(G.shotCamera.pos);
    G.camera.lookAt(G.shotCamera.lookAt);
    return;
  }
  const drag = G.input.takeDrag();
  G.camYaw -= drag.x * 0.003;
  G.camYaw *= Math.pow(0.4, dt); 
  const inCar = !p.onFoot && p.car;
  const dist = inCar ? 11 : 7;
  const height = inCar ? 4.2 : 3.2;
  const yaw = p.angle + Math.PI + G.camYaw;
  const tx = p.pos.x + Math.sin(yaw) * dist;
  const tz = p.pos.z + Math.cos(yaw) * dist;
  const k = 1 - Math.pow(0.001, dt); 
  G.camera.position.x += (tx - G.camera.position.x) * k;
  G.camera.position.y += (p.pos.y + height - G.camera.position.y) * k;
  G.camera.position.z += (tz - G.camera.position.z) * k;
  G.camera.lookAt(p.pos.x - Math.sin(p.angle) * 4, p.pos.y + 1.6, p.pos.z - Math.cos(p.angle) * 4);
}
function stepWorld(dt) {
  G.clock.time += dt;
  G.clock.dayMinutes = (480 + G.clock.time * 0.5) % 1440; 
  G.api.city?.update(dt);
  G.api.vehicles?.update(dt);
  G.api.player?.update(dt);
  G.api.traffic?.update(dt);
  G.api.police?.update(dt);
  G.api.roadblocks?.update(dt);
  G.api.combat?.update(dt);
  G.api.missions?.update(dt);
  G.api.radio?.update();
  G.api.shop?.update(dt);
  G.api.audio?.engine(G.player?.car ? Math.abs(G.player.car.speed) / 38 : 0, !!G.player?.car);
  G.api.audio?.siren(G.wanted >= 2);
  updateCamera(dt);
}
function render() {
  G.api.hud?.update();
  G.renderer.render(G.scene, G.camera);
}
function resetWorld() {
  const p = G.player;
  if (p) {
    p.health = 100;
    p.alive = true;
    p.onFoot = true;
    p.car = null;
    p.pos.set(0, 0, 20);
    p.angle = Math.PI;
    p.speed = 0;
  }
  G.wanted = 0;
  G.mission = null;
  G.api.shop?.setArmor(false); 
  G.api.police?.reset();
  G.api.roadblocks?.reset();
  G.api.combat?.reset();
  G.api.missions?.reset();
  G.api.traffic?.reset();
  G.api.vehicles?.resetPlayerCar();
  G.shotCamera = null;
  G.camYaw = 0;
}
function startGame() {
  G.api.audio?.unlock();
  G.api.audio?.sfx('click');
  resetWorld();
  G.screen = 'playing';
  G.api.hud?.show(true);
  document.getElementById('title').classList.remove('on');
  document.getElementById('gameover').classList.remove('on');
  G.api.hud?.setObjective('Free roam — explore Solmar');
  if (G.pendingMission) {
    const id = G.pendingMission;
    G.pendingMission = null;
    G.api.missions?.start(id);
  }
  announce('Welcome to Solmar. Steal a car with E, or open a mission from the menu.');
}
function pauseGame() {
  if (G.screen !== 'playing') return;
  G.screen = 'paused';
  document.getElementById('pause').classList.add('on');
  G.api.hud?.show(false);
  saveNow();
  announce('Paused.');
}
function resumeGame() {
  if (G.screen !== 'paused') return;
  G.screen = 'playing';
  document.getElementById('pause').classList.remove('on');
  G.api.hud?.show(true);
  announce('Playing.');
}
function bustPlayer() {
  G.screen = 'over';
  const fee = Math.min(G.cash, 100);
  G.cash -= fee;
  document.getElementById('gameovertext').textContent =
    fee > 0 ? `You went down. The crew pulled you out — hospital bill $${fee}.` : 'You went down. The crew pulled you out.';
  document.getElementById('gameover').classList.add('on');
  G.api.hud?.show(false);
  G.api.audio?.sfx('fail');
  saveNow();
  announce('Busted.');
}
function respawn() {
  const hospital = G.city?.landmarks?.hospital ?? { x: 0, z: -20 };
  resetWorld();
  G.player.pos.set(hospital.x, 0, hospital.z);
  G.player.angle = 0;
  G.screen = 'playing';
  document.getElementById('gameover').classList.remove('on');
  G.api.hud?.show(true);
  G.api.hud?.setObjective('Free roam — explore Solmar');
  announce('Back on the streets of Solmar.');
}
function saveNow() {
  G.api.save?.save({
    cash: G.cash,
    done: G.doneMissions,
    garage: G.garage,
    bestWanted: G.bestWanted,
    respect: G.respect | 0,
    upgrades: G.upgrades ?? {},
  });
}
function runShot(name) {
  document.getElementById('title').classList.remove('on');
  document.getElementById('pause').classList.remove('on');
  document.getElementById('gameover').classList.remove('on');
  const scene = stageShot(G, name);
  if (G.shotCamera) {
    G.camera.position.copy(G.shotCamera.pos);
    G.camera.lookAt(G.shotCamera.lookAt);
  }
  let painted = 0;
  function paint() {
    render();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  G.api.hud?.show(true);
  requestAnimationFrame(paint);
  return scene;
}
function runGame() {
  const input = G.input;
  let accumulator = 0;
  let last = performance.now();
  document.getElementById('startbtn').addEventListener('click', startGame);
  document.getElementById('continuebtn').addEventListener('click', () => {
    G.api.audio?.unlock();
    startGame();
  });
  document.getElementById('resumebtn').addEventListener('click', resumeGame);
  document.getElementById('quitbtn').addEventListener('click', () => {
    saveNow();
    G.screen = 'title';
    document.getElementById('pause').classList.remove('on');
    document.getElementById('title').classList.add('on');
    G.api.hud?.show(false);
    resetWorld();
  });
  document.getElementById('respawnbtn').addEventListener('click', respawn);
  window.addEventListener('beforeunload', saveNow);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_PAUSE) {
      if (G.screen === 'playing') pauseGame();
      else if (G.screen === 'paused') resumeGame();
    }
    if (G.screen === 'playing') {
      if (actions & ACTION_ENTER) G.api.vehicles?.tryEnterOrSteal();
      if (actions & ACTION_RELOAD) G.api.combat?.reload();
      if (actions & ACTION_WEAPON1) G.api.combat?.switchTo('pistol');
      if (actions & ACTION_WEAPON2) G.api.combat?.switchTo('smg');
      if (actions & ACTION_WEAPON3) G.api.combat?.switchTo('shotgun');
      if (actions & ACTION_RADIO) G.api.radio?.next();
      if (actions & ACTION_SHOP) G.api.hud?.toggleShop();
      if (G.player && G.player.health <= 0 && G.player.alive) {
        G.player.alive = false;
        bustPlayer();
      }
      accumulator += dt;
      while (accumulator >= STEP) {
        stepWorld(STEP);
        accumulator -= STEP;
      }
    } else if (G.screen === 'title') {
      accumulator += dt;
      while (accumulator >= STEP) {
        G.clock.time += STEP;
        G.api.traffic?.update(STEP);
        G.api.city?.update(STEP);
        accumulator -= STEP;
      }
      const t = G.clock.time * 0.05;
      G.camera.position.set(Math.sin(t) * 150, 70, Math.cos(t) * 150);
      G.camera.lookAt(0, 0, 0);
    }
    render();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'playing') pauseGame();
  });
  const save = G.api.save.load();
  if (save) {
    G.cash = save.cash;
    G.doneMissions = save.done;
    G.garage = save.garage;
    G.bestWanted = save.bestWanted;
    G.respect = save.respect | 0;
    if (save.upgrades && typeof save.upgrades === 'object') {
      G.upgrades = { engine: false, tires: false, frame: false, neon: false, paint: false, ...save.upgrades };
    }
    document.getElementById('continuebtn').style.display = '';
    G.api.hud?.setMissionList();
  }
  announce('SOLMAR SUNSET. Click START ENGINE to play.');
  requestAnimationFrame(frame);
}
function boot() {
  buildScene();
  G.input = createInput(canvas);
  G.api.save = createSave();
  G.api.audio = createAudio();
  G.api.city = createCity(G);
  G.api.vehicles = createVehicles(G);
  G.api.player = createPlayer(G);
  G.api.traffic = createTraffic(G);
  G.api.police = createPolice(G);
  G.api.roadblocks = createRoadblocks(G);
  G.api.combat = createCombat(G);
  G.api.missions = createMissions(G);
  G.api.radio = createRadio(G);
  G.api.shop = createShop(G);
  G.api.hud = createHUD(G);
  G.api.hud.setMissionList();
  for (const [x, z, color] of [
    [14, 24, 0xe67e22],
    [-16, 16, 0x2e86c1],
    [36, 24, 0x27ae60],
    [64, 16, 0xc0392b],
    [-52, 56, 0x8e44ad],
  ]) {
    G.api.vehicles.spawnCar(x, z, Math.PI / 2, color, 'parked');
  }
  if (shot) runShot(shot);
  else runGame();
}
boot();
