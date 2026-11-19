import { SAVE_KEY } from './config.js';
export function createSave() {
  function load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return null;
      return {
        cash: Number.isFinite(data.cash) ? data.cash : 0,
        done: Array.isArray(data.done) ? data.done : [],
        garage: Number.isFinite(data.garage) ? data.garage : 0,
        bestWanted: Number.isFinite(data.bestWanted) ? data.bestWanted : 0,
        respect: Number.isFinite(data.respect) ? data.respect : 0,
        upgrades: (typeof data.upgrades === 'object' && data.upgrades !== null) ? data.upgrades : {},
      };
    } catch {
      return null;
    }
  }
  function save(data) {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false; 
    }
  }
  function clear() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
    }
  }
  return { load, save, clear };
}
