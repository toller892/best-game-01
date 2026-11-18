// Star Shepherd: every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How many waves make a full game; clearing the last one wins. */
export const WAVES = 6;

export const SHIP = {
  radius: 16,
  speed: 540,
  /** Each carried sprite slows the ship by this much, up to maxSlow. */
  slowPerSprite: 0.04,
  maxSlow: 0.32,
  /** How close a drifting sprite must be to latch on. */
  pickupRadius: 120,
  /** How many sprites the ship can carry at once. */
  carryMax: 8,
  /** Seconds of mercy after a wisp hit. */
  invulnerable: 2,
};

export const SPRITE = {
  radius: 11,
  driftMin: 18,
  driftMax: 48,
  /** Points for one delivered sprite, before the combo multiplier. */
  points: 10,
  /** Combo grows by this per extra sprite carried at delivery. */
  comboStep: 0.25,
  /** Seconds added to the wave timer per delivered sprite. */
  timeBonus: 1,
};

export const BEACON = {
  radius: 62,
  /** How far from the edges the beacon's centre may sit. */
  margin: 130,
};

export const WISP = {
  radius: 22,
  driftMin: 42,
  driftMax: 92,
  /** How far a pulse shoves a wisp away. */
  pulseRadius: 290,
  pulsePush: 460,
};

/** Pulses per wave; they refill when a wave starts. */
export const PULSE_CHARGES = 2;

export const LIVES = 3;

/** Wave table: quota to deliver, seconds on the clock, wisps on the field. */
export const WAVE_TABLE = [
  { quota: 8, time: 50, wisps: 3 },
  { quota: 10, time: 55, wisps: 4 },
  { quota: 12, time: 60, wisps: 5 },
  { quota: 14, time: 65, wisps: 6 },
  { quota: 16, time: 70, wisps: 7 },
  { quota: 18, time: 75, wisps: 8 },
];

/** Sprites kept drifting on the field: the wave quota plus this many spares. */
export const SPRITE_SPARES = 6;

/** Points for clearing a wave: this times the wave number, plus this per second left. */
export const WAVE_BONUS = { perWave: 100, perSecond: 5 };

export const PALETTE = {
  backdrop: '#0a0e24',
  deep: '#0d1230',
  star: '#e8ecff',
  sprite: '#ffd75e',
  spriteCore: '#fff3b0',
  ship: '#59d8ff',
  shipGlow: '#9beaff',
  beacon: '#b78cff',
  beaconCore: '#e6d6ff',
  wisp: '#ff5a6e',
  wispCore: '#ff8fa0',
  panel: 'rgba(13, 18, 48, 0.82)',
  panelEdge: 'rgba(155, 175, 255, 0.35)',
  text: '#eef1ff',
  muted: '#9aa3c7',
  good: '#7dffa8',
  danger: '#ff5a6e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'star-shepherd.best';
