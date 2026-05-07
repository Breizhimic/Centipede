/* js/ui.js — UI / Screen Management */

const UI = (() => {
  const screens = {};
  let activeScreen = null;

  function init() {
    document.querySelectorAll('.screen').forEach(s => {
      screens[s.id] = s;
    });
  }

  /* show : cache l'écran actif et affiche le nouveau */
  function show(id) {
    if (activeScreen) activeScreen.classList.remove('active');
    const s = screens[id];
    if (s) { s.classList.add('active'); activeScreen = s; }
  }

  /* hide : cache un écran sans toucher à activeScreen
     (utilisé pour les overlays temporaires) */
  function hide(id) {
    if (screens[id]) screens[id].classList.remove('active');
  }

  /* showOverlay / hideOverlay : affiche un écran PAR-DESSUS l'écran actif
     sans changer activeScreen — parfait pour les transitions de niveau */
  function showOverlay(id) {
    const s = screens[id];
    if (s) s.classList.add('active');
  }
  function hideOverlay(id) {
    const s = screens[id];
    if (s) s.classList.remove('active');
  }

  /* ---- HUD UPDATE ---- */
  function updateScore(val) {
    const el = document.getElementById('hud-score');
    if (el) {
      el.textContent = val;
      el.classList.remove('score-bump');
      void el.offsetWidth;
      el.classList.add('score-bump');
    }
  }
  function updateBest(val)  { const el = document.getElementById('hud-best');  if (el) el.textContent = val; }
  function updateLevel(val) { const el = document.getElementById('hud-level'); if (el) el.textContent = val; }

  function updateLives(lives) {
    const el = document.getElementById('lives-icons');
    if (!el) return;
    el.textContent = '❤️'.repeat(Math.max(0, lives));
  }

  function updateCombo(combo) {
    const el = document.getElementById('hud-combo');
    if (!el) return;
    if (combo > 1) {
      el.classList.remove('hidden');
      document.getElementById('combo-display').textContent = `COMBO x${combo}`;
    } else {
      el.classList.add('hidden');
    }
  }

  function updatePowerupHUD(effects) {
    const el      = document.getElementById('hud-powerup');
    const display = document.getElementById('powerup-display');
    if (!el || !display) return;
    if (effects.length > 0) {
      el.classList.remove('hidden');
      display.textContent = effects[0];
    } else {
      el.classList.add('hidden');
    }
  }

  /* ---- MENU SCORES ---- */
  function updateMenuBestScore(val) {
    const el = document.getElementById('menu-best-score');
    if (el) el.textContent = String(val).padStart(5, '0');
  }

  /* ---- GAME OVER ---- */
  function showGameOver(score, best, level, segments, mushrooms, powerups, isNewRecord) {
    document.getElementById('go-score').textContent     = score;
    document.getElementById('go-best').textContent      = best;
    document.getElementById('go-level').textContent     = level;
    document.getElementById('go-segments').textContent  = segments;
    document.getElementById('go-mushrooms').textContent = mushrooms;
    document.getElementById('go-powerups').textContent  = powerups;

    const badge = document.getElementById('new-record-badge');
    if (badge) badge.classList.toggle('hidden', !isNewRecord);

    show('screen-gameover');
  }

  /* ---- LEVEL COMPLETE ---- */
  /* S'affiche en overlay par-dessus screen-game, puis se cache
     et appelle le callback pour lancer le niveau suivant.
     screen-game reste l'écran actif tout au long. */
  function showLevelComplete(score, segments, nextLevel, callback) {
    document.getElementById('lc-score').textContent      = score;
    document.getElementById('lc-segments').textContent   = segments;
    document.getElementById('lc-next-level').textContent = `LEVEL ${nextLevel}`;

    showOverlay('screen-level');

    setTimeout(() => {
      hideOverlay('screen-level');
      if (callback) callback();
    }, 2800);
  }

  /* ---- SCREEN SHAKE ---- */
  function shake() {
    const el = document.getElementById('canvas-wrapper');
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
  }

  return {
    init, show, hide, showOverlay, hideOverlay,
    updateScore, updateBest, updateLevel, updateLives,
    updateCombo, updatePowerupHUD, updateMenuBestScore,
    showGameOver, showLevelComplete, shake,
  };
})();