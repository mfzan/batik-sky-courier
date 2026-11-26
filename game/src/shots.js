// ?shot= staging: simulate the real rules forward from a fresh seeded world
// with a simple autopilot, for a fixed number of steps. No fake poses —
// every staged frame is a real world state produced by stepWorld.
import { freshWorld, startLeg, stepWorld, groundHeight, SCREEN } from './world.js';
import { LEGS } from './config.js';

// Autopilot: steer toward the next ring (or runway centre), manage throttle,
// auto-level. Returns axes in the same shape as Input.axes().
// Steering is a heading loop: heading rises when roll is negative
// (see stepWorld: heading += -roll * turnRate), so roll must oppose the
// heading error, not follow the lateral error directly.
export function autopilotAxes(w) {
  const target = w.rings[w.nextRing] || null;
  const tx = target ? target.x : 0;
  let talt = target ? target.alt : 120;
  const tz = target ? target.z : w.runwayZ;
  // Altitude floor: stay well clear of terrain/volcano ahead.
  const ghAhead = Math.max(groundHeight(w, w.x, w.z + 200), groundHeight(w, tx, tz));
  talt = Math.max(talt, ghAhead + 45);
  // Desired heading points at the target; roll closes the heading error.
  const dx = tx - w.x;
  const dz = Math.max(120, tz - w.z);
  const targetHeading = Math.max(-0.45, Math.min(0.45, Math.atan2(dx, dz)));
  const roll = Math.max(-1, Math.min(1, (w.heading - targetHeading) * 2.2));
  // Altitude error: pitch toward target altitude.
  const da = talt - w.alt;
  const pitch = Math.max(-1, Math.min(1, da / 45));
  // Throttle: fast en route, slow near the runway.
  const distToRunway = w.runwayZ - w.z;
  let throttle = 0;
  if (!target && distToRunway < 500) throttle = -1; // slow down for landing
  else if (w.speed < 52) throttle = 1;
  else if (w.speed > 66) throttle = -1;
  const flaps = !target && distToRunway < 420;
  return { pitch, roll, throttle, flaps, mouseRoll: 0, mousePitch: 0 };
}

function runSteps(w, steps, dt) {
  for (let i = 0; i < steps; i++) {
    if (w.screen !== SCREEN.PLAYING) break;
    stepWorld(w, autopilotAxes(w), dt);
  }
  return w;
}

// Stage one named shot. Returns the world to draw.
export function stageShot(name, seed) {
  const dt = 1 / 60;
  if (name === 'start') {
    const w = freshWorld(seed);
    w.screen = SCREEN.TITLE;
    // Title sits over a mid-flight archipelago: advance leg 1 a little.
    w.screen = SCREEN.PLAYING;
    runSteps(w, 60 * 14, dt);
    w.screen = SCREEN.TITLE;
    return w;
  }
  if (name === 'play') {
    // Leg 3 (Yogyakarta → Bromo): mid-flight through a ring, volcano + runway ahead.
    const w = freshWorld(seed);
    startLeg(w, 2);
    w.screen = SCREEN.PLAYING;
    // Fly ~26 s: z ≈ 3900, ring 5 close ahead, volcano large, runway visible.
    // (Longer runs overshoot the volcano — it ends up behind the camera.)
    runSteps(w, 60 * 26, dt);
    if (w.screen === SCREEN.CRASHED) {
      // Safe re-stage: level flight just before ring 5, volcano + runway ahead.
      startLeg(w, 2);
      w.screen = SCREEN.PLAYING;
      w.z = 3600;
      w.alt = 225;
      w.x = 0;
      w.heading = 0;
      w.roll = 0;
      w.speed = 55;
      w.throttle = 0.6;
      runSteps(w, 60 * 3, dt);
    }
    return w;
  }
  if (name === 'approach') {
    // Final leg, low over the sea toward the runway.
    const w = freshWorld(seed);
    startLeg(w, 4);
    w.screen = SCREEN.PLAYING;
    // Deterministic low approach: place the plane ~1600 m out, low over the
    // sea, so the runway strip reads clearly ahead of (above) the aircraft
    // instead of hiding underneath it. A few real steps settle the state.
    w.z = w.runwayZ - 1600;
    w.alt = 125;
    w.x = -15;
    w.heading = 0;
    w.roll = 0;
    w.speed = 48;
    w.throttle = 0.42;
    w.flaps = true;
    // All rings flown: mark every ring passed so none looms in front of
    // the plane, and the banner reads "all rings done — land!".
    for (const r of w.rings) r.passed = true;
    w.nextRing = w.rings.length;
    runSteps(w, 60 * 2, dt);
    // Hold the slow approach pose for the frozen frame.
    w.speed = 46;
    w.throttle = 0.45;
    w.alt = 125;
    w.heading = 0;
    w.roll = 0;
    return w;
  }
  if (name === 'storm') {
    // Leg 4 storm: rain, lightning, rings in the murk.
    const w = freshWorld(seed);
    startLeg(w, 3);
    w.screen = SCREEN.PLAYING;
    w.flash = 0.8;
    // ~18 s: ring 3 ahead, volcano in view, storm murk all around.
    runSteps(w, 60 * 18, dt);
    if (w.screen === SCREEN.CRASHED) {
      startLeg(w, 3);
      w.screen = SCREEN.PLAYING;
      w.z = 2200;
      w.alt = 240;
      w.x = 0;
      w.heading = 0;
      w.roll = 0;
      w.speed = 55;
      runSteps(w, 60 * 3, dt);
    }
    w.flash = 0.55; // guarantee a visible flash in the shot
    return w;
  }
  // Default: plain mid-flight.
  const w = freshWorld(seed);
  w.screen = SCREEN.PLAYING;
  runSteps(w, 60 * 20, dt);
  return w;
}

export const SHOT_NAMES = ['start', 'play', 'approach', 'storm'];
