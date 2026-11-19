import { KEYS } from './config.js';
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;
export const ACTION_RELOAD = 16;
export const ACTION_RADIO = 32;
export const ACTION_SHOP = 64;
export const ACTION_WEAPON1 = 128;
export const ACTION_WEAPON2 = 256;
export const ACTION_WEAPON3 = 512;
function keyAction(code) {
  if (KEYS.confirm.includes(code)) return ACTION_CONFIRM;
  if (KEYS.pause.includes(code)) return ACTION_PAUSE;
  if (KEYS.enter.includes(code)) return ACTION_ENTER;
  if (KEYS.shoot.includes(code)) return ACTION_SHOOT;
  if (KEYS.reload.includes(code)) return ACTION_RELOAD;
  if (code === 'KeyQ') return ACTION_RADIO;
  if (code === 'KeyB') return ACTION_SHOP;
  if (code === 'Digit1') return ACTION_WEAPON1;
  if (code === 'Digit2') return ACTION_WEAPON2;
  if (code === 'Digit3') return ACTION_WEAPON3;
  return 0;
}
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, dragging: false };
  let lastX = 0;
  let lastY = 0;
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', (e) => {
    mouse.down = true;
    mouse.dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
    mouse.dragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (mouse.dragging) {
      mouse.dx += e.clientX - lastX;
      mouse.dy += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  canvas.addEventListener('click', () => pressed.add('MouseShoot'));
  function has(list) {
    for (const code of list) if (keys.has(code)) return true;
    return false;
  }
  return {
    keys,
    mouse,
    move() {
      const f = (has(KEYS.up) ? 1 : 0) - (has(KEYS.down) ? 1 : 0);
      const s = (has(KEYS.right) ? 1 : 0) - (has(KEYS.left) ? 1 : 0);
      return { f, s };
    },
    running() {
      return has(KEYS.run);
    },
    braking() {
      return keys.has('Space');
    },
    shooting() {
      return keys.has('KeyF') || mouse.down;
    },
    takeActions() {
      let actions = 0;
      for (const code of pressed) actions |= keyAction(code);
      if (pressed.has('MouseShoot')) actions |= ACTION_SHOOT;
      pressed.clear();
      return actions;
    },
    takeDrag() {
      const d = { x: mouse.dx, y: mouse.dy };
      mouse.dx = 0;
      mouse.dy = 0;
      return d;
    },
  };
}
