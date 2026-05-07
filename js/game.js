/* js/game.js — Main Game Controller */

const Game = (() => {

  const CANVAS_W_BASE = 600;
  const CANVAS_H_BASE = 700;
  const MUSHROOM_BASE = 14;

  let canvas, ctx;
  let canvasW = CANVAS_W_BASE;
  let canvasH = CANVAS_H_BASE;

  let running   = false;
  let paused    = false;
  let lastTime  = 0;
  let animFrame = null;

  let score      = 0;
  let bestScore  = 0;
  let level      = 1;
  let lives      = 3;
  let combo      = 0;
  let comboTimer = 0;

  let invulnerable  = false;
  let invulnTimer   = 0;
  const INVULN_TIME = 1.5;

  let levelTransitioning = false;

  let stats = { segmentsKilled: 0, mushroomsKilled: 0, powerupsCollected: 0 };
  const scorePopups = [];

  const settings = { sfx: true, music: true, scanlines: true, shake: true, theme: 'NEON' };

  // ---- INIT ----
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx    = canvas.getContext('2d');

    loadSettings();
    loadBestScore();
    UI.init();
    Player.initControls();
    Audio.init();
    setupButtons();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    UI.updateMenuBestScore(bestScore);
    UI.show('screen-menu');
  }

  function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;
    const wW    = wrapper.clientWidth  || CANVAS_W_BASE;
    const wH    = wrapper.clientHeight || CANVAS_H_BASE;
    const ratio = CANVAS_W_BASE / CANVAS_H_BASE;

    let cW = wW;
    let cH = cW / ratio;
    if (cH > wH) { cH = wH; cW = cH * ratio; }
    cW = Math.max(1, Math.floor(cW));
    cH = Math.max(1, Math.floor(cH));

    canvas.width  = cW;
    canvas.height = cH;
    canvas.style.width  = cW + 'px';
    canvas.style.height = cH + 'px';
    canvasW = cW;
    canvasH = cH;
  }

  // ---- BUTTONS ----
  function setupButtons() {
    bind('btn-start',         () => { Audio.resume(); startGame(); });
    bind('btn-how-to-play',   () => UI.show('screen-howto'));
    bind('btn-settings',      () => UI.show('screen-settings'));
    bind('btn-howto-back',    () => UI.show('screen-menu'));
    bind('btn-settings-back', () => { saveSettings(); UI.show('screen-menu'); });
    bind('btn-pause',         () => togglePause());
    bind('btn-resume',        () => { if (paused) unpause(); });
    bind('btn-restart-level', () => { unpause(); restartLevel(); });
    bind('btn-pause-menu',    () => { stopGame(); UI.show('screen-menu'); });
    bind('btn-retry',         () => { UI.hide('screen-gameover'); startGame(); });
    bind('btn-go-menu',       () => { UI.hide('screen-gameover'); UI.show('screen-menu'); });
    bind('btn-reset-score',   () => {
      bestScore = 0;
      try { localStorage.removeItem('centipede_best'); } catch(e) {}
      UI.updateMenuBestScore(0);
    });

    window.addEventListener('keydown', e => {
      if ((e.code === 'KeyP' || e.code === 'Escape') && running) togglePause();
    });

    setupToggle('toggle-sfx',       on => { settings.sfx = on; Audio.setSFX(on); });
    setupToggle('toggle-music',     on => { settings.music = on; Audio.setMusic(on); });
    setupToggle('toggle-scanlines', on => {
      settings.scanlines = on;
      document.querySelectorAll('.scan-lines').forEach(el => el.classList.toggle('hidden', !on));
    });
    setupToggle('toggle-shake', on => { settings.shake = on; });

    const themes = ['NEON', 'SPACE', 'BIO'];
    let ti = 0;
    bind('toggle-theme', () => {
      ti = (ti + 1) % themes.length;
      const t = themes[ti];
      document.getElementById('toggle-theme').textContent = t;
      document.body.className = t === 'NEON' ? '' : 'theme-' + t.toLowerCase();
      settings.theme = t;
    });
  }

  function bind(id, fn) {
    document.getElementById(id)?.addEventListener('click', fn);
  }

  function setupToggle(id, cb) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const on = btn.textContent.trim() === 'ON';
      btn.textContent = on ? 'OFF' : 'ON';
      btn.classList.toggle('off', on);
      cb(!on);
    });
  }

  // ---- GAME FLOW ----
  function startGame() {
    score = 0; lives = 3; level = 1; combo = 0;
    stats = { segmentsKilled: 0, mushroomsKilled: 0, powerupsCollected: 0 };
    scorePopups.length = 0;
    invulnerable = false;
    invulnTimer  = 0;

    resizeCanvas();

    // Reset all subsystems
    CentipedeManager.clear();
    Mushrooms.clear();
    Projectiles.clear();
    Particles.clear();
    Powerups.clear();
    Enemies.clear();

    setupLevel();
    UI.show('screen-game');
    UI.updateScore(0);
    UI.updateBest(bestScore);
    UI.updateLevel(1);
    UI.updateLives(3);

    if (settings.music) Audio.startMusic();

    running  = true;
    paused   = false;
    lastTime = performance.now();
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(loop);
  }

  function setupLevel() {
    levelTransitioning = false;
    const mushroomCount = MUSHROOM_BASE + (level - 1) * 5;

    Projectiles.clear();
    Particles.clear();
    Powerups.clear();
    Enemies.clear();
    scorePopups.length = 0;

    // Important: resize first so dimensions are correct
    resizeCanvas();

    Player.reset(canvasW, canvasH);
    CentipedeManager.initLevel(level, canvasW, canvasH);
    Mushrooms.spawn(canvasW, canvasH, mushroomCount);

    Powerups.setDimensions(canvasW, canvasH);
    Enemies.setDimensions(canvasW, canvasH);
    Enemies.setLevel(level);

    UI.updateLevel(level);
    levelAnnounceTimer = 2;
  }

  function restartLevel() {
    Projectiles.clear();
    Particles.clear();
    Powerups.clear();
    Enemies.clear();
    CentipedeManager.initLevel(level, canvasW, canvasH);
    Mushrooms.respawnPartial(canvasW, canvasH, 0.3);
    Player.reset(canvasW, canvasH);
    invulnerable = false;
    invulnTimer  = 0;
    levelTransitioning = false;
    levelAnnounceTimer = 1.5;
  }

  function nextLevel() {
    level++;
    UI.showLevelComplete(score, stats.segmentsKilled, level, () => setupLevel());
  }

  function togglePause() {
    if (!running) return;
    paused ? unpause() : doPause();
  }
  function doPause()  { paused = true;  UI.show('screen-pause'); Audio.stopMusic(); }
  function unpause()  {
    paused = false;
    UI.hide('screen-pause');
    if (settings.music) Audio.startMusic();
    lastTime = performance.now();
  }

  function stopGame() {
    running = false; paused = false;
    Audio.stopMusic();
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    CentipedeManager.clear(); Mushrooms.clear();
    Projectiles.clear(); Particles.clear(); Powerups.clear(); Enemies.clear();
  }

  // ---- MAIN LOOP ----
  function loop(ts) {
    if (!running) return;
    if (paused)   { animFrame = requestAnimationFrame(loop); return; }

    let dt = (ts - lastTime) / 1000;
    lastTime = ts;
    dt = Math.min(dt, 0.05); // cap at 50ms to avoid jumps

    const gameDt = dt * Powerups.getSpeedMultiplier();

    update(gameDt, dt);
    render();

    animFrame = requestAnimationFrame(loop);
  }

  function update(dt, rawDt) {
    if (levelTransitioning) return;

    Player.update(dt);
    CentipedeManager.update(dt);
    Projectiles.update(dt);
    Particles.update(dt);
    Powerups.update(dt);
    Enemies.update(dt);
    Mushrooms.update(dt);

    // Invuln countdown
    if (invulnerable) {
      invulnTimer -= rawDt;
      if (invulnTimer <= 0) { invulnerable = false; invulnTimer = 0; }
    }

    // Combo timeout
    if (comboTimer > 0) {
      comboTimer -= rawDt;
      if (comboTimer <= 0) { combo = 0; comboTimer = 0; UI.updateCombo(0); }
    }

    // Collisions
    const ev = Collision.resolve({ player: Player.state, scorePopups, invulnerable });

    // Score
    if (ev.scoreGained > 0) {
      addScore(ev.scoreGained);
      if (ev.segmentsKilled > 0) {
        combo++;
        comboTimer = 3;
        stats.segmentsKilled += ev.segmentsKilled;
        UI.updateCombo(combo);
      }
      stats.mushroomsKilled += ev.mushroomsKilled;
    }

    // Powerup collected
    if (ev.powerupCollected) {
      stats.powerupsCollected++;
      applyPowerup(ev.powerupCollected);
    }

    // Player hit by centipede
    if (ev.playerHit && !invulnerable) {
      handlePlayerHit();
      return;
    }

    // Centipede reached player zone
    if (!invulnerable && CentipedeManager.checkReachedBottom(canvasH * 0.65)) {
      handlePlayerHit();
      return;
    }

    // Level complete
    if (!levelTransitioning && CentipedeManager.allDead()) {
      levelTransitioning = true;
      addScore(100);
      Audio.sfx.levelComplete();
      setTimeout(() => nextLevel(), 600);
    }

    // Score popup decay
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      scorePopups[i].t -= rawDt * 0.8;
      scorePopups[i].y -= rawDt * 45;
      if (scorePopups[i].t <= 0) scorePopups.splice(i, 1);
    }

    UI.updatePowerupHUD(Powerups.getActiveEffectsHUD());
  }

  function applyPowerup(type) {
    if (type === 'EXTRA_LIFE') {
      lives = Math.min(lives + 1, 9);
      UI.updateLives(lives);
      Audio.sfx.extraLife();
    } else if (type === 'BOMB') {
      let bonus = 0;
      const mult = Powerups.getScoreMultiplier();
      for (const c of CentipedeManager.list) {
        for (const seg of c.segments) {
          bonus += 10 * mult;
          Particles.spawn(
            seg.x + CentipedeManager.SEG_SIZE / 2,
            seg.y + CentipedeManager.SEG_SIZE / 2,
            'explosion', 10
          );
        }
      }
      CentipedeManager.clear();
      addScore(bonus);
      Audio.sfx.bomb();
      if (settings.shake) UI.shake();
    } else {
      Powerups.applyEffect(type);
    }
    UI.updatePowerupHUD(Powerups.getActiveEffectsHUD());
  }

  function handlePlayerHit() {
    if (invulnerable) return;
    lives--;
    combo = 0;
    UI.updateLives(lives);
    UI.updateCombo(0);
    Audio.sfx.playerHit();
    if (settings.shake) UI.shake();
    Powerups.removeEffect('SHIELD');
    Particles.spawn(
      Player.state.x + Player.state.w / 2,
      Player.state.y + Player.state.h / 2,
      'hit', 14
    );

    if (lives <= 0) { doGameOver(); return; }

    invulnerable = true;
    invulnTimer  = INVULN_TIME;
    Player.reset(canvasW, canvasH);
  }

  function doGameOver() {
    running = false;
    Audio.stopMusic();
    Audio.sfx.gameOver();
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }

    const isNew = score > bestScore;
    if (isNew) { bestScore = score; saveBestScore(); UI.updateMenuBestScore(bestScore); }

    setTimeout(() => {
      UI.showGameOver(score, bestScore, level,
        stats.segmentsKilled, stats.mushroomsKilled, stats.powerupsCollected, isNew);
    }, 600);
  }

  function addScore(pts) {
    score += pts;
    UI.updateScore(score);
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
      UI.updateBest(bestScore);
    }
  }

  // ---- RENDER ----
  let levelAnnounceTimer = 0;

  function render() {
    ctx.clearRect(0, 0, canvasW, canvasH);

    // BG gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
    grad.addColorStop(0, '#0a0e27');
    grad.addColorStop(1, '#0b1a0b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    drawGrid();
    drawPlayerZoneLine();

    Mushrooms.draw(ctx);
    Powerups.draw(ctx);
    Enemies.draw(ctx);
    CentipedeManager.draw(ctx);
    Projectiles.draw(ctx);
    Player.draw(ctx, invulnerable, invulnTimer);
    Particles.draw(ctx);
    drawScorePopups();

    // Level announce
    if (levelAnnounceTimer > 0) {
      levelAnnounceTimer -= 0.016;
      const a = Math.min(1, levelAnnounceTimer) * Math.min(1, (2 - levelAnnounceTimer) * 2);
      ctx.save();
      ctx.globalAlpha  = Math.max(0, a);
      ctx.fillStyle    = '#ffff00';
      ctx.shadowColor  = '#ffff00';
      ctx.shadowBlur   = 30;
      ctx.font         = 'bold 32px Orbitron, "Press Start 2P", monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LEVEL ' + level, canvasW / 2, canvasH / 2);
      ctx.restore();
    }
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(0,212,255,0.04)';
    ctx.lineWidth   = 1;
    const cell = 30;
    for (let x = 0; x <= canvasW; x += cell) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke();
    }
    for (let y = 0; y <= canvasH; y += cell) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
    }
  }

  function drawPlayerZoneLine() {
    const y = canvasH * 0.65;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.1)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawScorePopups() {
    for (const p of scorePopups) {
      ctx.save();
      ctx.globalAlpha  = Math.max(0, p.t);
      ctx.fillStyle    = '#00d4ff';
      ctx.shadowColor  = '#00d4ff';
      ctx.shadowBlur   = 8;
      ctx.font         = 'bold 11px "Press Start 2P", monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
      ctx.restore();
    }
  }

  // ---- MUSIC TEMPO ----
  function getMusicTempo() {
    const frac = Math.min(CentipedeManager.getSpeed() / 400, 1);
    return 0.22 - frac * 0.1;
  }

  // ---- PERSISTENCE ----
  function saveBestScore()  { try { localStorage.setItem('centipede_best', bestScore); } catch(e) {} }
  function loadBestScore()  { try { bestScore = parseInt(localStorage.getItem('centipede_best')) || 0; } catch(e) { bestScore = 0; } }
  function saveSettings()   { try { localStorage.setItem('centipede_settings', JSON.stringify(settings)); } catch(e) {} }
  function loadSettings()   {
    try {
      const s = JSON.parse(localStorage.getItem('centipede_settings') || 'null');
      if (s) Object.assign(settings, s);
    } catch(e) {}
    if (!settings.scanlines) document.querySelectorAll('.scan-lines').forEach(el => el.classList.add('hidden'));
  }

  window.Game = { getMusicTempo };
  return { init };
})();

document.addEventListener('DOMContentLoaded', () => Game.init());