export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;
export const CITY = {
  half: 240, 
  pitch: 40, 
  roadW: 12, 
  sidewalk: 3, 
  beachX: 200, 
  waterX: 236, 
  blockPad: 2, 
};
export const PLAYER = {
  walk: 4.2,
  run: 7.2,
  radius: 0.55,
  health: 100,
  enterDist: 3.2, 
  stealTime: 0.6, 
};
export const CAR = {
  accel: 15,
  brake: 34,
  reverseMax: 9,
  maxSpeed: 38,
  steerMax: 0.55,
  grip: 6.5, 
  radius: 1.6, 
  length: 4.4,
  width: 2.0,
};
export const TRAFFIC = { cars: 14, speedMin: 9, speedMax: 14, peds: 22, pedSpeed: 1.4 };
export const WANTED = {
  max: 5,
  steal: 1,
  hitPed: 2,
  shoot: 1,
  killCop: 2,
  decaySeconds: 22, 
  copNearDist: 60,
  policeCarsPerStar: 1,
  maxPoliceCars: 4,
  footCopsFrom: 2, 
  maxFootCops: 3,
};
export const COMBAT = {
  pistolDamage: 34,
  pistolRange: 70,
  magSize: 12,
  reloadSeconds: 1.2,
  fireInterval: 0.22,
  enemyHp: 100,
  enemyDamage: 6,
  enemyFireInterval: 0.9,
  enemyRange: 38,
  enemyAccuracy: 0.45, 
};
export const MISSIONS = [
  {
    id: 'm1',
    title: 'First Wheels',
    brief: 'Dario needs a ride. Steal any car and bring it to the garage on Marlin Street.',
    reward: 500,
  },
  {
    id: 'm2',
    title: 'The Drop',
    brief: 'Pick up the package at the docks, then deliver it to the Coral Motel. Cops are watching the docks — keep it clean.',
    reward: 800,
  },
  {
    id: 'm3',
    title: 'Street Heat',
    brief: 'The Vipers took the corner on 5th. Clear them out, then lose the heat at the safehouse.',
    reward: 1200,
  },
  {
    id: 'm4',
    title: 'Hot Pursuit',
    brief: 'Steal a fast car, draw the police up to wanted 3, then lose them at the marina lookout.',
    reward: 1500,
  },
  {
    id: 'm5',
    title: 'On the Clock',
    brief: 'Pick up the rush delivery at the hospital and run it to the Coral Motel within 90 seconds.',
    reward: 1800,
  },
  {
    id: 'm6',
    title: "Vipers' Last Stand",
    brief: 'The Vipers regrouped on the corner on 9th. Clear the bigger crew, then escape to the safehouse.',
    reward: 2200,
  },
  {
    id: 'm7',
    title: 'Quiet Hands',
    brief: 'Grab the stash at the docks and reach the safehouse. Stay at wanted 1 or below for a $500 clean bonus.',
    reward: 2000,
  },
  {
    id: 'm8',
    title: 'Sunset Run',
    brief: 'Meet Dario at the garage, run the package to the docks on a 120-second clock, and finish on the beach at sunset.',
    reward: 3500,
  },
];
export const PALETTE = {
  sky: 0x8ec3e8,
  horizon: 0xffd9a0,
  fog: 0xd8e4ee,
  sun: 0xfff2cc,
  ground: 0x8a7f6a,
  road: 0x3a3f46,
  roadLine: 0xd8c95a,
  sidewalk: 0x9a938a,
  sand: 0xe8d5a4,
  water: 0x2e7f9e,
  building: [0xe8dcc8, 0xd9a06b, 0xc97b5a, 0x7fb3a3, 0xe0b45c, 0x9a7fb0, 0xf2ede4, 0xb0c4d8],
  glass: 0x2a4a66,
  palm: 0x3f7d4e,
  trunk: 0x7a5a3a,
  police: 0x1c4ed8,
  player: 0xe8543f,
  enemy: 0x7a2e2e,
  marker: 0xffc93c,
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const SAVE_KEY = 'solmar-sunset.save.v1';
export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  brake: ['Space'],
  enter: ['KeyE'],
  shoot: ['KeyF'],
  reload: ['KeyR'],
  pause: ['KeyP', 'Escape'],
  confirm: ['Enter', 'Space'],
  mute: ['KeyM'],
  mission: ['KeyM'], 
};
