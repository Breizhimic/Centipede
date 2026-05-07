/* js/enemies.js — Additional Enemies: Scorpion & Fly */

const Enemies = (() => {
  const enemies = [];
  let canvasW = 600;
  let canvasH = 700;
  let spawnTimer  = 0;
  let spawnInterval = 12; // seconds between spawns
  let level = 1;

  function setDimensions(w, h) { canvasW = w; canvasH = h; }

  function setLevel(lvl) {
    level = lvl;
    spawnInterval = Math.max(6, 12 - lvl);
  }

  function trySpawn() {
    if (level < 2) return; // scorpion from level 2
    const r = Math.random();
    if (r < 0.6) spawnScorpion();
    else if (r < 0.9) spawnFly();
  }

  function spawnScorpion() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const startX = dir === 1 ? -40 : canvasW + 40;
    const row = Math.floor(Math.random() * 5) + 1;
    enemies.push({
      type: 'scorpion',
      x: startX,
      y: row * 30,
      vx: dir * (180 + Math.random() * 80),
      vy: 0,
      w: 36, h: 24,
      hp: 1,
      points: 20,
      alive: true,
    });
  }

  function spawnFly() {
    const startX = Math.random() * canvasW;
    enemies.push({
      type: 'fly',
      x: startX,
      y: -30,
      vx: (Math.random() - 0.5) * 200,
      vy: 80 + Math.random() * 60,
      w: 24, h: 24,
      hp: 1,
      points: 15,
      alive: true,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function update(dt) {
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      trySpawn();
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) { enemies.splice(i, 1); continue; }

      if (e.type === 'fly') {
        e.phase += dt * 3;
        e.vx = Math.sin(e.phase) * 200;
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Scorpion poisons mushrooms it crosses
      if (e.type === 'scorpion') {
        const m = Mushrooms.getAtPixel(e.x, e.y, e.w, e.h);
        if (m && m.type === Mushrooms.TYPE.NORMAL) {
          m.type = 'poison';
        }
      }

      // Remove if off screen
      if (e.x < -80 || e.x > canvasW + 80 || e.y > canvasH + 80) {
        enemies.splice(i, 1);
      }
    }
  }

  function checkBulletHit(bx, by, bw, bh) {
    for (const e of enemies) {
      if (!e.alive) continue;
      if (bx < e.x + e.w && bx + bw > e.x &&
          by < e.y + e.h && by + bh > e.y) {
        return e;
      }
    }
    return null;
  }

  function kill(e) {
    e.alive = false;
  }

  function drawScorpion(ctx, e) {
    const x = Math.round(e.x);
    const y = Math.round(e.y);
    ctx.save();
    ctx.shadowColor = '#9d4edd';
    ctx.shadowBlur  = 12;

    // Body
    ctx.fillStyle = '#9d4edd';
    ctx.fillRect(x + 4, y + 6, 28, 12);

    // Head
    ctx.fillStyle = '#7b2fbe';
    ctx.fillRect(x, y + 8, 10, 8);

    // Tail curl
    ctx.fillStyle = '#9d4edd';
    ctx.fillRect(x + 28, y + 4, 6, 6);
    ctx.fillRect(x + 32, y, 4, 8);

    // Claws
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(x - 4, y + 8,  6, 4);
    ctx.fillRect(x - 4, y + 14, 6, 4);

    // Legs
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#9d4edd';
      ctx.fillRect(x + 6 + i*5, y + 18, 3, 6);
      ctx.fillRect(x + 6 + i*5, y,      3, 6);
    }

    // Eyes
    ctx.fillStyle = '#ffbe0b';
    ctx.shadowColor = '#ffbe0b';
    ctx.fillRect(x + 2, y + 9, 3, 3);
    ctx.fillRect(x + 5, y + 9, 3, 3);

    ctx.restore();
  }

  function drawFly(ctx, e) {
    const x = Math.round(e.x);
    const y = Math.round(e.y);
    const wingFlap = Math.sin(Date.now() * 0.02) * 3;

    ctx.save();
    ctx.shadowColor = '#ffbe0b';
    ctx.shadowBlur  = 10;

    // Body
    ctx.fillStyle = '#ffbe0b';
    ctx.beginPath();
    ctx.ellipse(x + 12, y + 12, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.fillStyle = 'rgba(255,190,11,0.4)';
    ctx.beginPath();
    ctx.ellipse(x + 12 - 10, y + 8 + wingFlap, 10, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 12 + 10, y + 8 - wingFlap, 10, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ff006e';
    ctx.fillRect(x + 8,  y + 7, 3, 3);
    ctx.fillRect(x + 13, y + 7, 3, 3);

    ctx.restore();
  }

  function draw(ctx) {
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === 'scorpion') drawScorpion(ctx, e);
      else if (e.type === 'fly')  drawFly(ctx, e);
    }
  }

  function clear() {
    enemies.length = 0;
    spawnTimer = 0;
  }

  return {
    setDimensions, setLevel, update, draw, clear,
    checkBulletHit, kill,
    get list() { return enemies; },
  };
})();
