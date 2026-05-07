/* js/particles.js — Particle System */

const Particles = (() => {
  const particles = [];

  const COLORS = {
    explosion:  ['#ff006e','#ff6b35','#ffbe0b','#ffffff','#ff4444'],
    mushroom:   ['#00ff88','#00d4ff','#ffffff','#ff006e'],
    powerup:    ['#ffbe0b','#ffffff','#00ff88','#00d4ff'],
    hit:        ['#ff006e','#ff4444','#ff8800'],
    score:      ['#00d4ff','#ffffff'],
  };

  function spawn(x, y, type = 'explosion', count = 12) {
    const cols = COLORS[type] || COLORS.explosion;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.8;
      const speed = 60 + Math.random() * 180;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: cols[Math.floor(Math.random() * cols.length)],
        size:  2 + Math.random() * 4,
        life:  1,
        decay: 0.7 + Math.random() * 1.2,
        gravity: type === 'explosion' ? 80 : 20,
      });
    }
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.vy   += p.gravity * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function draw(ctx) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 8;
      ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), Math.round(p.size), Math.round(p.size));
      ctx.restore();
    }
  }

  function clear() { particles.length = 0; }

  return { spawn, update, draw, clear, get count() { return particles.length; } };
})();
