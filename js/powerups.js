/* js/powerups.js — Power-Up System */

const Powerups = (() => {
  const active   = []; // on-field powerups
  const effects  = {}; // active effects on player
  let canvasW = 600;
  let canvasH = 700;

  const TYPES = {
    RAPID_FIRE:   { icon: '🔥', label: 'RAPID FIRE', color: '#ff6b35', glow: '#ff6b35', duration: 8 },
    SHIELD:       { icon: '🛡️', label: 'SHIELD',     color: '#00d4ff', glow: '#00d4ff', duration: 0 }, // instant
    DOUBLE_PTS:   { icon: '⭐', label: '2X POINTS',  color: '#ffbe0b', glow: '#ffbe0b', duration: 10 },
    EXTRA_LIFE:   { icon: '❤️', label: '+1 LIFE',    color: '#ff006e', glow: '#ff006e', duration: 0 },
    SLOW_TIME:    { icon: '🐌', label: 'SLOW TIME',  color: '#9d4edd', glow: '#9d4edd', duration: 8 },
    BOMB:         { icon: '💣', label: 'BOMB!',       color: '#ff006e', glow: '#ff006e', duration: 0 },
  };

  const TYPE_KEYS = Object.keys(TYPES);

  function setDimensions(w, h) { canvasW = w; canvasH = h; }

  function trySpawn(x, y) {
    if (Math.random() > 0.20) return; // 20% chance
    const key = TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];
    active.push({
      type: key,
      x: x - 12,
      y: y,
      w: 24, h: 24,
      spin: 0,
      alive: true,
    });
  }

  function update(dt) {
    // Animate field powerups
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.spin += dt * 2;
      if (!p.alive) active.splice(i, 1);
    }

    // Tick timed effects
    for (const key of Object.keys(effects)) {
      const eff = effects[key];
      if (eff.duration > 0) {
        eff.remaining -= dt;
        if (eff.remaining <= 0) delete effects[key];
      }
    }
  }

  function checkPlayerCollect(px, py, pw, ph) {
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      if (!p.alive) continue;
      if (px < p.x + p.w && px + pw > p.x &&
          py < p.y + p.h && py + ph > p.y) {
        active.splice(i, 1);
        return p.type;
      }
    }
    return null;
  }

  function applyEffect(type, gameRef) {
    const def = TYPES[type];
    if (!def) return;

    switch (type) {
      case 'RAPID_FIRE':
        effects['RAPID_FIRE'] = { remaining: def.duration, duration: def.duration };
        break;
      case 'SHIELD':
        effects['SHIELD'] = { remaining: Infinity, duration: Infinity };
        break;
      case 'DOUBLE_PTS':
        effects['DOUBLE_PTS'] = { remaining: def.duration, duration: def.duration };
        break;
      case 'SLOW_TIME':
        effects['SLOW_TIME'] = { remaining: def.duration, duration: def.duration };
        break;
      case 'EXTRA_LIFE':
      case 'BOMB':
        break; // handled externally
    }
  }

  function hasEffect(type) {
    return !!effects[type] && (effects[type].remaining > 0 || effects[type].remaining === Infinity);
  }

  function removeEffect(type) {
    delete effects[type];
  }

  function getEffectRemaining(type) {
    if (!effects[type]) return 0;
    return Math.max(0, effects[type].remaining);
  }

  function getSpeedMultiplier() {
    return hasEffect('SLOW_TIME') ? 0.5 : 1;
  }

  function getScoreMultiplier() {
    return hasEffect('DOUBLE_PTS') ? 2 : 1;
  }

  function getRapidFireCount() {
    return hasEffect('RAPID_FIRE') ? 3 : 1;
  }

  function drawPowerup(ctx, p) {
    const def = TYPES[p.type];
    if (!def) return;
    const cx = Math.round(p.x + p.w / 2);
    const cy = Math.round(p.y + p.h / 2);
    const pulse = 0.9 + 0.1 * Math.sin(p.spin * 3);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);

    // Background gem
    ctx.shadowColor = def.color;
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = def.color + '44';
    ctx.strokeStyle = def.color;
    ctx.lineWidth   = 2;
    const r = 12;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + p.spin * 0.5;
      i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Icon
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(def.icon, 0, 0);

    ctx.restore();
  }

  function draw(ctx) {
    for (const p of active) {
      if (p.alive) drawPowerup(ctx, p);
    }
  }

  function getActiveEffectsHUD() {
    const list = [];
    for (const [key, eff] of Object.entries(effects)) {
      const def = TYPES[key];
      if (!def) continue;
      const timeStr = eff.remaining === Infinity ? '' : ` (${Math.ceil(eff.remaining)}s)`;
      list.push(`${def.icon} ${def.label}${timeStr}`);
    }
    return list;
  }

  function clear() {
    active.length = 0;
    for (const k of Object.keys(effects)) delete effects[k];
  }

  return {
    setDimensions, trySpawn, update, draw, clear,
    checkPlayerCollect, applyEffect, hasEffect, removeEffect,
    getSpeedMultiplier, getScoreMultiplier, getRapidFireCount,
    getEffectRemaining, getActiveEffectsHUD,
    TYPES,
    get list() { return active; },
  };
})();
