/* js/player.js — Player Controller */

const Player = (() => {
  const SPEED  = 250;
  const W      = 20;
  const H      = 20;

  let state = {
    x: 0, y: 0,
    w: W, h: H,
    vx: 0, vy: 0,
    alive: true,
    shooting: false,
    shootCooldown: 0,
    rapidFireCooldown: 0,
  };

  const keys = {};

  // Mobile virtual keys
  const mobileKeys = { up: false, down: false, left: false, right: false, fire: false };

  // Shoot cooldown base
  const SHOOT_CD = 0.22;

  let canvasW = 600;
  let canvasH = 700;
  let playerZoneTop = 0; // player can't go above this

  function setDimensions(w, h) {
    canvasW = w;
    canvasH = h;
    playerZoneTop = h * 0.65;
  }

  function reset(w, h) {
    setDimensions(w, h);
    state.x = w / 2 - W / 2;
    state.y = h - H - 10;
    state.vx = 0;
    state.vy = 0;
    state.alive = true;
    state.shootCooldown = 0;
  }

  function handleKeyDown(e) {
    keys[e.code] = true;
    // Prevent page scroll
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }
  function handleKeyUp(e) {
    keys[e.code] = false;
  }

  function initControls() {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);

    // Mobile d-pad
    const dirs = { 'btn-up': 'up', 'btn-down': 'down', 'btn-left': 'left', 'btn-right': 'right' };
    for (const [id, dir] of Object.entries(dirs)) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); mobileKeys[dir] = true; }, { passive: false });
      btn.addEventListener('touchend',   (e) => { e.preventDefault(); mobileKeys[dir] = false; }, { passive: false });
      btn.addEventListener('mousedown',  () => mobileKeys[dir] = true);
      btn.addEventListener('mouseup',    () => mobileKeys[dir] = false);
      btn.addEventListener('mouseleave', () => mobileKeys[dir] = false);
    }

    const fireBtn = document.getElementById('btn-fire');
    if (fireBtn) {
      fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); mobileKeys.fire = true; }, { passive: false });
      fireBtn.addEventListener('touchend',   (e) => { e.preventDefault(); mobileKeys.fire = false; }, { passive: false });
      fireBtn.addEventListener('mousedown',  () => mobileKeys.fire = true);
      fireBtn.addEventListener('mouseup',    () => mobileKeys.fire = false);
    }
  }

  function destroyControls() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup',   handleKeyUp);
  }

  function update(dt) {
    if (!state.alive) return;

    // Direction
    const up    = keys['ArrowUp']    || keys['KeyW'] || keys['KeyZ'] || mobileKeys.up;
    const down  = keys['ArrowDown']  || keys['KeyS'] || mobileKeys.down;
    const left  = keys['ArrowLeft']  || keys['KeyA'] || keys['KeyQ'] || mobileKeys.left;
    const right = keys['ArrowRight'] || keys['KeyD'] || mobileKeys.right;

    state.vx = 0;
    state.vy = 0;
    if (left)  state.vx = -SPEED;
    if (right) state.vx =  SPEED;
    if (up)    state.vy = -SPEED;
    if (down)  state.vy =  SPEED;

    // Normalize diagonal
    if (state.vx !== 0 && state.vy !== 0) {
      state.vx *= 0.707;
      state.vy *= 0.707;
    }

    state.x += state.vx * dt;
    state.y += state.vy * dt;

    // Boundaries
    state.x = Math.max(0, Math.min(canvasW - W, state.x));
    state.y = Math.max(playerZoneTop, Math.min(canvasH - H - 2, state.y));

    // Shoot
    state.shootCooldown -= dt;
    const fireKey = keys['Space'] || keys['KeyF'] || keys['KeyX'] || mobileKeys.fire;

    if (fireKey && state.shootCooldown <= 0) {
      const count = Powerups.getRapidFireCount();
      const cx    = state.x + W / 2;
      const cy    = state.y;
      const piercing = Powerups.hasEffect('RAPID_FIRE');

      if (count === 1) {
        Projectiles.fire(cx, cy, false);
      } else {
        // Spread 3 bullets
        Projectiles.fire(cx - 8, cy, false);
        Projectiles.fire(cx,     cy, false);
        Projectiles.fire(cx + 8, cy, false);
      }
      Audio.sfx.shoot();
      state.shootCooldown = SHOOT_CD;
    }
  }

  function drawPlayer(ctx, s, invulnerable, invulnCounter) {
    if (!s.alive) return;

    const x  = Math.round(s.x);
    const y  = Math.round(s.y);

    // Invulnerability blink
    if (invulnerable && Math.floor(invulnCounter * 10) % 2 === 0) return;

    ctx.save();

    // Glow
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur  = Powerups.hasEffect('SHIELD') ? 28 : 18;

    // Shield visual
    if (Powerups.hasEffect('SHIELD')) {
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#00d4ff';
      ctx.beginPath();
      ctx.arc(x + W/2, y + H/2, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Body — pixel art ship style
    ctx.fillStyle = '#ffff00';

    // Main hull
    ctx.fillRect(x + 6, y + 10, 8, 10);
    // Wing left
    ctx.fillRect(x,     y + 14, 8, 6);
    // Wing right
    ctx.fillRect(x + 12, y + 14, 8, 6);
    // Nose
    ctx.fillRect(x + 8, y + 4, 4, 8);
    // Nose tip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 9, y, 2, 6);

    // Engine glow
    ctx.fillStyle = '#ff6b35';
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur  = 12;
    ctx.fillRect(x + 7,  y + 20, 3, 3);
    ctx.fillRect(x + 10, y + 20, 3, 3);

    // Double-points star sparkle
    if (Powerups.hasEffect('DOUBLE_PTS')) {
      ctx.fillStyle = '#ffbe0b';
      ctx.shadowColor = '#ffbe0b';
      const t = Date.now() * 0.005;
      for (let i = 0; i < 4; i++) {
        const a = t + (Math.PI / 2) * i;
        const r = 22;
        ctx.fillRect(
          Math.round(x + W/2 + Math.cos(a)*r - 2),
          Math.round(y + H/2 + Math.sin(a)*r - 2),
          4, 4
        );
      }
    }

    ctx.restore();
  }

  function draw(ctx, invulnerable, invulnCounter) {
    drawPlayer(ctx, state, invulnerable, invulnCounter);
  }

  return {
    initControls, destroyControls, update, draw, reset, setDimensions,
    get state() { return state; },
  };
})();
