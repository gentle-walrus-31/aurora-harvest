// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the
// margin filled with the backdrop colour. Everything is drawn on the canvas
// — night sky, moving aurora, twinkling stars, glowing orbs, storm clouds,
// the lantern and the HUD — with no image or font loaded from anywhere.
import { FIELD, FONT, LIVES, PALETTE, TARGET_SCORE } from './config.js';
import { KIND_COMET, KIND_ORB, KIND_SHIELD, KIND_STORM } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };
const HEART_SIZE = 20;
const HEART_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Skor ');
  const levelLabel = cachedLabel('Level ');
  const finalLabel = cachedLabel('Skor ');
  const bestLabel = cachedLabel('Best ');
  const comboLabel = cachedLabel('Combo x');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function circle(x, y, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function glow(x, y, radius, color, alpha) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawSky(state) {
    const sky = context.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Three aurora ribbons, each a waving band of light, drifting with time.
    context.save();
    context.globalCompositeOperation = 'lighter';
    const ribbons = [
      { base: 150, amp: 46, speed: 0.11, colour: PALETTE.auroraGreen, width: 74 },
      { base: 210, amp: 60, speed: 0.07, colour: PALETTE.auroraTeal, width: 96 },
      { base: 260, amp: 38, speed: 0.15, colour: PALETTE.auroraViolet, width: 60 },
    ];
    for (const ribbon of ribbons) {
      context.beginPath();
      context.moveTo(0, ribbon.base);
      for (let x = 0; x <= FIELD.width; x += 32) {
        const y = ribbon.base + Math.sin(x / 260 + state.elapsed * ribbon.speed * 4) * ribbon.amp
          + Math.sin(x / 90 - state.elapsed * ribbon.speed * 2) * 14;
        context.lineTo(x, y);
      }
      for (let x = FIELD.width; x >= 0; x -= 32) {
        const y = ribbon.base + ribbon.width + Math.sin(x / 240 + state.elapsed * ribbon.speed * 4) * ribbon.amp;
        context.lineTo(x, y);
      }
      context.closePath();
      context.globalAlpha = 0.16;
      context.fillStyle = ribbon.colour;
      context.fill();
    }
    context.restore();

    // Twinkling stars, drifting slowly left with parallax by depth.
    for (const star of state.stars) {
      const twinkle = 0.45 + 0.55 * Math.sin(state.elapsed * star.twinkle + star.phase);
      context.globalAlpha = 0.35 + 0.65 * twinkle * star.depth;
      circle(star.x, star.y, star.size, '#e8ecff');
    }
    context.globalAlpha = 1;

    // The moon, high on the right, and dark hills along the bottom.
    glow(1120, 92, 90, '#f5f0d8', 0.5);
    circle(1120, 92, 34, '#f5f0d8');
    circle(1108, 84, 30, PALETTE.skyTop);
    context.fillStyle = PALETTE.hill;
    context.beginPath();
    context.moveTo(0, FIELD.height);
    context.lineTo(0, 668);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, 668 - Math.sin(x / 220 + 1.2) * 22 - 8);
    }
    context.lineTo(FIELD.width, FIELD.height);
    context.closePath();
    context.fill();
  }

  function drawItems(state) {
    for (const item of state.items) {
      if (!item.active) continue;
      const bob = Math.sin(item.phase) * 3;
      if (item.kind === KIND_ORB) {
        const pulse = 1 + 0.12 * Math.sin(item.phase * 2);
        glow(item.x, item.y + bob, item.radius * 3.2, item.colour, 0.55);
        circle(item.x, item.y + bob, item.radius * pulse, item.colour);
        circle(item.x - 4, item.y + bob - 4, item.radius * 0.35, '#ffffff');
      } else if (item.kind === KIND_STORM) {
        const flicker = Math.sin(item.phase * 5) > 0.86;
        context.fillStyle = PALETTE.stormDark;
        context.beginPath();
        context.arc(item.x - 16, item.y + 6, 20, 0, Math.PI * 2);
        context.arc(item.x + 16, item.y + 6, 20, 0, Math.PI * 2);
        context.arc(item.x, item.y - 8, 24, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.storm;
        context.beginPath();
        context.arc(item.x - 12, item.y, 16, 0, Math.PI * 2);
        context.arc(item.x + 12, item.y, 16, 0, Math.PI * 2);
        context.arc(item.x, item.y - 12, 18, 0, Math.PI * 2);
        context.fill();
        // Angry eyes, and a lightning flash when the cloud crackles.
        circle(item.x - 9, item.y - 2, 3.5, flicker ? '#ffe066' : '#ff8f8f');
        circle(item.x + 9, item.y - 2, 3.5, flicker ? '#ffe066' : '#ff8f8f');
        if (flicker) {
          context.strokeStyle = '#ffe066';
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(item.x, item.y + 14);
          context.lineTo(item.x - 6, item.y + 30);
          context.lineTo(item.x + 2, item.y + 30);
          context.lineTo(item.x - 4, item.y + 46);
          context.stroke();
        }
      } else if (item.kind === KIND_COMET) {
        context.strokeStyle = '#ffb347';
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(item.x, item.y);
        context.lineTo(item.x - item.vx * 0.22, item.y - item.vy * 0.22);
        context.stroke();
        glow(item.x, item.y, item.radius * 3.4, '#ffb347', 0.7);
        circle(item.x, item.y, item.radius, '#ffd76a');
        circle(item.x, item.y, item.radius * 0.45, '#ffffff');
      } else if (item.kind === KIND_SHIELD) {
        glow(item.x, item.y + bob, item.radius * 3, PALETTE.shield, 0.6);
        context.strokeStyle = PALETTE.shield;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(item.x, item.y + bob, item.radius, 0, Math.PI * 2);
        context.stroke();
        text('S', item.x, item.y + bob + 6, 20, PALETTE.shield, 'center');
      }
    }

    // Sparkle particles, fading as they age.
    for (const spark of state.particles) {
      if (!spark.active) continue;
      context.globalAlpha = Math.max(0, spark.life / spark.maxLife);
      circle(spark.x, spark.y, spark.size, spark.colour);
    }
    context.globalAlpha = 1;
  }

  function drawLantern(state) {
    const player = state.player;
    const flicker = 1 + 0.08 * Math.sin(state.elapsed * 9) + 0.05 * Math.sin(state.elapsed * 23);
    glow(player.x, player.y, 86 * flicker, PALETTE.lantern, 0.5);
    glow(player.x, player.y, 44, PALETTE.lanternCore, 0.65);

    // Blink while invulnerable after a hit: hidden on every other tenth.
    const visible = player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1;
    if (visible) {
      // Little wings, beating with time.
      const flap = Math.sin(state.elapsed * 14) * 8;
      context.fillStyle = '#ffe9a8';
      context.beginPath();
      context.ellipse(player.x - 18, player.y - 12 - flap, 12, 6, -0.5, 0, Math.PI * 2);
      context.ellipse(player.x + 18, player.y - 12 + flap, 12, 6, 0.5, 0, Math.PI * 2);
      context.fill();
      // The lantern body: warm glass, a dark cap and a bright flame.
      context.fillStyle = '#ffcf5c';
      context.beginPath();
      context.ellipse(player.x, player.y, 15, 19, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#3a2c12';
      context.fillRect(player.x - 9, player.y - 24, 18, 7);
      circle(player.x, player.y - 2, 7 * flicker, PALETTE.lanternCore);
      circle(player.x - 4, player.y - 6, 2.5, '#ffffff');
    }

    // The shield ring while a shield power-up is running.
    if (player.shield > 0) {
      context.strokeStyle = PALETTE.shield;
      context.globalAlpha = 0.65 + 0.35 * Math.sin(state.elapsed * 6);
      context.lineWidth = 3;
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 14, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  function drawHeart(x, y, size, filled) {
    context.fillStyle = filled ? '#ff6b81' : '#3a415c';
    context.beginPath();
    context.moveTo(x, y + size * 0.35);
    context.bezierCurveTo(x - size * 0.6, y - size * 0.25, x - size * 0.25, y - size * 0.7, x, y - size * 0.2);
    context.bezierCurveTo(x + size * 0.25, y - size * 0.7, x + size * 0.6, y - size * 0.25, x, y + size * 0.35);
    context.fill();
  }

  function drawHud(state, best, muted) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 28, PALETTE.text, 'left');
    text(`Target ${TARGET_SCORE}`, 24, 52, 18, PALETTE.muted, 'left');
    // Progress toward the winning score.
    const barWidth = 190;
    const progress = Math.min(1, state.score / TARGET_SCORE);
    context.fillStyle = '#262c46';
    context.fillRect(24, 78, barWidth, 10);
    context.fillStyle = PALETTE.orb;
    context.fillRect(24, 78, barWidth * progress, 10);

    text(levelLabel(state.level), FIELD.width / 2, 18, 28, PALETTE.text, 'center');
    const minutes = Math.floor(state.elapsed / 60);
    const seconds = Math.floor(state.elapsed % 60);
    text(`${minutes}:${String(seconds).padStart(2, '0')}`, FIELD.width / 2, 52, 18, PALETTE.muted, 'center');

    const firstHeart = FIELD.width - 24 - LIVES * (HEART_SIZE + HEART_GAP) + HEART_GAP;
    text('Nyawa', firstHeart - 12, 18, 28, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      drawHeart(firstHeart + life * (HEART_SIZE + HEART_GAP) + HEART_SIZE / 2, 30, HEART_SIZE, life < state.lives);
    }
    text(bestLabel(best), FIELD.width - 24, 56, 18, PALETTE.muted, 'right');

    if (state.combo >= 2) {
      const pulse = 1 + 0.1 * Math.sin(state.elapsed * 10);
      context.save();
      context.translate(24, 108);
      context.scale(pulse, pulse);
      text(comboLabel(state.mult), 0, 0, 26, PALETTE.orb, 'left');
      context.restore();
    }
    if (state.player.shield > 0) {
      text(`Perisai ${Math.ceil(state.player.shield)} dtk`, 24, 140, 18, PALETTE.shield, 'left');
    }
    if (muted) text('Suara: mati (M)', FIELD.width - 24, 88, 16, PALETTE.muted, 'right');
    if (state.levelFlash > 0) {
      context.globalAlpha = Math.min(1, state.levelFlash);
      text(`Level ${state.level}!`, FIELD.width / 2, 120, 40, PALETTE.auroraGreen, 'center');
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.globalAlpha = 0.94;
    context.fillRect(x, y, PANEL.width, height);
    context.globalAlpha = 1;
    context.strokeStyle = PALETTE.auroraTeal;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.orb, 'center');
  }

  const TITLE_LINES = [
    'Kumpulkan Orb Cahaya, hindari Awan Badai.',
    'Capai skor 500 untuk menang. 3 nyawa.',
    'Gerak: WASD / panah, atau ikuti mouse.',
    'Komet Emas +50 dan +1 nyawa. Perisai kebal 5 detik.',
    'P = jeda,  M = suara,  Spasi = mulai',
    '',
  ];
  const PAUSED_LINES = ['Aurora menunggu. Lentera beristirahat sejenak.'];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['', '', 'Langit malam kini terang benderang karenamu.'];

  /** Paint one frame: sky, items, lantern, then HUD or a panel. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    let shakeX = 0;
    let shakeY = 0;
    if (state.shake > 0) {
      shakeX = (Math.random() - 0.5) * state.shake * 22;
      shakeY = (Math.random() - 0.5) * state.shake * 22;
    }
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawSky(state);
    drawItems(state);
    drawLantern(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('Aurora Harvest', TITLE_LINES, 'Tekan Spasi atau klik untuk mulai');
      return;
    }
    drawHud(state, best, muted);
    if (screen === SCREEN_PAUSED) drawPanel('Jeda', PAUSED_LINES, 'Tekan P untuk lanjut');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Game Over', OVER_LINES, 'Tekan R atau klik untuk main lagi');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(state.score);
      WIN_LINES[1] = bestLabel(best);
      drawPanel('Menang! Aurora Panen!', WIN_LINES, 'Tekan R atau klik untuk main lagi');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
