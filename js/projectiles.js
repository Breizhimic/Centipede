/* js/projectiles.js — Projectile System */

const Projectiles = (() => {
  const bullets = [];
  const SPEED  = 500;
  const W = 4;
  const H = 14;

  function fire(x, y, piercing = false) {
    bullets.push({
      x: x - W / 2,
      y: y - H,
      w: W,
      h: H,
      piercing,
      trail: [],
    });
  }

  function update(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      // Record trail position
      b.trail.push({ x: b.x + W/2, y: b.y });
      if (b.trail.length > 6) b.trail.shift();

      b.y -= SPEED * dt;
      if (b.y + b.h < 0) {
        bullets.splice(i, 1);
      }
    }
  }

  function remove(b) {
    const idx = bullets.indexOf(b);
    if (idx !== -1) bullets.splice(idx, 1);
  }

  function draw(ctx) {
    for (const b of bullets) {
      // Trail glow
      for (let t = 0; t < b.trail.length; t++) {
        const alpha = (t / b.trail.length) * 0.5;
        const size  = W * (t / b.trail.length) * 0.8;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#00d4ff';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur  = 6;
        ctx.fillRect(Math.round(b.trail[t].x - size/2), Math.round(b.trail[t].y), Math.round(size), 4);
        ctx.restore();
      }

      // Main bullet
      ctx.save();
      ctx.fillStyle   = '#ffffff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur  = 12;
      ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h);

      // Tip glow
      ctx.fillStyle = '#00d4ff';
      ctx.shadowBlur = 20;
      ctx.fillRect(Math.round(b.x - 1), Math.round(b.y), b.w + 2, 4);
      ctx.restore();
    }
  }

  function clear() { bullets.length = 0; }

  return {
    fire, update, remove, draw, clear,
    get list() { return bullets; },
    W, H,
  };
})();
