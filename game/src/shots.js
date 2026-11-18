// The screenshot scenes behind ?shot=title|play|win|over. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by an autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame.

import { STEP } from './config.js';
import { STATUS_OVER, STATUS_PLAYING, STATUS_TITLE, STATUS_WAVECLEAR, STATUS_WIN } from './world.js';

const TITLE_SECONDS = 6;
const PLAY_SECONDS = 26;
const LIMIT_SECONDS = 600;
const SAMPLE = STEP;

/** A synthetic input shaped like the real one, steered by a potential field. */
function pilotInput(world, skill) {
  const input = {
    move: { x: 0, y: 0 },
    pointer: null,
    pressed: { confirm: false, pulse: false, pause: false, mute: false },
  };
  const ship = world.ship;
  if (skill === 'reckless') {
    // A hurried player: gather and bank, but never dodge a wisp or pulse.
    // It scores a little before the wisps catch it.
    let tx;
    let ty;
    if (world.carried.length >= 5) {
      tx = world.beacon.x;
      ty = world.beacon.y;
    } else {
      let target = null;
      let best = Infinity;
      for (const sprite of world.sprites) {
        if (!sprite.active || sprite.carried) continue;
        const dx = sprite.x - ship.x;
        const dy = sprite.y - ship.y;
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          target = sprite;
        }
      }
      tx = target ? target.x : world.beacon.x;
      ty = target ? target.y : world.beacon.y;
    }
    const len = Math.hypot(tx - ship.x, ty - ship.y) || 1;
    input.move.x = (tx - ship.x) / len;
    input.move.y = (ty - ship.y) / len;
    return input;
  }

  // A careful pilot: gather sprites, bank them at the beacon, flee wisps.
  let tx;
  let ty;
  const carrying = world.carried.length;
  const beaconNear = Math.hypot(world.beacon.x - ship.x, world.beacon.y - ship.y) < 260;
  if ((carrying >= 7 || (carrying >= 3 && beaconNear) || (carrying > 0 && world.timeLeft < 12))) {
    tx = world.beacon.x;
    ty = world.beacon.y;
  } else {
    let target = null;
    let best = Infinity;
    for (const sprite of world.sprites) {
      if (!sprite.active || sprite.carried) continue;
      const dx = sprite.x - ship.x;
      const dy = sprite.y - ship.y;
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        target = sprite;
      }
    }
    if (!target) {
      tx = world.beacon.x;
      ty = world.beacon.y;
    } else {
      tx = target.x;
      ty = target.y;
    }
  }
  let dx = tx - ship.x;
  let dy = ty - ship.y;
  const dist = Math.hypot(dx, dy) || 1;
  dx /= dist;
  dy /= dist;
  // Flee any wisp close by, harder the nearer it is.
  for (const wisp of world.wisps) {
    const wx = ship.x - wisp.x;
    const wy = ship.y - wisp.y;
    const wd = Math.hypot(wx, wy);
    if (wd < 230 && wd > 1) {
      const push = (1 - wd / 230) * 2.4;
      dx += (wx / wd) * push;
      dy += (wy / wd) * push;
    }
    if (wd < 120 && world.pulses > 0) input.pressed.pulse = true;
  }
  const len = Math.hypot(dx, dy) || 1;
  input.move.x = dx / len;
  input.move.y = dy / len;
  return input;
}

/** Run the world forward for `seconds` with the named pilot, or until it ends. */
function runForward(world, seconds, skill) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    if (world.status !== STATUS_PLAYING && world.status !== STATUS_WAVECLEAR) break;
    world.step(pilotInput(world, skill));
  }
}

/**
 * Set `world` to the named scene (title, play, win or over; any other name is
 * title) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'over') {
    for (let i = 0; i < TITLE_SECONDS / SAMPLE; i += 1) world.updateAmbient(SAMPLE);
    return { screen: STATUS_TITLE };
  }
  world.startGame();
  if (name === 'play') {
    runForward(world, PLAY_SECONDS, 'good');
    return { screen: world.status === STATUS_OVER ? STATUS_OVER : STATUS_PLAYING };
  }
  if (name === 'win') {
    runForward(world, LIMIT_SECONDS, 'good');
    return { screen: world.status === STATUS_WIN ? STATUS_WIN : STATUS_PLAYING };
  }
  runForward(world, LIMIT_SECONDS, 'reckless');
  return { screen: world.status === STATUS_OVER ? STATUS_OVER : STATUS_PLAYING };
}
