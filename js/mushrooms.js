/* js/mushrooms.js — Mushroom System */

const Mushrooms = (() => {
  const CELL = 30; // grid cell size
  const mushrooms = [];

  const TYPE = {
    NORMAL:  'normal',
    POISON:  'poison',
    GOLDEN:  'golden',
    POWER:   'power',
  };

  // Color map
  const COLORS = {
    normal: { top: '#00ff88', stem: '#007744', glow: '#00ff88' },
    poison: { top: '#ff006e', stem: '#880033', glow: '#ff006e' },
    golden: { top: '#ffbe0b', stem: '#886600', glow: '#ffbe0b' },
    power:  { top: '#00d4ff', stem: '#006688', glow: '#00d4ff' },
  };

  function pickType() {
    const r = Math.random();
    if (r < 0.70) return TYPE.NORMAL;
    if (r < 0.82) return TYPE.POISON;
    if (r < 0.91) return TYPE.GOLDEN;
    return TYPE.POWER;
  }

  function spawn(canvasW, canvasH, count, avoidBottomRows = 3) {
    mushrooms.length = 0;
    const cols = Math.floor(canvasW / CELL);
    const rows = Math.floor(canvasH / CELL) - avoidBottomRows - 1;
    const placed = new Set();

    let attempts = 0;
    while (mushrooms.length < count && attempts < count * 10) {
      attempts++;
      const col = Math.floor(Math.random() * cols);
      const row = Math.floor(Math.random() * rows) + 1; // skip row 0 (centipede start)
      const key = `${col},${row}`;
      if (placed.has(key)) continue;
      placed.add(key);

      const type = pickType();
      mushrooms.push({
        x: col * CELL,
        y: row * CELL,
        w: CELL,
        h: CELL,
        type,
        hp: type === TYPE.POWER ? 2 : 1,
        maxHp: type === TYPE.POWER ? 2 : 1,
        id: Math.random(),
        wobble: 0,
        wobbleDir: 1,
      });
    }
  }

  function respawnPartial(canvasW, canvasH, fraction = 0.4) {
    const toRespawn = Math.floor(mushrooms.length * fraction + 5);
    const cols = Math.floor(canvasW / CELL);
    const rows = Math.floor(canvasH / CELL) - 4;

    const placed = new Set(mushrooms.map(m => `${Math.floor(m.x/CELL)},${Math.floor(m.y/CELL)}`));
    let added = 0;
    let attempts = 0;
    while (added < toRespawn && attempts < toRespawn * 10) {
      attempts++;
      const col = Math.floor(Math.random() * cols);
      const row = Math.floor(Math.random() * rows) + 1;
      const key = `${col},${row}`;
      if (placed.has(key)) continue;
      placed.add(key);
      const type = pickType();
      mushrooms.push({
        x: col * CELL, y: row * CELL,
        w: CELL, h: CELL, type,
        hp: type === TYPE.POWER ? 2 : 1,
        maxHp: type === TYPE.POWER ? 2 : 1,
        id: Math.random(), wobble: 0, wobbleDir: 1,
      });
      added++;
    }
  }

  function getAt(x, y) {
    // Check if a grid position overlaps a mushroom
    for (const m of mushrooms) {
      if (x < m.x + m.w && x + CELL > m.x &&
          y < m.y + m.h && y + CELL > m.y) {
        return m;
      }
    }
    return null;
  }

  function getAtPixel(px, py, pw, ph) {
    for (const m of mushrooms) {
      if (px < m.x + m.w && px + pw > m.x &&
          py < m.y + m.h && py + ph > m.y) {
        return m;
      }
    }
    return null;
  }

  function hit(m) {
    m.hp--;
    m.wobble = 6;
    if (m.hp <= 0) {
      const idx = mushrooms.indexOf(m);
      if (idx !== -1) mushrooms.splice(idx, 1);
      return true; // destroyed
    }
    return false;
  }

  function update(dt) {
    for (const m of mushrooms) {
      if (m.wobble > 0) {
        m.wobble -= dt * 20;
        if (m.wobble < 0) m.wobble = 0;
      }
    }
  }

  function drawMushroom(ctx, m) {
    const c = COLORS[m.type] || COLORS.normal;
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2;
    const wobbleX = Math.sin(m.wobble * 3) * m.wobble * 0.8;

    ctx.save();
    ctx.translate(Math.round(cx + wobbleX), Math.round(cy));

    // Damage indicator (cracks for power mushrooms)
    const dmgAlpha = m.maxHp > 1 ? (1 - m.hp / m.maxHp) * 0.6 : 0;

    // Glow
    ctx.shadowColor = c.glow;
    ctx.shadowBlur  = 10;

    // Stem
    ctx.fillStyle = c.stem;
    ctx.fillRect(-6, 2, 12, 9);

    // Cap
    ctx.fillStyle = c.top;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 9, 0, Math.PI, 0);
    ctx.fill();

    // Spots (pixel art)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-7, -5, 4, 4);
    ctx.fillRect(3, -7, 4, 4);
    ctx.fillRect(-1, -3, 3, 3);

    // Damage cracks
    if (dmgAlpha > 0) {
      ctx.strokeStyle = `rgba(0,0,0,${dmgAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(2, 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, -2); ctx.lineTo(0, 4);
      ctx.stroke();
    }

    // Golden shimmer
    if (m.type === TYPE.GOLDEN) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
      ctx.strokeRect(-12, -10, 24, 20);
    }

    ctx.restore();
  }

  function draw(ctx) {
    for (const m of mushrooms) {
      drawMushroom(ctx, m);
    }
  }

  function clear() { mushrooms.length = 0; }

  return {
    spawn, respawnPartial, getAt, getAtPixel, hit, update, draw, clear,
    get list() { return mushrooms; },
    TYPE, CELL,
  };
})();
