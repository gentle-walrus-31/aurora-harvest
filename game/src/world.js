// Aurora Harvest — the game's rules and state, with no drawing and no
// browser in it: the lantern, the pool of falling orbs, storm clouds and
// power-ups, spawning, collisions, combo, score, lives and level. step()
// advances one fixed step and returns what happened as bit flags, so the
// caller can react (sounds, announcements) without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.
import {
  COMBO,
  COMET,
  FIELD,
  LEVEL,
  LIVES,
  ORB,
  PARTICLE_POOL,
  PLAYER,
  POOL_SIZE,
  SHIELD,
  STAR_COUNT,
  STORM,
  TARGET_SCORE,
} from './config.js';
import { randPick, randRange } from './random.js';

export const KIND_ORB = 0;
export const KIND_STORM = 1;
export const KIND_COMET = 2;
export const KIND_SHIELD = 3;

export const EVENT_ORB = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_POWER = 16;
export const EVENT_LEVEL = 32;

const ORB_COLOURS = ['#ffd94d', '#7ce7ff', '#ffb3e6', '#b8ff9e'];

function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const reach = a.radius + b.radius;
  return dx * dx + dy * dy < reach * reach;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    invulnerable: 0,
    shield: 0,
  };

  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({
      active: false, kind: KIND_ORB, x: 0, y: 0, vx: 0, vy: 0,
      radius: 0, speed: 0, phase: 0, colour: ORB_COLOURS[0],
    });
  }

  const particles = [];
  for (let index = 0; index < PARTICLE_POOL; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, colour: '#ffffff' });
  }

  // The night sky's stars are fixed for a run: same seed, same sky.
  const stars = [];
  for (let index = 0; index < STAR_COUNT; index += 1) {
    stars.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height * 0.72,
      size: randRange(random, 0.8, 2.6),
      phase: random() * Math.PI * 2,
      twinkle: randRange(random, 0.6, 2.2),
      depth: randRange(random, 0.25, 1),
    });
  }

  const state = {
    player,
    items,
    particles,
    stars,
    score: 0,
    lives: LIVES,
    level: 1,
    elapsed: 0,
    combo: 0,
    comboTimer: 0,
    mult: 1,
    orbTimer: 0,
    stormTimer: 0,
    cometTimer: 0,
    shieldTimer: 0,
    shake: 0,
    won: false,
    over: false,
    levelFlash: 0,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 0;
    player.shield = 0;
    for (const item of items) item.active = false;
    for (const spark of particles) spark.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.mult = 1;
    state.orbTimer = ORB.interval;
    state.stormTimer = STORM.interval;
    state.cometTimer = COMET.interval;
    state.shieldTimer = SHIELD.interval;
    state.shake = 0;
    state.won = false;
    state.over = false;
    state.levelFlash = 0;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) {
      if (!items[index].active) return items[index];
    }
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) {
      if (!particles[index].active) return particles[index];
    }
    return null;
  }

  function burst(x, y, colour, count, speed) {
    for (let n = 0; n < count; n += 1) {
      const spark = freeParticle();
      if (spark === null) return;
      const angle = random() * Math.PI * 2;
      const push = randRange(random, speed * 0.3, speed);
      spark.active = true;
      spark.x = x;
      spark.y = y;
      spark.vx = Math.cos(angle) * push;
      spark.vy = Math.sin(angle) * push - 20;
      spark.maxLife = randRange(random, 0.35, 0.8);
      spark.life = spark.maxLife;
      spark.size = randRange(random, 2, 4.5);
      spark.colour = colour;
    }
  }

  function spawnOrb() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_ORB;
    item.radius = ORB.radius;
    item.x = randRange(random, ORB.radius, FIELD.width - ORB.radius);
    item.y = -ORB.radius;
    item.vx = randRange(random, -ORB.drift, ORB.drift);
    item.vy = ORB.speed + ORB.speedPerLevel * (state.level - 1) + random() * 40;
    item.speed = item.vy;
    item.phase = random() * Math.PI * 2;
    item.colour = randPick(random, ORB_COLOURS);
  }

  function spawnStorm() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_STORM;
    item.radius = STORM.radius;
    item.x = randRange(random, STORM.radius, FIELD.width - STORM.radius);
    item.y = -STORM.radius;
    item.vx = randRange(random, -STORM.drift, STORM.drift);
    item.vy = STORM.speed + STORM.speedPerLevel * (state.level - 1) + random() * 30;
    item.speed = item.vy;
    item.phase = random() * Math.PI * 2;
    item.colour = '#4a4560';
  }

  function spawnComet() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_COMET;
    item.radius = COMET.radius;
    item.x = randRange(random, 120, FIELD.width - 120);
    item.y = -COMET.radius;
    item.vx = randRange(random, -90, 90);
    item.vy = COMET.speed;
    item.speed = item.vy;
    item.phase = 0;
    item.colour = '#ffb347';
  }

  function spawnShield() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_SHIELD;
    item.radius = SHIELD.radius;
    item.x = randRange(random, SHIELD.radius, FIELD.width - SHIELD.radius);
    item.y = -SHIELD.radius;
    item.vx = 0;
    item.vy = SHIELD.speed;
    item.speed = item.vy;
    item.phase = 0;
    item.colour = '#6ec6ff';
  }

  function orbInterval() {
    return Math.max(ORB.minInterval, ORB.interval * ORB.intervalScale ** (state.level - 1));
  }

  function stormInterval() {
    return Math.max(STORM.minInterval, STORM.interval * STORM.intervalScale ** (state.level - 1));
  }

  function collectOrb(item) {
    item.active = false;
    state.combo += 1;
    state.comboTimer = COMBO.window;
    // The multiplier climbs one step every 3 orbs in a row: x2 at 3, x3 at
    // 6, up to x5, so a long streak is rewarding without ending the game
    // in seconds.
    state.mult = Math.min(COMBO.maxMult, 1 + Math.floor(state.combo / 3));
    state.score += ORB.points * state.mult;
    burst(item.x, item.y, item.colour, 10, 130);
    return EVENT_ORB;
  }

  function hitStorm(item) {
    item.active = false;
    if (player.shield > 0) {
      // The shield eats the storm and the combo survives.
      burst(item.x, item.y, '#6ec6ff', 14, 170);
      return EVENT_POWER;
    }
    if (player.invulnerable > 0) return 0;
    state.lives -= 1;
    state.combo = 0;
    state.mult = 1;
    state.comboTimer = 0;
    player.invulnerable = PLAYER.invulnerable;
    state.shake = 0.55;
    burst(player.x, player.y, '#ff6b6b', 18, 220);
    if (state.lives <= 0) {
      state.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function collectComet(item) {
    item.active = false;
    if (state.lives < LIVES) {
      state.lives += 1;
      state.score += COMET.points;
    } else {
      state.score += COMET.points + COMET.fullLivesBonus;
    }
    burst(item.x, item.y, '#ffb347', 20, 240);
    return EVENT_POWER;
  }

  function collectShield(item) {
    item.active = false;
    player.shield = PLAYER.shieldTime;
    burst(item.x, item.y, '#6ec6ff', 14, 180);
    return EVENT_POWER;
  }

  /**
   * One fixed step. `moveX`/`moveY` is the keyboard direction (-1..1 each).
   * When no key is held and `hasTarget` is set, the lantern flies toward
   * the mouse target instead. With `harmless` set (the title screen's
   * backdrop) things drift but nothing scores and nothing can hurt.
   */
  function step(dt, moveX, moveY, targetX, targetY, hasTarget, harmless) {
    let events = 0;
    // Once the game is won or lost the simulation stops: nothing more can
    // score, spawn or hurt the lantern.
    if (state.over) return events;
    state.elapsed += dt;
    const nextLevel = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (nextLevel !== state.level) {
      state.level = nextLevel;
      state.levelFlash = 1.6;
      events |= EVENT_LEVEL;
    }
    if (state.levelFlash > 0) state.levelFlash = Math.max(0, state.levelFlash - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

    // Steering: keys win over the mouse; otherwise chase the pointer.
    let wantX = moveX * PLAYER.speed;
    let wantY = moveY * PLAYER.speed;
    if (moveX === 0 && moveY === 0 && hasTarget) {
      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const pull = Math.min(1, dist / 90);
        wantX = (dx / dist) * PLAYER.speed * pull;
        wantY = (dy / dist) * PLAYER.speed * pull;
      }
    }
    const ease = Math.min(1, PLAYER.accel * dt);
    player.vx += (wantX - player.vx) * ease;
    player.vy += (wantY - player.vy) * ease;
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + player.vy * dt));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.shield > 0) player.shield = Math.max(0, player.shield - dt);

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.mult = 1;
      }
    }

    // Spawning runs even on the title screen's harmless backdrop, so the
    // sky is alive behind the panel; scoring and collisions stay off there.
    state.orbTimer -= dt;
    if (state.orbTimer <= 0) {
      spawnOrb();
      state.orbTimer += orbInterval();
    }
    state.stormTimer -= dt;
    if (state.stormTimer <= 0) {
      spawnStorm();
      state.stormTimer += stormInterval();
    }
    if (!harmless) {
      state.cometTimer -= dt;
      if (state.cometTimer <= 0) {
        spawnComet();
        state.cometTimer += COMET.interval;
      }
      state.shieldTimer -= dt;
      if (state.shieldTimer <= 0) {
        spawnShield();
        state.shieldTimer += SHIELD.interval;
      }
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.phase += dt * 3;
      if (item.x < item.radius || item.x > FIELD.width - item.radius) item.vx = -item.vx;
      if (item.y - item.radius > FIELD.height) {
        item.active = false;
        continue;
      }
      if (harmless || !circleHit(item, player)) continue;
      if (item.kind === KIND_ORB) events |= collectOrb(item);
      else if (item.kind === KIND_STORM) events |= hitStorm(item);
      else if (item.kind === KIND_COMET) events |= collectComet(item);
      else if (item.kind === KIND_SHIELD) events |= collectShield(item);
      if (events & EVENT_OVER) break;
    }

    for (let index = 0; index < particles.length; index += 1) {
      const spark = particles[index];
      if (!spark.active) continue;
      spark.life -= dt;
      if (spark.life <= 0) {
        spark.active = false;
        continue;
      }
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += 60 * dt;
    }

    if (!harmless && !state.over && state.score >= TARGET_SCORE) {
      state.won = true;
      state.over = true;
      events |= EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
