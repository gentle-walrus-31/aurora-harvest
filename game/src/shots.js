// The screenshot scenes behind ?shot=start|play|end|combo. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (chase the nearest orb, lean away from
// storm clouds), so the frame is what a short game really looks like and
// the same seed always gives the same frame.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, KIND_ORB, KIND_STORM } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 18;
/** Stop the play scene once the score reaches this, so it stays mid-game. */
const PLAY_SCORE_CAP = 240;
const COMBO_LIMIT_SECONDS = 90;
const END_SAFE_SECONDS = 18;
/** Switch the end scene to reckless flying once the score reaches this. */
const END_SAFE_SCORE = 120;
const END_LIMIT_SECONDS = 150;
const SAMPLE = 1 / 30;

/** Steer toward `target` while pushing away from nearby storm clouds. */
function steer(state, targetX, targetY, avoid) {
  const player = state.player;
  let dx = targetX - player.x;
  let dy = targetY - player.y;
  const dist = Math.hypot(dx, dy) || 1;
  dx /= dist;
  dy /= dist;
  if (avoid) {
    for (const item of state.items) {
      if (!item.active || item.kind !== KIND_STORM) continue;
      const sx = player.x - item.x;
      const sy = player.y - item.y;
      const gap = Math.hypot(sx, sy);
      if (gap > 0 && gap < 150) {
        const push = (150 - gap) / 150;
        dx += (sx / gap) * push * 1.6;
        dy += (sy / gap) * push * 1.6;
      }
    }
  }
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** The nearest collectible (orb first, comet when it is close). */
function nearestTarget(state) {
  const player = state.player;
  let best = null;
  let bestDist = Infinity;
  for (const item of state.items) {
    if (!item.active) continue;
    if (item.kind !== KIND_ORB && item.kind !== 2) continue;
    const dist = Math.hypot(item.x - player.x, item.y - player.y);
    const bonus = item.kind === 2 ? -160 : 0;
    if (dist + bonus < bestDist) {
      bestDist = dist + bonus;
      best = item;
    }
  }
  if (best !== null) return { x: best.x, y: best.y };
  return { x: FIELD.width / 2, y: FIELD.height / 2 };
}

/** The autopilot's move for one step: chase light, dodge storms. */
function autopilot(state, avoid) {
  const target = nearestTarget(state);
  return steer(state, target.x, target.y, avoid);
}

/** The nearest storm cloud, for the end scene's reckless pilot. */
function nearestStorm(state) {
  const player = state.player;
  let best = null;
  let bestDist = Infinity;
  for (const item of state.items) {
    if (!item.active || item.kind !== KIND_STORM) continue;
    const dist = Math.hypot(item.x - player.x, item.y - player.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = item;
    }
  }
  return best;
}

/**
 * Set `world` to the named scene (start, play, combo or end; any other name
 * is start) and return the screen to draw over it and the best score.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'combo') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, 0, 0, 0, 0, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'combo') {
    for (let index = 0; index < COMBO_LIMIT_SECONDS / STEP; index += 1) {
      const move = autopilot(world.state, true);
      const events = world.step(STEP, move.x, move.y, 0, 0, false, false);
      if (world.state.combo >= 3 || events & (EVENT_OVER | EVENT_WIN)) break;
    }
    const over = world.state.lives === 0;
    const won = world.state.won;
    return { screen: won ? SCREEN_WIN : over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }

  if (name === 'play') {
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      const move = autopilot(world.state, true);
      const events = world.step(STEP, move.x, move.y, 0, 0, false, false);
      if (events & (EVENT_OVER | EVENT_WIN)) break;
      if (world.state.score >= PLAY_SCORE_CAP) break;
    }
    const over = world.state.lives === 0;
    const won = world.state.won;
    return { screen: won ? SCREEN_WIN : over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }

  // End scene: play carefully for a while (but stop before the score can
  // reach the winning line), then fly straight into the storms like a
  // hurried player, until the last life is gone.
  for (let index = 0; index < END_SAFE_SECONDS / STEP; index += 1) {
    const move = autopilot(world.state, true);
    if (world.step(STEP, move.x, move.y, 0, 0, false, false) & (EVENT_OVER | EVENT_WIN)) break;
    if (world.state.score >= END_SAFE_SCORE) break;
  }
  for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
    const storm = nearestStorm(world.state);
    let move;
    if (storm !== null) {
      const dx = storm.x - world.state.player.x;
      const dy = storm.y - world.state.player.y;
      const len = Math.hypot(dx, dy) || 1;
      move = { x: dx / len, y: dy / len };
    } else {
      move = autopilot(world.state, false);
    }
    if (world.step(STEP, move.x, move.y, 0, 0, false, false) & (EVENT_OVER | EVENT_WIN)) break;
  }
  const won = world.state.won;
  return { screen: won ? SCREEN_WIN : SCREEN_OVER, best: world.state.score };
}
