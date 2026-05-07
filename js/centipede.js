/* js/centipede.js — Centipede AI & Segment Management */

const CentipedeManager = (() => {
  const SEG_SIZE = 24;

  let centipedes   = [];
  let baseSpeed    = 100;
  let currentSpeed = 100;
  let canvasW      = 600;
  let canvasH      = 700;
  let nextId       = 0;
  let initialized  = false;

  /* ---- helpers ---- */
  function setDimensions(w, h) { canvasW = w; canvasH = h; }
  function getSpeed()          { return currentSpeed; }

  /* Create one centipede.
     dir=1 → moving right; head placed at (startX, startY),
     tail segments extend to the LEFT so they all start on-screen. */
  function create(segCount, startX, startY, dir) {
    const segs = [];
    for (let i = 0; i < segCount; i++) {
      // tail extends opposite to travel direction
      const sx = startX + i * SEG_SIZE * (dir === 1 ? -1 : 1);
      // clamp so no segment is off-screen horizontally
      const clampedX = Math.max(0, Math.min(canvasW - SEG_SIZE, sx));
      segs.push({ x: clampedX, y: startY, prevX: clampedX, prevY: startY });
    }
    centipedes.push({
      id: nextId++,
      segments: segs,
      dir,
      speed: currentSpeed,
      _lastMushX: -1,
      _lastMushY: -1,
      _poisoned: false,
    });
  }

  /* ---- Level setup ---- */
  function initLevel(level, w, h) {
    centipedes = [];
    nextId     = 0;
    initialized = false;
    canvasW = w; canvasH = h;

    const mult   = 1 + (level - 1) * 0.25;
    currentSpeed = Math.min(baseSpeed * mult, 400);

    if (level === 1) {
      create(12, 0, SEG_SIZE, 1);
    } else if (level === 2) {
      create(14, 0, SEG_SIZE, 1);
    } else if (level === 3) {
      create(10, 0,             SEG_SIZE,     1);
      create(10, canvasW - SEG_SIZE, SEG_SIZE * 3, -1);
    } else {
      const n = Math.min(2 + Math.floor((level - 3) / 2), 4);
      for (let i = 0; i < n; i++) {
        const d  = (i % 2 === 0) ? 1 : -1;
        const sx = (d === 1) ? 0 : canvasW - SEG_SIZE;
        create(10, sx, SEG_SIZE * (1 + i * 2), d);
      }
    }
    initialized = true;
  }

  /* ---- Update ---- */
  function update(dt) {
    for (let ci = centipedes.length - 1; ci >= 0; ci--) {
      const c = centipedes[ci];
      if (!c.segments.length) { centipedes.splice(ci, 1); continue; }

      const head = c.segments[0];

      // Save prev positions (followers use them)
      for (const seg of c.segments) {
        seg.prevX = seg.x;
        seg.prevY = seg.y;
      }

      // Move head horizontally
      head.x += c.dir * c.speed * dt;

      let descend = false;

      // Border bounce
      if (c.dir === 1 && head.x + SEG_SIZE >= canvasW) {
        head.x = canvasW - SEG_SIZE;
        c.dir  = -1;
        descend = true;
      } else if (c.dir === -1 && head.x <= 0) {
        head.x = 0;
        c.dir  = 1;
        descend = true;
      }

      // Mushroom bounce (only when head enters a new mushroom cell)
      if (!descend) {
        const mush = Mushrooms.getAtPixel(head.x + 2, head.y + 2, SEG_SIZE - 4, SEG_SIZE - 4);
        if (mush) {
          const mx = Math.floor(mush.x), my = Math.floor(mush.y);
          if (mx !== c._lastMushX || my !== c._lastMushY) {
            c._lastMushX = mx;
            c._lastMushY = my;
            c.dir = -c.dir;
            head.x += c.dir * c.speed * dt * 2; // push away
            head.x = Math.max(0, Math.min(canvasW - SEG_SIZE, head.x));
            descend = true;
            if (mush.type === Mushrooms.TYPE.POISON) c._poisoned = true;
          }
        } else {
          c._lastMushX = -1;
          c._lastMushY = -1;
        }
      }

      // Descend all segments by one row
      if (descend) {
        for (const seg of c.segments) {
          seg.y    += SEG_SIZE;
          seg.prevY = seg.y;
        }
        c.speed = Math.min(c.speed * 1.015, 400);
      }

      // Followers chase the segment in front using prev position
      for (let i = 1; i < c.segments.length; i++) {
        const seg  = c.segments[i];
        const prev = c.segments[i - 1];
        const dx   = prev.prevX - seg.x;
        const dy   = prev.prevY - seg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.5) {
          const step = Math.min(c.speed * dt, dist);
          seg.x += (dx / dist) * step;
          seg.y += (dy / dist) * step;
        }
      }

      // Poison: rush downward off-screen
      if (c._poisoned) {
        for (const seg of c.segments) seg.y += c.speed * 3 * dt;
        if (head.y > canvasH + 100) centipedes.splice(ci, 1);
      }
    }
  }

  /* ---- Split centipede: tail from segIdx onward becomes a new centipede ---- */
  function splitAt(c, segIdx) {
    if (segIdx >= c.segments.length) return;
    const tail = c.segments.splice(segIdx); // removes tail from c
    if (!tail.length) return;
    tail[0].isHead = true;
    centipedes.push({
      id: nextId++,
      segments: tail,
      dir: -c.dir,
      speed: c.speed,
      _lastMushX: -1,
      _lastMushY: -1,
      _poisoned: false,
    });
  }

  /* ---- Collision queries ---- */
  function checkBulletHit(bx, by, bw, bh) {
    for (const c of centipedes) {
      for (let si = 0; si < c.segments.length; si++) {
        const seg = c.segments[si];
        if (bx < seg.x + SEG_SIZE && bx + bw > seg.x &&
            by < seg.y + SEG_SIZE && by + bh > seg.y) {
          return { centipede: c, si };
        }
      }
    }
    return null;
  }

  function checkPlayerHit(px, py, pw, ph) {
    const m = 5; // margin for fairness
    for (const c of centipedes) {
      for (const seg of c.segments) {
        if (px + m < seg.x + SEG_SIZE - m && px + pw - m > seg.x + m &&
            py + m < seg.y + SEG_SIZE - m && py + ph - m > seg.y + m) {
          return true;
        }
      }
    }
    return false;
  }

  /* Returns true if any segment has descended into the player zone */
  function checkReachedBottom(playerZoneY) {
    for (const c of centipedes) {
      if (c._poisoned) continue;
      for (const seg of c.segments) {
        if (seg.y + SEG_SIZE > playerZoneY + SEG_SIZE * 2) return true;
      }
    }
    return false;
  }

  /* ---- Draw ---- */
  function drawSegment(ctx, seg, isHead, idx, total) {
    const x = Math.round(seg.x);
    const y = Math.round(seg.y);
    const s = SEG_SIZE;

    // Color gradient head=red → tail=orange
    const t  = idx / Math.max(total - 1, 1);
    const r  = 255;
    const g  = Math.round(0   + (107 - 0)   * t);
    const b  = Math.round(110 + (53  - 110) * t);
    const col = `rgb(${r},${g},${b})`;

    ctx.save();
    ctx.fillStyle   = col;
    ctx.shadowColor = isHead ? '#ff006e' : col;
    ctx.shadowBlur  = isHead ? 16 : 8;

    // Body
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 5, y + 4, s - 10, (s - 8) / 2);

    if (isHead) {
      // Eyes
      ctx.shadowBlur  = 4;
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(x + 4,      y + 5, 5, 5);
      ctx.fillRect(x + s - 9,  y + 5, 5, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 5,      y + 6, 3, 3);
      ctx.fillRect(x + s - 8,  y + 6, 3, 3);
      // Mandibles
      ctx.fillStyle   = col;
      ctx.shadowColor = col;
      ctx.fillRect(x + 2, y + s - 6, 5, 6);
      ctx.fillRect(x + s - 7, y + s - 6, 5, 6);
    } else {
      // Joint line
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 3, y + s / 2 - 1, s - 6, 2);
    }

    // Legs (alternating)
    if (idx % 2 === 0) {
      ctx.fillStyle   = col;
      ctx.shadowBlur  = 0;
      ctx.fillRect(x,         y + 7,  3, 2);
      ctx.fillRect(x + s - 3, y + 7,  3, 2);
      ctx.fillRect(x,         y + 14, 3, 2);
      ctx.fillRect(x + s - 3, y + 14, 3, 2);
    }

    ctx.restore();
  }

  function draw(ctx) {
    for (const c of centipedes) {
      const n = c.segments.length;
      for (let i = n - 1; i >= 0; i--) {
        drawSegment(ctx, c.segments[i], i === 0, i, n);
      }
    }
  }

  /* ---- Misc ---- */
  function allDead()        { return initialized && centipedes.length === 0; }
  function totalSegments()  { return centipedes.reduce((s, c) => s + c.segments.length, 0); }
  function clear()          { centipedes = []; nextId = 0; initialized = false; }

  return {
    initLevel, update, draw, clear,
    checkBulletHit, checkPlayerHit, checkReachedBottom,
    splitAt, getSpeed, setDimensions, totalSegments, allDead,
    get list() { return centipedes; },
    SEG_SIZE,
  };
})();