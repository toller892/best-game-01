// Star Shepherd's world: the ship, the sprites, the wisps, the beacon, the
// waves, the timer, the lives and the score. The renderer only draws this
// state; every rule lives here.

import {
  BEACON,
  FIELD,
  LIVES,
  PULSE_CHARGES,
  SHIP,
  SPRITE,
  SPRITE_SPARES,
  STEP,
  WAVE_BONUS,
  WAVE_TABLE,
  WAVES,
  WISP,
  BEST_KEY,
} from './config.js';
import { makeRng, range } from './random.js';
import { makeBeacon, makeParticle, makeSprite, makeWisp, moveBeacon, updateParticle, updateSprite, updateWisp } from './entities.js';
import { sfxDeliver, sfxHit, sfxPickup, sfxPulse, sfxWaveClear, sfxWin, sfxLose } from './audio.js';

export const STATUS_TITLE = 'title';
export const STATUS_PLAYING = 'playing';
export const STATUS_WAVECLEAR = 'waveclear';
export const STATUS_WIN = 'win';
export const STATUS_OVER = 'over';
export const STATUS_PAUSED = 'paused';

/** A fresh world for one seed; call startGame() to play. */
export function createWorld(seed) {
  const world = {
    seed,
    rng: makeRng(seed),
    status: STATUS_TITLE,
    ship: { x: FIELD.width / 2, y: FIELD.height / 2 + 80, vx: 0, vy: 0, facing: -Math.PI / 2, invuln: 0 },
    sprites: [],
    wisps: [],
    beacon: makeBeacon(makeRng(seed + 7)),
    particles: [],
    stars: [],
    wave: 1,
    delivered: 0,
    quota: WAVE_TABLE[0].quota,
    timeLeft: WAVE_TABLE[0].time,
    timeMax: WAVE_TABLE[0].time,
    score: 0,
    lives: LIVES,
    pulses: PULSE_CHARGES,
    /** Sprites riding behind the ship, in chain order. */
    carried: [],
    shake: 0,
    pulseRing: null,
    banner: null,
    bannerT: 0,
    bannerAfter: null,
    newBest: false,
    elapsed: 0,
    best: 0,
  };

  try {
    world.best = Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch (e) {
    world.best = 0;
  }

  // A fixed starfield for this seed: three depths of twinkling stars.
  const starRng = makeRng(seed * 31 + 5);
  for (let i = 0; i < 110; i += 1) {
    world.stars.push({
      x: starRng() * FIELD.width,
      y: starRng() * FIELD.height,
      layer: 1 + Math.floor(starRng() * 3),
      size: 0.6 + starRng() * 1.6,
      twinkle: starRng() * Math.PI * 2,
    });
  }

  world.reset = () => {
    world.rng = makeRng(world.seed);
    world.status = STATUS_TITLE;
    world.ship.x = FIELD.width / 2;
    world.ship.y = FIELD.height / 2 + 80;
    world.ship.vx = 0;
    world.ship.vy = 0;
    world.ship.facing = -Math.PI / 2;
    world.ship.invuln = 0;
    world.sprites = [];
    world.wisps = [];
    world.particles = [];
    world.carried = [];
    world.wave = 1;
    world.delivered = 0;
    world.quota = WAVE_TABLE[0].quota;
    world.timeLeft = WAVE_TABLE[0].time;
    world.timeMax = WAVE_TABLE[0].time;
    world.score = 0;
    world.lives = LIVES;
    world.pulses = PULSE_CHARGES;
    world.shake = 0;
    world.pulseRing = null;
    world.banner = null;
    world.bannerT = 0;
    world.bannerAfter = null;
    world.newBest = false;
    world.elapsed = 0;
  };

  world.saveBest = () => {
    if (world.score <= world.best) return;
    world.best = world.score;
    world.newBest = true;
    try {
      window.localStorage.setItem(BEST_KEY, String(world.best));
    } catch (e) {
      /* best score is a nicety, not a rule */
    }
  };

  /** Lay out one wave: fresh wisps, a moved beacon, a full field of sprites. */
  world.startWave = (wave) => {
    const spec = WAVE_TABLE[wave - 1];
    world.wave = wave;
    world.delivered = 0;
    world.quota = spec.quota;
    world.timeLeft = spec.time;
    world.timeMax = spec.time;
    world.pulses = PULSE_CHARGES;
    world.carried = [];
    world.sprites = [];
    world.wisps = [];
    for (let i = 0; i < spec.quota + SPRITE_SPARES; i += 1) {
      world.sprites.push(makeSprite(world.rng));
    }
    for (let i = 0; i < spec.wisps; i += 1) {
      world.wisps.push(makeWisp(world.rng, wave));
    }
    moveBeacon(world.beacon, world.rng, world.ship);
  };

  world.startGame = () => {
    world.reset();
    world.status = STATUS_PLAYING;
    world.startWave(1);
  };

  world.togglePause = () => {
    if (world.status === STATUS_PLAYING) world.status = STATUS_PAUSED;
    else if (world.status === STATUS_PAUSED) world.status = STATUS_PLAYING;
  };

  /** Throw the carried sprites back onto the field, scattering. */
  world.scatterCarried = () => {
    for (const sprite of world.carried) {
      sprite.carried = false;
      sprite.slot = -1;
      const a = Math.random() * Math.PI * 2;
      sprite.vx = Math.cos(a) * 260;
      sprite.vy = Math.sin(a) * 260;
    }
    world.carried = [];
  };

  world.burst = (x, y, colour, count, speed, life) => {
    for (let i = 0; i < count; i += 1) {
      world.particles.push(makeParticle(x, y, colour, range(world.rng, speed * 0.4, speed), range(world.rng, life * 0.5, life)));
    }
  };

  /** Deliver everything the ship carries to the beacon. */
  world.deliver = () => {
    const count = world.carried.length;
    if (count === 0) return;
    const combo = 1 + SPRITE.comboStep * (count - 1);
    const gained = Math.round(count * SPRITE.points * combo);
    world.score += gained;
    world.delivered += count;
    world.timeLeft = Math.min(world.timeMax, world.timeLeft + count * SPRITE.timeBonus);
    world.burst(world.beacon.x, world.beacon.y, '#b78cff', 10 + count * 3, 240, 0.7);
    world.burst(world.ship.x, world.ship.y, '#ffd75e', 6, 160, 0.5);
    sfxDeliver(count);
    world.carried = [];
    if (world.delivered >= world.quota) world.clearWave();
  };

  /** The wave's quota is met: bonus, banner, then the next wave or the win. */
  world.clearWave = () => {
    const bonus = WAVE_BONUS.perWave * world.wave + Math.round(WAVE_BONUS.perSecond * world.timeLeft);
    world.score += bonus;
    sfxWaveClear();
    if (world.wave >= WAVES) {
      world.status = STATUS_WIN;
      world.saveBest();
      sfxWin();
      return;
    }
    world.status = STATUS_WAVECLEAR;
    world.banner = { title: `Wave ${world.wave} clear!`, sub: `Wave bonus +${bonus}` };
    world.bannerT = 2.2;
  };

  /** A wisp caught the ship: lose a life and scatter the carry. */
  world.hitWisp = () => {
    world.lives -= 1;
    world.ship.invuln = SHIP.invulnerable;
    world.shake = 14;
    world.scatterCarried();
    world.burst(world.ship.x, world.ship.y, '#ff5a6e', 16, 300, 0.8);
    sfxHit();
    if (world.lives <= 0) {
      world.status = STATUS_OVER;
      world.saveBest();
      sfxLose();
    }
  };

  /** The clock ran out: lose a life and run this wave again. */
  world.timeOut = () => {
    world.lives -= 1;
    sfxHit();
    if (world.lives <= 0) {
      world.status = STATUS_OVER;
      world.saveBest();
      sfxLose();
      return;
    }
    world.banner = { title: 'Time up!', sub: 'The wave starts over — one life lost' };
    world.bannerT = 1.6;
    world.status = STATUS_WAVECLEAR;
    world.bannerAfter = 'retry';
  };

  /** Advance from a wave-clear banner: next wave, or a retry after a time-out. */
  world.advanceWave = () => {
    world.banner = null;
    if (world.bannerAfter === 'retry') {
      world.bannerAfter = null;
      world.startWave(world.wave);
      world.status = STATUS_PLAYING;
      return;
    }
    world.startWave(world.wave + 1);
    world.status = STATUS_PLAYING;
  };

  /** One fixed step of play. `input` is the frame's input state. */
  world.step = (input) => {
    const dt = STEP;
    world.elapsed += dt;
    if (world.status === STATUS_WAVECLEAR) {
      world.bannerT -= dt;
      world.updateAmbient(dt);
      if (world.bannerT <= 0) world.advanceWave();
      return;
    }
    if (world.status !== STATUS_PLAYING) {
      world.updateAmbient(dt);
      return;
    }

    const ship = world.ship;
    if (ship.invuln > 0) ship.invuln -= dt;
    if (world.shake > 0) world.shake = Math.max(0, world.shake - 40 * dt);

    // --- steering: keys win over the pointer ---
    const slow = 1 - Math.min(SHIP.maxSlow, world.carried.length * SHIP.slowPerSprite);
    const speed = SHIP.speed * slow;
    if (input.move.x !== 0 || input.move.y !== 0) {
      const len = Math.hypot(input.move.x, input.move.y) || 1;
      ship.vx = (input.move.x / len) * speed;
      ship.vy = (input.move.y / len) * speed;
    } else if (input.pointer) {
      const dx = input.pointer.x - ship.x;
      const dy = input.pointer.y - ship.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        const want = Math.min(speed, dist * 7);
        ship.vx = (dx / dist) * want;
        ship.vy = (dy / dist) * want;
      } else {
        ship.vx *= 1 - 8 * dt;
        ship.vy *= 1 - 8 * dt;
      }
    } else {
      ship.vx *= 1 - 6 * dt;
      ship.vy *= 1 - 6 * dt;
    }
    if (Math.hypot(ship.vx, ship.vy) > 20) ship.facing = Math.atan2(ship.vy, ship.vx);
    ship.x = Math.max(24, Math.min(FIELD.width - 24, ship.x + ship.vx * dt));
    ship.y = Math.max(68, Math.min(FIELD.height - 24, ship.y + ship.vy * dt));

    // --- pulse: shove the wisps away (consume the press here, so one press
    // fires once even when several fixed steps run in one frame) ---
    if (input.pressed.pulse && world.pulses > 0) {
      input.pressed.pulse = false;
      world.pulses -= 1;
      world.pulseRing = { x: ship.x, y: ship.y, r: 30, life: 0.45 };
      for (const wisp of world.wisps) {
        const dx = wisp.x - ship.x;
        const dy = wisp.y - ship.y;
        const dist = Math.hypot(dx, dy);
        if (dist < WISP.pulseRadius && dist > 1) {
          wisp.vx += (dx / dist) * WISP.pulsePush;
          wisp.vy += (dy / dist) * WISP.pulsePush;
        }
      }
      sfxPulse();
    }

    // --- sprites: drift, latch on, trail behind the ship ---
    for (const sprite of world.sprites) {
      if (!sprite.active) continue;
      if (sprite.carried) continue;
      updateSprite(sprite, dt);
      const dx = ship.x - sprite.x;
      const dy = ship.y - sprite.y;
      if (dx * dx + dy * dy < SHIP.pickupRadius * SHIP.pickupRadius && world.carried.length < SHIP.carryMax) {
        sprite.carried = true;
        sprite.slot = world.carried.length;
        world.carried.push(sprite);
        world.burst(sprite.x, sprite.y, '#ffd75e', 5, 120, 0.4);
        sfxPickup(world.carried.length);
      }
    }
    // The carried chain trails the ship like a comet tail.
    let anchorX = ship.x;
    let anchorY = ship.y;
    let anchorAngle = ship.facing + Math.PI;
    for (let i = 0; i < world.carried.length; i += 1) {
      const sprite = world.carried[i];
      const tx = anchorX + Math.cos(anchorAngle) * 30;
      const ty = anchorY + Math.sin(anchorAngle) * 30;
      sprite.x += (tx - sprite.x) * Math.min(1, 12 * dt);
      sprite.y += (ty - sprite.y) * Math.min(1, 12 * dt);
      sprite.twinkle += dt * 2;
      anchorX = sprite.x;
      anchorY = sprite.y;
    }

    // --- wisps ---
    for (const wisp of world.wisps) {
      updateWisp(wisp, dt);
      const dx = ship.x - wisp.x;
      const dy = ship.y - wisp.y;
      const hit = SHIP.radius + wisp.radius - 6;
      if (ship.invuln <= 0 && dx * dx + dy * dy < hit * hit) {
        world.hitWisp();
        if (world.status !== STATUS_PLAYING) return;
      }
    }

    // --- delivery ---
    const bdx = ship.x - world.beacon.x;
    const bdy = ship.y - world.beacon.y;
    if (bdx * bdx + bdy * bdy < world.beacon.radius * world.beacon.radius) {
      world.deliver();
      if (world.status !== STATUS_PLAYING) return;
    }

    // --- keep the field stocked ---
    let drifting = 0;
    for (const sprite of world.sprites) if (sprite.active && !sprite.carried) drifting += 1;
    if (drifting < 4 && world.delivered + world.carried.length < world.quota + SPRITE_SPARES) {
      for (let i = 0; i < 2; i += 1) world.sprites.push(makeSprite(world.rng));
    }

    // --- the clock ---
    world.timeLeft -= dt;
    if (world.timeLeft <= 0) {
      world.timeLeft = 0;
      world.timeOut();
      return;
    }

    world.updateAmbient(dt);
  };

  /** Background motion that runs on every screen: stars, beacon spin, particles. */
  world.updateAmbient = (dt) => {
    world.beacon.spin += dt * 0.6;
    for (const star of world.stars) star.twinkle += dt * (0.5 + star.layer * 0.4);
    for (let i = world.particles.length - 1; i >= 0; i -= 1) {
      if (!updateParticle(world.particles[i], dt)) world.particles.splice(i, 1);
    }
    if (world.pulseRing) {
      world.pulseRing.r += 900 * dt;
      world.pulseRing.life -= dt;
      if (world.pulseRing.life <= 0) world.pulseRing = null;
    }
  };

  return world;
}
