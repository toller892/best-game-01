// Everything the player sees: the starfield, the beacon, the ship and its
// carried sprites, the wisps, the particles, the HUD, and the title, win,
// game-over, pause and wave-clear screens. All drawing is in logical
// 1280x720 coordinates; main.js sets the canvas transform.

import { FIELD, FONT, PALETTE, SHIP, WAVES } from './config.js';
import { STATUS_OVER, STATUS_PAUSED, STATUS_PLAYING, STATUS_TITLE, STATUS_WAVECLEAR, STATUS_WIN } from './world.js';

function starPath(ctx, x, y, radius, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function heartPath(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.9);
  ctx.bezierCurveTo(x - size * 1.2, y + size * 0.1, x - size * 0.6, y - size * 0.9, x, y - size * 0.2);
  ctx.bezierCurveTo(x + size * 0.6, y - size * 0.9, x + size * 1.2, y + size * 0.1, x, y + size * 0.9);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, PALETTE.deep);
  grad.addColorStop(1, PALETTE.backdrop);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const star of world.stars) {
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(star.twinkle));
    ctx.globalAlpha = tw * (0.4 + star.layer * 0.2);
    ctx.fillStyle = PALETTE.star;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // A soft nebula wash, bottom-left and top-right.
  const nebula = (x, y, r, colour) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colour);
    g.addColorStop(1, 'rgba(10, 14, 36, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  nebula(180, 620, 420, 'rgba(83, 60, 180, 0.20)');
  nebula(1120, 120, 380, 'rgba(20, 90, 140, 0.16)');
}

function drawBeacon(ctx, world) {
  const b = world.beacon;
  const carrying = world.carried.length > 0;
  const pulse = 1 + 0.06 * Math.sin(world.elapsed * 3);
  const radius = b.radius * pulse;
  ctx.save();
  ctx.globalAlpha = carrying ? 0.95 : 0.6;
  const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius * 1.6);
  glow.addColorStop(0, 'rgba(183, 140, 255, 0.28)');
  glow.addColorStop(1, 'rgba(183, 140, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(b.x - radius * 1.6, b.y - radius * 1.6, radius * 3.2, radius * 3.2);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = PALETTE.beacon;
  ctx.lineWidth = 5;
  ctx.setLineDash([26, 16]);
  ctx.lineDashOffset = -b.spin * 40;
  ctx.beginPath();
  ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = PALETTE.beaconCore;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(b.x, b.y, radius * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = PALETTE.beaconCore;
  starPath(ctx, b.x, b.y, 12, 4);
  ctx.fill();
}

function drawSprite(ctx, sprite) {
  const tw = 0.8 + 0.25 * Math.sin(sprite.twinkle);
  ctx.save();
  ctx.translate(sprite.x, sprite.y);
  ctx.scale(tw, tw);
  ctx.shadowColor = PALETTE.sprite;
  ctx.shadowBlur = 12;
  ctx.fillStyle = PALETTE.sprite;
  starPath(ctx, 0, 0, sprite.radius, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.spriteCore;
  starPath(ctx, 0, 0, sprite.radius * 0.45, 5);
  ctx.fill();
  ctx.restore();
}

function drawWisp(ctx, wisp) {
  ctx.save();
  ctx.translate(wisp.x, wisp.y);
  const wobble = 1 + 0.08 * Math.sin(wisp.weave * 2);
  ctx.scale(wobble, 1 / wobble);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, wisp.radius * 1.5);
  g.addColorStop(0, 'rgba(255, 90, 110, 0.85)');
  g.addColorStop(0.6, 'rgba(255, 90, 110, 0.35)');
  g.addColorStop(1, 'rgba(255, 90, 110, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, wisp.radius * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.wisp;
  ctx.beginPath();
  ctx.arc(0, 0, wisp.radius * 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Two narrowed eyes: it reads as a hunter at a glance.
  ctx.fillStyle = '#2a0a12';
  ctx.beginPath();
  ctx.ellipse(-7, -3, 3.4, 5, 0.15, 0, Math.PI * 2);
  ctx.ellipse(7, -3, 3.4, 5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShip(ctx, world) {
  const ship = world.ship;
  if (ship.invuln > 0 && Math.floor(world.elapsed * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.facing);
  ctx.shadowColor = PALETTE.ship;
  ctx.shadowBlur = 16;
  ctx.fillStyle = PALETTE.ship;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-14, -13);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 13);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#dff7ff';
  ctx.beginPath();
  ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Engine glow behind the ship.
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.facing + Math.PI);
  const flicker = 0.6 + 0.4 * Math.sin(world.elapsed * 22);
  ctx.fillStyle = `rgba(155, 234, 255, ${0.5 * flicker})`;
  ctx.beginPath();
  ctx.moveTo(14, -5);
  ctx.lineTo(14 + 16 * flicker, 0);
  ctx.lineTo(14, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPulseRing(ctx, world) {
  if (!world.pulseRing) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, world.pulseRing.life / 0.45);
  ctx.strokeStyle = PALETTE.shipGlow;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(world.pulseRing.x, world.pulseRing.y, world.pulseRing.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHud(ctx, world) {
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 56);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, 56, FIELD.width, 2);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}`, 20, 30);
  ctx.font = `500 15px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`BEST ${world.best.toLocaleString('en-US')}`, 20, 48);

  // Wave and quota, centred.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(`WAVE ${world.wave} / ${WAVES}`, FIELD.width / 2, 24);
  ctx.font = `500 15px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`${world.delivered} / ${world.quota} stars home`, FIELD.width / 2, 46);

  // Right side: lives, timer, pulses.
  const right = FIELD.width - 20;
  ctx.textAlign = 'right';
  for (let i = 0; i < world.lives; i += 1) {
    ctx.fillStyle = PALETTE.wisp;
    heartPath(ctx, right - 180 + i * 26, 28, 11);
    ctx.fill();
  }
  const seconds = Math.max(0, Math.ceil(world.timeLeft));
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');
  ctx.fillStyle = world.timeLeft < 10 ? PALETTE.danger : PALETTE.text;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(`${mm}:${ss}`, right - 60, 30);
  // Timer bar.
  const barW = 110;
  const frac = Math.max(0, world.timeLeft / world.timeMax);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  roundRect(ctx, right - 60 - barW, 40, barW, 8, 4);
  ctx.fill();
  ctx.fillStyle = world.timeLeft < 10 ? PALETTE.danger : PALETTE.good;
  if (frac > 0) {
    roundRect(ctx, right - 60 - barW, 40, barW * frac, 8, 4);
    ctx.fill();
  }
  // Pulse charges.
  ctx.textAlign = 'left';
  ctx.font = `500 14px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('PULSE', right - 52, 14);
  for (let i = 0; i < world.pulses; i += 1) {
    ctx.fillStyle = PALETTE.ship;
    ctx.beginPath();
    ctx.arc(right - 46 + i * 16, 30, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Carried count.
  if (world.carried.length > 0) {
    const combo = 1 + 0.25 * (world.carried.length - 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.sprite;
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(`CARRYING ${world.carried.length}  ·  x${combo.toFixed(2)}`, FIELD.width / 2, 76);
  }
  ctx.restore();
}

function centrePanel(ctx, y, w, h) {
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, (FIELD.width - w) / 2, y, w, h, 18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTitle(ctx, world) {
  // A few decorative sprites drifting behind the title.
  for (let i = 0; i < 7; i += 1) {
    const x = 140 + i * 170 + Math.sin(world.elapsed * 0.4 + i * 2.1) * 26;
    const y = 150 + ((i * 97) % 420) + Math.cos(world.elapsed * 0.3 + i) * 18;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(world.elapsed * 0.5 + i) * 0.3);
    ctx.fillStyle = PALETTE.sprite;
    starPath(ctx, 0, 0, 13, 5);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 84px ${FONT}`;
  ctx.shadowColor = 'rgba(183, 140, 255, 0.8)';
  ctx.shadowBlur = 34;
  ctx.fillText('STAR SHEPHERD', FIELD.width / 2, 250);
  ctx.shadowBlur = 0;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('The stars have lost their way. Gather them home.', FIELD.width / 2, 305);
  ctx.restore();

  centrePanel(ctx, 340, 680, 180);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 21px ${FONT}`;
  ctx.fillText('Move with the mouse or WASD / arrow keys', FIELD.width / 2, 380);
  ctx.fillText('Touch a lost star to gather it · carry up to 8', FIELD.width / 2, 410);
  ctx.fillText('Fly them into the beacon ring to bring them home', FIELD.width / 2, 440);
  ctx.fillStyle = PALETTE.wisp;
  ctx.fillText('Void wisps scatter your carry and cost a life', FIELD.width / 2, 470);
  ctx.fillText('Space pulses the wisps away', FIELD.width / 2, 500);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  const blink = 0.75 + 0.25 * Math.sin(world.elapsed * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = PALETTE.good;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText('Click or press Enter to start', FIELD.width / 2, 580);
  ctx.restore();
  if (world.best > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 19px ${FONT}`;
    ctx.fillText(`Best score: ${world.best.toLocaleString('en-US')}`, FIELD.width / 2, 616);
    ctx.restore();
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText('P pauses · M mutes · 6 waves to win', FIELD.width / 2, 680);
  ctx.restore();
}

function drawBanner(ctx, world) {
  if (!world.banner) return;
  const alpha = Math.min(1, world.bannerT);
  ctx.save();
  ctx.globalAlpha = alpha;
  centrePanel(ctx, 250, 560, 130);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.good;
  ctx.font = `800 44px ${FONT}`;
  ctx.fillText(world.banner.title, FIELD.width / 2, 300);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText(world.banner.sub, FIELD.width / 2, 342);
  ctx.restore();
}

function drawEnd(ctx, world, won) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 36, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.restore();
  centrePanel(ctx, 170, 700, 330);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.good : PALETTE.danger;
  ctx.font = `800 52px ${FONT}`;
  ctx.fillText(won ? 'ALL STARS HOME!' : 'THE LIGHT WENT OUT', FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText(
    won
      ? `Every wave cleared — the sky is whole again.`
      : `The wisps scattered the last of the light on wave ${world.wave}.`,
    FIELD.width / 2,
    300,
  );
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(`SCORE  ${world.score.toLocaleString('en-US')}`, FIELD.width / 2, 360);
  ctx.font = `500 20px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(
    world.newBest ? `A new best score!` : `Best score: ${world.best.toLocaleString('en-US')}`,
    FIELD.width / 2,
    398,
  );
  const blink = 0.75 + 0.25 * Math.sin(world.elapsed * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = PALETTE.good;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText('Press Enter or click to play again', FIELD.width / 2, 452);
  ctx.restore();
}

function drawPaused(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 36, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 52px ${FONT}`;
  ctx.fillText('PAUSED', FIELD.width / 2, 340);
  ctx.font = `500 22px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Press P to keep playing', FIELD.width / 2, 388);
  ctx.restore();
}

/** Draw one frame of the game. */
export function draw(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world);
  if (world.status === STATUS_TITLE) {
    drawTitle(ctx, world);
    ctx.restore();
    return;
  }
  drawBeacon(ctx, world);
  for (const sprite of world.sprites) {
    if (sprite.active && !sprite.carried) drawSprite(ctx, sprite);
  }
  for (const wisp of world.wisps) drawWisp(ctx, wisp);
  for (const sprite of world.carried) drawSprite(ctx, sprite);
  drawShip(ctx, world);
  drawParticles(ctx, world);
  drawPulseRing(ctx, world);
  drawHud(ctx, world);
  if (world.status === STATUS_WAVECLEAR) drawBanner(ctx, world);
  if (world.status === STATUS_WIN) drawEnd(ctx, world, true);
  if (world.status === STATUS_OVER) drawEnd(ctx, world, false);
  if (world.status === STATUS_PAUSED) drawPaused(ctx, world);
  ctx.restore();
}
