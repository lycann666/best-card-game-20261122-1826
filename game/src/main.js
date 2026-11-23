// Bootstrap and frame loop for Rune Clash: owns the canvas, the screen state machine,
// the enemy-turn driver, and the transient effects (damage numbers, win confetti).
// ?shot=title|play|win|loss&seed=N renders one fixed scene for the screenshots.
import { aiPlan, applyAction, createGame, endTurn } from './engine.js';
import { createInput } from './input.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, VIEW_H, VIEW_W, drawGame, layout } from './render.js';
import { sfx, toggleMute, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '7') || 7;

let game;
let screen;
let input;
const floaters = [];
const particles = [];
let aiTimer = 0;
let lastTime = 0;
let overAt = 0;
let announcedOver = false;

function newGame() {
  game = createGame((seed + Math.floor(Math.random() * 1000)) % 100000);
  screen = SCREEN_TITLE;
  input = createInput(game, hooks);
  floaters.length = 0;
  particles.length = 0;
  announcedOver = false;
  statusEl.textContent = 'Rune Clash: title screen. Press Enter to duel.';
}

const hooks = {
  onSelect() {
    sfx.click();
  },
  onDeny() {
    sfx.click();
  },
  onPlay() {
    sfx.play();
  },
  onAttack() {
    sfx.hit();
  },
  onTurn() {
    sfx.turn();
  },
  afterAction() {
    drainEvents();
    checkOver();
  },
};

function burstConfetti() {
  const colors = ['#ffd94a', '#e2483a', '#2f7fd0', '#3f9e4d', '#f2c96b'];
  for (let i = 0; i < 90; i += 1) {
    particles.push({
      x: 200 + Math.random() * 880,
      y: -20 - Math.random() * 120,
      vx: (Math.random() - 0.5) * 60,
      vy: 60 + Math.random() * 120,
      size: 6 + Math.random() * 8,
      color: colors[i % colors.length],
      life: 1,
    });
  }
}

function drainEvents() {
  const geo = layout(game);
  for (const event of game.events.splice(0)) {
    if (event.kind === 'damage') {
      const row = event.side === 'enemy' ? geo.boardEnemy : geo.boardPlayer;
      const box = row[event.index];
      if (box) floaters.push({ x: box.x + 56, y: box.y + 40, text: `-${event.amount}`, color: '#ff6a55', life: 1 });
    } else if (event.kind === 'hero-damage') {
      const box = event.side === 'enemy' ? geo.heroEnemy : geo.heroPlayer;
      floaters.push({ x: box.x + 150, y: box.y + 50, text: `-${event.amount}`, color: '#ff6a55', life: 1 });
    } else if (event.kind === 'spell') {
      const box = event.side === 'enemy' ? geo.heroEnemy : geo.heroPlayer;
      floaters.push({ x: box.x + 150, y: box.y + 20, text: event.name, color: '#b79cff', life: 1 });
    }
  }
}

function checkOver() {
  if (game.over && !announcedOver) {
    announcedOver = true;
    overAt = performance.now();
    screen = SCREEN_OVER;
    if (game.winner === 'player') {
      sfx.win();
      burstConfetti();
      statusEl.textContent = 'Victory! Lyra wins the duel. Press Enter to play again.';
    } else {
      sfx.lose();
      statusEl.textContent = 'Defeat. The Warden wins. Press Enter to duel again.';
    }
  }
}

function driveEnemy(dt) {
  if (screen !== SCREEN_PLAY || game.over || game.turn !== 'enemy') return;
  aiTimer += dt;
  if (aiTimer < 520) return;
  aiTimer = 0;
  const plan = aiPlan(game, 'enemy', 'balanced');
  if (plan.length === 0) {
    endTurn(game);
    sfx.turn();
    drainEvents();
    checkOver();
    return;
  }
  if (applyAction(game, plan[0])) {
    if (plan[0].type === 'attack') sfx.hit();
    else sfx.play();
  }
  drainEvents();
  checkOver();
}

function step(now) {
  const dt = Math.min(100, now - (lastTime || now));
  lastTime = now;
  driveEnemy(dt);
  for (const f of floaters) f.life -= dt / 900;
  for (let i = floaters.length - 1; i >= 0; i -= 1) if (floaters[i].life <= 0) floaters.splice(i, 1);
  for (const p of particles) {
    p.x += (p.vx * dt) / 1000;
    p.y += (p.vy * dt) / 1000;
    p.vy += 30 * (dt / 1000);
    p.life -= dt / 4000;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) if (particles[i].life <= 0) particles.splice(i, 1);
  const hint = game.over
    ? ''
    : screen === SCREEN_PLAY
      ? game.turn === 'player'
        ? 'Your turn — play a card, attack, or end your turn.'
        : 'The Warden is thinking…'
      : '';
  drawGame(ctx, { game, screen, selected: input.state.selected, floaters, particles, time: now, message: hint });
  if (!shotName) requestAnimationFrame(step);
}

function toViewPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

canvas.addEventListener('click', (event) => {
  unlockAudio();
  const point = toViewPoint(event);
  if (screen === SCREEN_TITLE) {
    screen = SCREEN_PLAY;
    sfx.play();
    statusEl.textContent = 'Your turn — play a card, attack, or end your turn.';
    return;
  }
  if (screen === SCREEN_OVER) {
    if (performance.now() - overAt > 800) newGame();
    return;
  }
  input.handleClick(point);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') {
    const muted = toggleMute();
    statusEl.textContent = muted ? 'Sound off.' : 'Sound on.';
    return;
  }
  if (event.key === 'Enter') {
    unlockAudio();
    if (screen === SCREEN_TITLE) {
      screen = SCREEN_PLAY;
      sfx.play();
    } else if (screen === SCREEN_OVER) {
      newGame();
    }
    return;
  }
  if (screen === SCREEN_PLAY) input.handleKey(event.key);
});

if (shotName) {
  const staged = stageShot(shotName, seed);
  game = staged.game;
  screen = staged.screen;
  input = createInput(game, hooks);
  if (screen === SCREEN_OVER && game.winner === 'player') {
    // Fixed confetti for the win screenshot: seeded, mid-fall.
    const colors = ['#ffd94a', '#e2483a', '#2f7fd0', '#3f9e4d', '#f2c96b'];
    for (let i = 0; i < 60; i += 1) {
      particles.push({
        x: 120 + ((i * 173) % 1040),
        y: 40 + ((i * 97) % 420),
        vx: 0,
        vy: 0,
        size: 7 + (i % 4) * 2,
        color: colors[i % colors.length],
        life: 1,
      });
    }
  }
  drawGame(ctx, { game, screen, selected: null, floaters, particles, time: 1200, message: '' });
  statusEl.textContent = `Rune Clash screenshot scene: ${shotName}.`;
  window.__shotReady = true;
} else {
  newGame();
  requestAnimationFrame(step);
}
