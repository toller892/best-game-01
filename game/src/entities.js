// The things that live on the field: star sprites, void wisps, the beacon and
// the little particles a pickup, a delivery or a hit throws off. Each factory
// makes one entity; each update moves it; each draw paints it.

import { BEACON, FIELD, SPRITE, WISP } from './config.js';
import { angle, range } from './random.js';

/** A lost star sprite, drifting until the ship gathers it. */
export function makeSprite(rng) {
  const a = angle(rng);
  const speed = range(rng, SPRITE.driftMin, SPRITE.driftMax);
  return {
    kind: 'sprite',
    x: range(rng, 60, FIELD.width - 60),
    y: range(rng, 90, FIELD.height - 60),
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    radius: SPRITE.radius,
    /** 0..1 phase for the twinkle. */
    twinkle: rng(),
    /** The ship it follows once latched, or null while drifting. */
    carried: false,
    /** Position in the carry chain behind the ship. */
    slot: -1,
    active: true,
  };
}

/** A void wisp: red, drifting, and hungry for carried sprites. */
export function makeWisp(rng, wave) {
  const a = angle(rng);
  const speed = range(rng, WISP.driftMin, WISP.driftMax) * (1 + wave * 0.06);
  return {
    kind: 'wisp',
    x: range(rng, 80, FIELD.width - 80),
    y: range(rng, 100, FIELD.height - 80),
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    radius: WISP.radius,
    /** Wander phase: the wisp weaves as it drifts. */
    weave: rng() * Math.PI * 2,
    weaveSpeed: range(rng, 0.6, 1.4),
    active: true,
  };
}

/** The delivery ring: it jumps to a new spot at the start of each wave. */
export function makeBeacon(rng) {
  return {
    kind: 'beacon',
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    radius: BEACON.radius,
    /** Ring rotation, for the dashed-ring animation. */
    spin: 0,
  };
}

/** Move the beacon somewhere new, away from the ship and the field edges. */
export function moveBeacon(beacon, rng, ship) {
  for (let tries = 0; tries < 12; tries += 1) {
    const x = range(rng, BEACON.margin, FIELD.width - BEACON.margin);
    const y = range(rng, BEACON.margin, FIELD.height - BEACON.margin);
    const dx = x - ship.x;
    const dy = y - ship.y;
    if (dx * dx + dy * dy > 320 * 320) {
      beacon.x = x;
      beacon.y = y;
      return;
    }
  }
  beacon.x = FIELD.width - ship.x;
  beacon.y = FIELD.height - ship.y;
}

/** A short-lived sparkle. */
export function makeParticle(x, y, colour, speed, life) {
  const a = Math.random() * Math.PI * 2;
  return {
    x,
    y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    colour,
    life,
    maxLife: life,
  };
}

/** Drift a free sprite; it bounces softly off the field edges. */
export function updateSprite(sprite, dt) {
  sprite.twinkle += dt * 2;
  sprite.x += sprite.vx * dt;
  sprite.y += sprite.vy * dt;
  if (sprite.x < 30 || sprite.x > FIELD.width - 30) sprite.vx *= -1;
  if (sprite.y < 70 || sprite.y > FIELD.height - 30) sprite.vy *= -1;
  sprite.x = Math.max(30, Math.min(FIELD.width - 30, sprite.x));
  sprite.y = Math.max(70, Math.min(FIELD.height - 30, sprite.y));
}

/** Drift a wisp with a slow weave; it bounces off the edges too. */
export function updateWisp(wisp, dt) {
  wisp.weave += wisp.weaveSpeed * dt;
  const speed = Math.hypot(wisp.vx, wisp.vy);
  const base = Math.atan2(wisp.vy, wisp.vx);
  const wobble = Math.sin(wisp.weave) * 0.5;
  wisp.x += Math.cos(base + wobble) * speed * dt;
  wisp.y += Math.sin(base + wobble) * speed * dt;
  if (wisp.x < 40 || wisp.x > FIELD.width - 40) wisp.vx *= -1;
  if (wisp.y < 80 || wisp.y > FIELD.height - 40) wisp.vy *= -1;
  wisp.x = Math.max(40, Math.min(FIELD.width - 40, wisp.x));
  wisp.y = Math.max(80, Math.min(FIELD.height - 40, wisp.y));
}

/** Fade and drift a particle; returns false once it is spent. */
export function updateParticle(particle, dt) {
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  particle.vx *= 1 - 2.4 * dt;
  particle.vy *= 1 - 2.4 * dt;
  particle.life -= dt;
  return particle.life > 0;
}
