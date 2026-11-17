// Aurora Harvest — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps (several in a slow frame, none in a
// fast one), and the renderer paints what is there. The game moves between
// five screens: title, play, paused, game over and win.
// ?seed=N fixes the falling pattern. ?shot=start|play|end|combo (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_LEVEL, EVENT_ORB, EVENT_OVER, EVENT_POWER, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts one visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, audio.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // On-screen touch controls and the portrait hint: updated only on change.
  const pauseBtn = document.getElementById('btn-pause');
  const muteBtn = document.getElementById('btn-mute');
  let lastScreen = '';
  let lastPortrait = false;
  let lastMuted = false;
  let lastPaused = false;
  pauseBtn.addEventListener('click', (event) => {
    event.preventDefault();
    input.queue(ACTION_PAUSE);
  });
  muteBtn.addEventListener('click', (event) => {
    event.preventDefault();
    input.queue(ACTION_MUTE);
  });

  // Screen readers hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.ensure();
    audio.startMusic();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Bermain. ${LIVES} nyawa. Kumpulkan orb sampai 500.`);
  }

  function endGame(won) {
    audio.stopMusic();
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) {
      audio.playWin();
      announce(`Menang! Skor ${world.state.score}. Best ${best}.`);
    } else {
      audio.playLose();
      announce(`Game over. Skor ${world.state.score}. Best ${best}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Suara mati.' : 'Suara hidup.');
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Bermain.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, 0, 0, 0, false, true);
      return;
    }
    const direction = input.direction();
    const target = input.mouseTarget();
    const events = world.step(
      STEP,
      direction.x,
      direction.y,
      target === null ? 0 : target.x,
      target === null ? 0 : target.y,
      target !== null,
      false,
    );
    if (events & EVENT_ORB) audio.playCollect(world.state.combo);
    if (events & EVENT_POWER) audio.playPower();
    if (events & EVENT_LEVEL) audio.playLevel();
    if (events & EVENT_HIT) {
      audio.playHit();
      announce(world.state.lives === 1 ? 'Kena badai. 1 nyawa tersisa.' : `Kena badai. ${world.state.lives} nyawa tersisa.`);
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, audio.isMuted());
    // Touch UI: the pause button only while playing or paused; the mute
    // button always. The body classes drive the portrait rotate hint.
    if (screen !== lastScreen) {
      document.body.dataset.screen = screen;
      lastScreen = screen;
    }
    const portrait = window.innerHeight > window.innerWidth;
    if (portrait !== lastPortrait) {
      document.body.classList.toggle('portrait', portrait);
      lastPortrait = portrait;
    }
    const paused = screen === SCREEN_PAUSED;
    if (paused !== lastPaused) {
      pauseBtn.textContent = paused ? '▶' : '⏸';
      pauseBtn.setAttribute('aria-label', paused ? 'Lanjut' : 'Jeda');
      lastPaused = paused;
    }
    pauseBtn.style.display = (screen === SCREEN_PLAY || paused) ? 'flex' : 'none';
    const mutedNow = audio.isMuted();
    if (mutedNow !== lastMuted) {
      muteBtn.textContent = mutedNow ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-label', mutedNow ? 'Nyalakan suara' : 'Matikan suara');
      lastMuted = mutedNow;
    }
  }

  // Leaving the tab pauses a running game rather than letting storms fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Aurora Harvest. Tekan Spasi atau klik untuk mulai.');
  // A read-only handle for automated play-testing (and curious players):
  // the live world state and the current screen, nothing more.
  window.__aurora = { state: world.state, screen: () => screen, best: () => best };
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
