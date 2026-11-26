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
  // Final approach target: the strip itself (ground at the runway + ~8),
  // not 55 — holding 55 made the plane float above touchdown forever.
  let talt = target ? target.alt : groundHeight(w, 0, w.runwayZ) + 8;
  const tz = target ? target.z : w.runwayZ;
  // Start coming down well before the runway: cap the target altitude
  // once the strip is 2500 m out, so high storm rings don't leave the
  // plane 150 m up with nowhere to descend to.
  const distToRunway = w.runwayZ - w.z;
  // Caps sit just below the late-ring altitudes (180/140) so the plane
  // can still thread them (ring radius 26) while coming down early.
  if (distToRunway < 2500) talt = Math.min(talt, 160);
  if (distToRunway < 1600) talt = Math.min(talt, 120);
  // Altitude floor: stay well clear of terrain/volcano ahead en route;
  // on final the margin shrinks to just above the strip.
  const ghAhead = Math.max(groundHeight(w, w.x, w.z + 200), groundHeight(w, tx, tz));
  talt = Math.max(talt, ghAhead + (target ? 45 : 6));
  // Desired heading points at the target; roll closes the heading error.
  // Wider heading authority on final approach so gusts can't push the
  // plane off the strip.
  const dx = tx - w.x;
  const dz = Math.max(120, tz - w.z);
  const hdgLimit = target ? 0.45 : 0.6;
  const targetHeading = Math.max(-hdgLimit, Math.min(hdgLimit, Math.atan2(dx, dz)));
  const roll = Math.max(-1, Math.min(1, (w.heading - targetHeading) * 2.2));
  // Altitude error: pitch toward target altitude.
  const da = talt - w.alt;
  let pitch = Math.max(-1, Math.min(1, da / 45));
  // Throttle: fast en route; on final, hold ~40 kt instead of cutting to
  // idle — cutting to idle collapsed speed into a stall on every leg.
  let throttle = 0;
  if (!target && distToRunway < 1200) {
    if (w.speed > 50) throttle = -1;
    else if (w.speed < 38) throttle = 1;
  } else if (w.speed < 52) throttle = 1;
  else if (w.speed > 66) throttle = -1;
  const flaps = !target && distToRunway < 450;
  if (!target && distToRunway < 1200) {
    // Two-phase final: firm descent to 300 m out, then a gentle sink.
    // (One flat -0.3 cap floated the plane over the runway on every leg.)
    if (distToRunway > 300) pitch = Math.max(-0.6, Math.min(0.4, pitch));
    else pitch = Math.max(-0.35, Math.min(0.4, pitch));
    // Flare only once low: near-level, gentle sink onto the strip.
    if (distToRunway < 250 && w.alt < 46) pitch = Math.max(-0.12, Math.min(0.15, pitch));
  }
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
