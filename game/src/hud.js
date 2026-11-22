import { MISSIONS, CITY } from './config.js';
const MAP_SIZE = 220; 
const MAP_SCALE = MAP_SIZE / (CITY.half * 2);
const FEED_KEEP = 4;
const DIALOG_MS = 4000;
function pad2(n) {
  return String(n).padStart(2, '0');
}
function toMap(x, z) {
  return [(x + CITY.half) * MAP_SCALE, (z + CITY.half) * MAP_SCALE];
}
export function createHUD(G) {
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $('hud'),
    stars: $('stars'),
    cash: $('cash'),
    respect: $('respect'),
    weapon: $('weapon'),
    healthfill: $('healthfill'),
    clock: $('clock'),
    district: $('district'),
    minimap: $('minimap'),
    speed: $('speed'),
    objective: $('objective'),
    objtext: $('objtext'),
    feed: $('feed'),
    dialog: $('dialog'),
    dialogface: $('dialogface'),
    dialogwho: $('dialogwho'),
    dialogtext: $('dialogtext'),
    missioncard: $('missioncard'),
    mcid: $('mcid'),
    mcfill: $('mcfill'),
    mcnext: $('mcnext'),
    mctime: $('mctime'),
    pdpanel: $('pdpanel'),
    pdhead: $('pdhead'),
    pdrows: $('pdrows'),
    hint: $('hint'),
    crosshair: $('crosshair'),
    vignette: $('vignette'),
    missionlist: $('missionlist'),
    radio: $('radio'),
    shop: $('shop'),
    shoplist: $('shoplist'),
  };
  const mapCtx = el.minimap ? el.minimap.getContext('2d') : null;
  const shopCloseBtn = document.getElementById('shopclosebtn');
  if (shopCloseBtn) shopCloseBtn.addEventListener('click', () => toggleShop(false));
  let frame = 0;
  let dialogUntil = 0;
  let flashUntil = 0;
  let last = { stars: '', cash: '', respect: '', weapon: '', health: -1, clock: '', district: '', speed: '', radio: '', hint: '' };
  function show(on) {
    if (el.hud) el.hud.classList.toggle('on', !!on);
  }
  function setObjective(text) {
    if (el.objtext) el.objtext.textContent = text;
  }
  function message(text) {
    if (!el.feed) return;
    const div = document.createElement('div');
    div.textContent = text;
    el.feed.prepend(div);
    while (el.feed.children.length > FEED_KEEP) {
      el.feed.removeChild(el.feed.lastChild);
    }
    for (let i = 0; i < el.feed.children.length; i += 1) {
      el.feed.children[i].style.opacity = String(1 - i * 0.22);
    }
  }
  function dialog(who, text) {
    if (!el.dialog) return;
    if (el.dialogface) el.dialogface.textContent = who.slice(0, 2);
    if (el.dialogwho) el.dialogwho.textContent = who;
    if (el.dialogtext) el.dialogtext.textContent = text;
    el.dialog.style.display = 'block';
    dialogUntil = performance.now() + DIALOG_MS;
  }
  function flash() {
    flashUntil = performance.now() + 350;
  }
  function setMissionList() {
    if (!el.missionlist) return;
    el.missionlist.innerHTML = '';
    for (const m of MISSIONS) {
      const done = G.doneMissions.includes(m.id);
      const row = document.createElement('div');
      row.className = done ? 'done' : 'todo';
      const picked = G.pendingMission === m.id;
      row.textContent = `${picked ? '▶ ' : done ? '✓ ' : '○ '}${m.title} — $${m.reward}`;
      row.style.cursor = 'pointer';
      row.title = 'Click to play this mission';
      row.addEventListener('click', () => {
        G.pendingMission = m.id;
        setMissionList();
      });
      el.missionlist.appendChild(row);
    }
  }
  function renderShopList() {
    if (!el.shoplist) return;
    el.shoplist.innerHTML = '';
    const shop = G.api.shop;
    if (!shop) return;
    const near = shop.nearShop();
    const note = document.createElement('p');
    note.className = 'shopnote';
    note.textContent = near
      ? `Cash: $${G.cash} — Marlin Street Shop`
      : 'You need to be at the shop on Marlin Street, by the garage, to buy.';
    el.shoplist.appendChild(note);
    for (const item of shop.listItems()) {
      const row = document.createElement('div');
      row.className = 'shoprow';
      const label = document.createElement('span');
      label.textContent = `${item.name} — $${item.price} · ${item.desc}`;
      const btn = document.createElement('button');
      btn.className = 'smallbtn shopbuy';
      btn.textContent = item.owned ? 'OWNED' : 'BUY';
      btn.disabled = !near || G.cash < item.price || !!item.owned;
      btn.addEventListener('click', () => {
        if (shop.buy(item.id)) renderShopList();
      });
      row.appendChild(label);
      row.appendChild(btn);
      el.shoplist.appendChild(row);
    }
  }
  function toggleShop(force) {
    if (!el.shop) return false;
    const open = typeof force === 'boolean' ? force : !el.shop.classList.contains('on');
    if (open) {
      renderShopList();
      el.shop.classList.add('on');
      if (el.objective) el.objective.style.display = 'none';
    } else {
      el.shop.classList.remove('on');
      if (el.objective) el.objective.style.display = '';
    }
    return open;
  }
  function drawMinimap(now) {
    if (!mapCtx) return;
    const ctx = mapCtx;
    const S = MAP_SIZE;
    ctx.fillStyle = '#1d2b33';
    ctx.fillRect(0, 0, S, S);
    const [beachX] = toMap(CITY.beachX, 0);
    const [waterX] = toMap(CITY.waterX, 0);
    ctx.fillStyle = '#c9b078';
    ctx.fillRect(beachX, 0, waterX - beachX, S);
    ctx.fillStyle = '#2e7f9e';
    ctx.fillRect(waterX, 0, S - waterX, S);
    const streets = G.city?.roads?.streets;
    const centres = Array.isArray(streets) && streets.length > 0
      ? streets
      : [-220, -180, -140, -100, -60, -20, 20, 60, 100, 140, 180, 220];
    const roadPx = Math.max(3, CITY.roadW * MAP_SCALE);
    ctx.fillStyle = '#3a3f46';
    for (const c of centres) {
      const [px] = toMap(c, 0);
      const [, pz] = toMap(0, c);
      ctx.fillRect(px - roadPx / 2, 0, roadPx, S); 
      ctx.fillRect(0, pz - roadPx / 2, S, roadPx); 
    }
    const marker = G.mission?.marker;
    if (marker) {
      const [mx, mz] = toMap(marker.x, marker.z);
      const r = 6 + 2 * Math.sin(now / 180);
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath();
      ctx.moveTo(mx, mz - r);
      ctx.lineTo(mx + r, mz);
      ctx.lineTo(mx, mz + r);
      ctx.lineTo(mx - r, mz);
      ctx.closePath();
      ctx.fill();
    }
    for (const car of G.cars ?? []) {
      const [cx, cz] = toMap(car.pos.x, car.pos.z);
      ctx.fillStyle = car.kind === 'police' ? '#3b82f6' : '#9aa0a6';
      ctx.beginPath();
      ctx.arc(cx, cz, car.kind === 'police' ? 3 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ef4444';
    for (const cop of G.cops ?? []) {
      const [cx, cz] = toMap(cop.pos.x, cop.pos.z);
      ctx.beginPath();
      ctx.arc(cx, cz, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const p = G.player;
    if (p) {
      const [px, pz] = toMap(p.pos.x, p.pos.z);
      ctx.save();
      ctx.translate(px, pz);
      ctx.rotate(-p.angle);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    const pd = G.player;
    if (pd) {
      const d = G.api.city?.districtAt?.(pd.pos.x, pd.pos.z);
      if (d) {
        ctx.fillStyle = 'rgba(255, 201, 60, 0.9)';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(d.name, 6, S - 8);
      }
    }
  }
  function update() {
    frame += 1;
    const now = performance.now();
    const p = G.player;
    const wanted = Math.max(0, Math.min(5, G.wanted | 0));
    const stars = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
    if (stars !== last.stars && el.stars) {
      el.stars.textContent = stars;
      last.stars = stars;
    }
    const cash = `$${G.cash}`;
    if (cash !== last.cash && el.cash) {
      el.cash.textContent = cash;
      last.cash = cash;
    }
    const respect = `★ RESPECT ${G.respect | 0}`;
    if (respect !== last.respect && el.respect) {
      el.respect.textContent = respect;
      last.respect = respect;
    }
    const cbt = G.api.combat;
    if (el.weapon) {
      const ws = cbt?.weapons ?? [];
      const cur = ws.find((w) => w.id === cbt?.weapon) ?? ws[0];
      const weaponText = cur ? `${cur.name} · ${cur.mag}/${cur.reserve}` : '';
      if (weaponText !== last.weapon) {
        el.weapon.textContent = weaponText;
        last.weapon = weaponText;
      }
    }
    const health = p ? Math.max(0, Math.min(100, p.health)) : 100;
    const healthPct = Math.round(health);
    if (healthPct !== last.health && el.healthfill) {
      el.healthfill.style.width = `${healthPct}%`;
      last.health = healthPct;
    }
    const mins = Math.floor(G.clock.dayMinutes) % 1440;
    const clock = `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)} · Solmar`;
    if (clock !== last.clock && el.clock) {
      el.clock.textContent = clock;
      last.clock = clock;
    }
    if (el.district) {
      const d = p ? G.api.city?.districtAt?.(p.pos.x, p.pos.z) : null;
      const district = d ? d.name : '';
      if (district !== last.district) {
        el.district.textContent = district;
        last.district = district;
      }
    }
    const ms = p ? (p.car ? Math.abs(p.car.speed) : Math.abs(p.speed)) : 0;
    const cn = p?.car?.name;
    const speed = cn ? `${cn} · ${Math.round(ms * 3.6)} <small>km/h</small>` : `${Math.round(ms * 3.6)} <small>km/h</small>`;
    if (speed !== last.speed && el.speed) {
      el.speed.innerHTML = speed;
      last.speed = speed;
    }
    const radioApi = G.api.radio;
    if (el.radio) {
      const radioText = radioApi ? `♪ ${radioApi.currentName()} — ${radioApi.currentTrack()}` : '';
      if (radioText !== last.radio) {
        el.radio.textContent = radioText;
        last.radio = radioText;
      }
    }
    if (el.hint) {
      const shop = G.api.shop;
      let hintText = 'WASD drive / walk · Shift run · E steal car · F shoot · R reload · 1/2/3 weapons · Space brake · P pause · Q radio · B shop';
      if (shop?.nearShop()) hintText = 'Press B — Marlin Street Shop (Ammo · First Aid · Body Armor) · Q radio';
      else if (shop?.nearSafehouse()) hintText = 'Safehouse — healing… · Q radio · B shop';
      if (hintText !== last.hint) {
        el.hint.textContent = hintText;
        last.hint = hintText;
      }
    }
    if (frame % 2 === 0) drawMinimap(now);
    if (frame % 4 === 1) {
      const m = G.mission;
      if (el.missioncard) el.missioncard.style.display = m ? 'block' : 'none';
      if (m) {
        if (el.mcid) el.mcid.textContent = `${m.id.toUpperCase()} · ${m.title}`;
        if (el.mcfill) el.mcfill.style.width = `${Math.round((m.stage / (m.tot || m.stage)) * 100)}%`;
        if (el.mcnext) el.mcnext.textContent = m.objective;
        if (el.mctime) el.mctime.textContent = m.left != null ? `${m.left}s LEFT` : '';
      }
      const u = G.api.police?.units?.() ?? [];
      if (el.pdpanel) el.pdpanel.style.display = wanted === 0 && u.length === 0 ? 'none' : 'block';
      if (el.pdhead) el.pdhead.textContent = `SOLMAR PD — ${u.length} UNITS · CODE ${Math.max(1, wanted)}`;
      if (el.pdrows) el.pdrows.innerHTML = u.map((x) => `<div><b>${x.name}</b> · ${x.dist}m · ${x.state}</div>`).join('');
    }
    if (el.vignette) {
      if (now < flashUntil) {
        el.vignette.style.opacity = '0.6';
      } else if (health < 40) {
        el.vignette.style.opacity = String(1 - health / 100);
      } else {
        el.vignette.style.opacity = '0';
      }
    }
    if (el.crosshair) {
      const showCross = !!p && p.onFoot && G.screen === 'playing';
      el.crosshair.style.display = showCross ? 'block' : 'none';
    }
    if (dialogUntil && now >= dialogUntil && el.dialog && !G.shotCamera) {
      el.dialog.style.display = 'none';
      dialogUntil = 0;
    }
  }
  return { update, show, message, dialog, setObjective, setMissionList, flash, toggleShop, renderShopList };
}
