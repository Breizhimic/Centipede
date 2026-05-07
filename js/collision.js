/* js/collision.js — Collision Detection */

const Collision = (() => {

  function resolve(gameState) {
    const events = {
      playerHit:        false,
      segmentsKilled:   0,
      mushroomsKilled:  0,
      powerupCollected: null,
      scoreGained:      0,
    };

    const mult    = Powerups.getScoreMultiplier();
    const bullets = Projectiles.list;

    // ---- BULLETS vs CENTIPEDE ----
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b   = bullets[bi];
      const hit = CentipedeManager.checkBulletHit(b.x, b.y, Projectiles.W, Projectiles.H);
      if (!hit) continue;

      const { centipede, si } = hit;
      if (!centipede.segments[si]) continue; // already removed

      const seg = centipede.segments[si];
      const sx  = seg.x + CentipedeManager.SEG_SIZE / 2;
      const sy  = seg.y + CentipedeManager.SEG_SIZE / 2;

      Particles.spawn(sx, sy, 'explosion', 16);
      const pts = 10 * mult;
      events.scoreGained += pts;
      events.segmentsKilled++;
      gameState.scorePopups.push({ x: sx, y: sy, text: '+' + pts, t: 1.2 });

      // Split BEFORE removing: segments after si become a new centipede
      if (si < centipede.segments.length - 1) {
        CentipedeManager.splitAt(centipede, si + 1);
        Audio.sfx.centipedeSplit();
      } else {
        Audio.sfx.segmentHit();
      }

      // Remove the hit segment
      centipede.segments.splice(si, 1);

      if (centipede.segments.length === 0) {
        const idx = CentipedeManager.list.indexOf(centipede);
        if (idx !== -1) CentipedeManager.list.splice(idx, 1);
      } else {
        centipede.segments[0].isHead = true;
      }

      Powerups.trySpawn(sx, sy);

      if (!b.piercing) {
        Projectiles.remove(b);
      }
    }

    // ---- BULLETS vs MUSHROOMS ----
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      const m = Mushrooms.getAtPixel(b.x, b.y, Projectiles.W, Projectiles.H);
      if (!m) continue;

      const destroyed = Mushrooms.hit(m);
      if (destroyed) {
        const mx = m.x + m.w / 2;
        const my = m.y + m.h / 2;
        Particles.spawn(mx, my, 'mushroom', 8);
        const pts = 5 * mult;
        events.scoreGained += pts;
        events.mushroomsKilled++;
        gameState.scorePopups.push({ x: mx, y: my, text: '+' + pts, t: 1.2 });
        Audio.sfx.mushroomDestroy();
      }

      if (!b.piercing) Projectiles.remove(b);
    }

    // ---- BULLETS vs ENEMIES ----
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      const e = Enemies.checkBulletHit(b.x, b.y, Projectiles.W, Projectiles.H);
      if (!e) continue;

      Enemies.kill(e);
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      Particles.spawn(ex, ey, 'explosion', 14);
      const pts = e.points * mult;
      events.scoreGained += pts;
      gameState.scorePopups.push({ x: ex, y: ey, text: '+' + pts, t: 1.2 });
      Audio.sfx.segmentHit();

      if (!b.piercing) Projectiles.remove(b);
    }

    // ---- PLAYER vs CENTIPEDE ----
    const pl = gameState.player;
    if (!gameState.invulnerable) {
      if (CentipedeManager.checkPlayerHit(pl.x, pl.y, pl.w, pl.h)) {
        events.playerHit = true;
      }
    }

    // ---- PLAYER vs POWERUP ----
    const collected = Powerups.checkPlayerCollect(pl.x, pl.y, pl.w, pl.h);
    if (collected) {
      events.powerupCollected = collected;
      Audio.sfx.powerupCollect();
      Particles.spawn(pl.x + pl.w / 2, pl.y + pl.h / 2, 'powerup', 12);
    }

    return events;
  }

  return { resolve };
})();