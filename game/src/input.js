// Keyboard and pointer input for Aurora Harvest. Held keys give a steering
// direction; the mouse gives a target the lantern chases when no key is
// held. One-shot presses (start, restart, pause, mute) are queued as bit
// flags and taken once by the loop, so a press between two frames is never
// lost and never counted twice.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  // The mouse target in logical field coordinates; -1 means "never moved".
  let mouseX = -1;
  let mouseY = -1;

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    held.clear();
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
    actions |= ACTION_CONFIRM;
  });

  function has(codeSet) {
    for (const code of codeSet) if (held.has(code)) return true;
    return false;
  }

  return {
    /** Keyboard steering as {x, y}, each -1, 0 or 1, normalised on diagonals. */
    direction() {
      const x = (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
      const y = (has(DOWN) ? 1 : 0) - (has(UP) ? 1 : 0);
      if (x !== 0 && y !== 0) {
        const len = Math.SQRT1_2;
        return { x: x * len, y: y * len };
      }
      return { x, y };
    },
    /** The mouse target in field coordinates, or null when never moved. */
    mouseTarget() {
      if (mouseX < 0) return null;
      return { x: mouseX, y: mouseY };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
