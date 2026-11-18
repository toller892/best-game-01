// Star Shepherd's boot and loop: a fixed-step simulation, a canvas scaled to
// the window, screen routing (title, play, win, over, pause), and the
// ?shot= scenes the screenshots are taken from.

import { FIELD, STEP } from './config.js';
import { createInput } from './input.js';
import { createWorld, STATUS_OVER, STATUS_PAUSED, STATUS_PLAYING, STATUS_TITLE, STATUS_WIN, STATUS_WAVECLEAR } from './world.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';
import { isMuted, toggleMute, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shotName = params.get('shot');
const world = createWorld(seed);
const input = createInput(canvas);

function describeStatus() {
  if (!statusLine) return;
  const lines = {
    [STATUS_TITLE]: 'Star Shepherd. Title screen. Press Enter to start.',
    [STATUS_PLAYING]: `Wave ${world.wave} of 6. Score ${world.score}. ${world.lives} lives left. ${world.delivered} of ${world.quota} stars home.`,
    [STATUS_WIN]: `You win! Final score ${world.score}. Press Enter to play again.`,
    [STATUS_OVER]: `Game over. Final score ${world.score}. Press Enter to play again.`,
    [STATUS_PAUSED]: 'Paused.',
  };
  statusLine.textContent = lines[world.status] || '';
}

/** Fit the 1280x720 field into the window, letterboxed. */
function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
  const ox = (canvas.width - FIELD.width * scale) / 2;
  const oy = (canvas.height - FIELD.height * scale) / 2;
  return { scale, ox, oy, dpr };
}

function renderFrame() {
  const { scale, ox, oy } = fitCanvas();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  draw(ctx, world);
}

if (shotName) {
  // A staged screenshot scene: play the real rules forward, then hold the frame.
  const staged = stageShot(shotName, world);
  world.status = staged.screen === STATUS_TITLE ? STATUS_TITLE : world.status;
  renderFrame();
  describeStatus();
  window.__ready = true;
  window.__game = { world, shot: shotName };
} else {
  window.addEventListener('resize', renderFrame);
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  let last = performance.now();
  let accumulator = 0;
  let lastStatus = world.status;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed;

    if (input.pressed.mute) {
      toggleMute();
    }
    if (input.pressed.pause) {
      world.togglePause();
    }
    if (input.pressed.confirm) {
      unlockAudio();
      if (world.status === STATUS_TITLE || world.status === STATUS_WIN || world.status === STATUS_OVER) {
        world.startGame();
      }
    }

    while (accumulator >= STEP) {
      world.step(input);
      accumulator -= STEP;
    }
    input.consume();

    if (world.status !== lastStatus) {
      lastStatus = world.status;
      describeStatus();
    }
    renderFrame();
    requestAnimationFrame(frame);
  }

  describeStatus();
  renderFrame();
  requestAnimationFrame(frame);
  window.__game = { world, input };
}

export { world };
