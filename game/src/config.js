// Aurora Harvest — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Score that wins the game, and the lives a run starts with. */
export const TARGET_SCORE = 500;
export const LIVES = 3;

export const PLAYER = {
  radius: 20,
  speed: 470,
  /** How fast the lantern eases toward its target velocity (per second). */
  accel: 14,
  /** Seconds of flashing safety after a storm hit. */
  invulnerable: 1.5,
  /** Seconds a shield power-up lasts. */
  shieldTime: 5,
};

export const ORB = {
  radius: 13,
  speed: 120,
  speedPerLevel: 12,
  /** Seconds between orb spawns at level 1; shrinks each level. */
  interval: 0.7,
  intervalScale: 0.92,
  minInterval: 0.28,
  points: 10,
  /** Sideways drift of a falling orb, in pixels per second. */
  drift: 26,
};

export const STORM = {
  radius: 34,
  speed: 105,
  speedPerLevel: 16,
  interval: 1.6,
  intervalScale: 0.9,
  minInterval: 0.7,
  drift: 40,
};

export const COMET = {
  radius: 16,
  speed: 280,
  /** Seconds between golden comets (rare, valuable). */
  interval: 9,
  points: 50,
  /** Extra points when the comet lands while already at full lives. */
  fullLivesBonus: 100,
};

export const SHIELD = {
  radius: 16,
  speed: 150,
  /** Seconds between shield power-ups. */
  interval: 13,
};

/** Seconds of play per level, and the last level: growth stops there. */
export const LEVEL = { seconds: 20, max: 10 };

/** Combo rules: collecting orbs back-to-back raises the multiplier. */
export const COMBO = {
  /** Seconds allowed between collects before the combo drops. */
  window: 2.5,
  /** Highest multiplier the combo can reach. */
  maxMult: 5,
};

/** How many falling things and sparkle particles can exist at once. */
export const POOL_SIZE = 96;
export const PARTICLE_POOL = 160;
export const STAR_COUNT = 110;

export const PALETTE = {
  backdrop: '#070a18',
  skyTop: '#0a1030',
  skyBottom: '#1a1440',
  hill: '#0b0e22',
  auroraGreen: '#3df5a6',
  auroraTeal: '#37c8e8',
  auroraViolet: '#9a6bff',
  lantern: '#ffd76a',
  lanternCore: '#fff3c4',
  orb: '#ffd94d',
  orbCyan: '#7ce7ff',
  storm: '#4a4560',
  stormDark: '#2c2840',
  comet: '#ffb347',
  shield: '#6ec6ff',
  panel: '#141a30',
  text: '#f2f4ff',
  muted: '#a7aecf',
  danger: '#ff6b6b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'aurora-harvest.best';
