// Pointer and keyboard input, in logical-field coordinates.
// The ship follows the pointer; WASD and the arrow keys steer it too.
// Space (or a click) fires a pulse. Enter starts / restarts. P pauses, M mutes.

import { FIELD } from './config.js';

export function createInput(canvas) {
  const input = {
    /** Pointer position in logical coordinates, or null until the pointer moves. */
    pointer: null,
    pointerDown: false,
    /** Held movement keys, as {x, y} in [-1, 1]. */
    move: { x: 0, y: 0 },
    /** Edge-triggered actions, consumed once by the game loop. */
    pressed: { confirm: false, pulse: false, pause: false, mute: false },
  };

  const keys = new Set();

  function recomputeMove() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    input.move.x = x;
    input.move.y = y;
  }

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    input.pointer = toLogical(event);
  });
  canvas.addEventListener('pointerdown', (event) => {
    input.pointer = toLogical(event);
    input.pointerDown = true;
    input.pressed.pulse = true;
    input.pressed.confirm = true;
  });
  window.addEventListener('pointerup', () => {
    input.pointerDown = false;
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') input.pressed.confirm = true;
    if (event.code === 'Space') input.pressed.pulse = true;
    if (event.code === 'KeyP' || event.code === 'Escape') input.pressed.pause = true;
    if (event.code === 'KeyM') input.pressed.mute = true;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    recomputeMove();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    recomputeMove();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    recomputeMove();
  });

  /** Clear the edge-triggered actions after the loop has read them. */
  input.consume = () => {
    input.pressed.confirm = false;
    input.pressed.pulse = false;
    input.pressed.pause = false;
    input.pressed.mute = false;
  };

  return input;
}
