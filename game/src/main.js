// Batik Sky Courier — game loop, screens, wiring.
// Reads ?shot= & seed= from the URL: a shot stages a real simulated world
// instead of waiting for input.
import { VIEW_W, VIEW_H } from './config.js';
import { freshWorld, startLeg, stepWorld, nextLeg, restartCampaign, SCREEN } from './world.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { drawScreen } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const audio = new AudioEngine();

const params = new URLSearchParams(window.location.search);
const seedParam = parseInt(params.get('seed') || '20261126', 10);
const seed = Number.isFinite(seedParam) ? seedParam : 20261126;
const shotName = params.get('shot');

let world;
let shotMode = false;
if (shotName) {
  world = stageShot(shotName, seed);
  shotMode = true;
} else {
  world = freshWorld(seed);
}

let last = performance.now();
let t = 0;
let propT = 0;
let clickStarted = false;

function resize() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = Math.floor(VIEW_W * scale) + 'px';
  canvas.style.height = Math.floor(VIEW_H * scale) + 'px';
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('click', () => {
  audio.resume();
  if (shotMode) return;
  if (world.screen === SCREEN.TITLE && !clickStarted) {
    clickStarted = true;
    world.screen = SCREEN.PLAYING;
    audio.fanfare();
  }
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' && !shotMode) {
    audio.resume();
    if (world.screen === SCREEN.TITLE) { world.screen = SCREEN.PLAYING; audio.fanfare(); }
    else if (world.screen === SCREEN.LEG_COMPLETE) { nextLeg(world); audio.fanfare(); }
    else if (world.screen === SCREEN.CAMPAIGN_COMPLETE) { restartCampaign(world); }
    else if (world.screen === SCREEN.PAUSED) { world.screen = SCREEN.PLAYING; }
  }
});

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  t += dt;
  propT += dt;

  if (!shotMode) {
    // Global keys.
    if (input.wasPressed('KeyM')) {
      world.muted = !world.muted;
      audio.setMuted(world.muted);
    }
    if (input.wasPressed('KeyP')) {
      if (world.screen === SCREEN.PLAYING) world.screen = SCREEN.PAUSED;
      else if (world.screen === SCREEN.PAUSED) world.screen = SCREEN.PLAYING;
    }
    if (input.wasPressed('KeyR')) {
      if (world.screen === SCREEN.CRASHED) {
        startLeg(world, world.legIndex);
        world.screen = SCREEN.PLAYING;
      } else if (world.screen === SCREEN.PLAYING || world.screen === SCREEN.PAUSED) {
        startLeg(world, world.legIndex);
        world.screen = SCREEN.PLAYING;
      }
    }

    if (world.screen === SCREEN.PLAYING) {
      audio.resume();
      const axes = input.axes();
      const ev = stepWorld(world, axes, dt);
      audio.setEngine(world.throttle, world.speed);
      audio.setRain(world.leg.weather === 'storm' ? 1 : 0);
      if (ev.ring) audio.ringChime();
      if (ev.landed) { audio.thud(); audio.fanfare(); }
      if (ev.crashed) audio.crashSound();
    } else {
      audio.setEngine(0.2, 0);
      audio.setRain(0);
    }
    input.consume();
  } else {
    // Shot mode: frozen staged frame, gentle time for prop/cloud animation.
    // Keep rain drops moving a touch so the storm shot has streaks.
    if (world.leg.weather === 'storm') {
      for (const d of world.rainDrops) { d.y += 2; if (d.y > VIEW_H) d.y = -10; }
    }
  }

  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawScreen(ctx, world, t, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
