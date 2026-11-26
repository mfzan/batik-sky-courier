// World state, legs, rings, physics step, collisions, scoring, fuel.
import { LEGS, PHYSICS, RINGS_PER_LEG, ringPlan } from './config.js';
import { makeRng, hashSeed } from './random.js';

export const SCREEN = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEG_COMPLETE: 'legComplete',
  CAMPAIGN_COMPLETE: 'campaignComplete',
  CRASHED: 'crashed',
};

export function freshWorld(seed) {
  const rng = makeRng(seed);
  const w = {
    seed,
    rng,
    screen: SCREEN.TITLE,
    legIndex: 0,
    leg: LEGS[0],
    time: 0,          // leg time seconds
    totalTime: 0,
    score: 0,
    parcels: 0,
    ringsHit: 0,
    ringsTotal: RINGS_PER_LEG,
    // Aircraft state
    x: 0,             // lateral position (world units)
    z: 0,             // distance along leg
    alt: 150,         // altitude above sea
    heading: 0,       // radians, 0 = straight ahead
    roll: 0,
    pitch: 0,
    speed: 55,
    throttle: 0.62,
    flaps: false,
    fuel: PHYSICS.fuelMax,
    vspeed: 0,
    // Runway
    runwayZ: 0,
    rings: [],
    nextRing: 0,
    runwayReached: false,
    landing: null,    // {quality, score} once landed
    crashReason: '',
    flash: 0,         // lightning flash 0..1
    flashTimer: 4,
    rainDrops: [],
    gust: 0,
    gustTimer: 0,
    message: '',
    messageTimer: 0,
    legStats: null,
    bestLanding: '',
    muted: false,
  };
  startLeg(w, 0);
  return w;
}

export function startLeg(w, legIndex) {
  const leg = LEGS[legIndex];
  w.legIndex = legIndex;
  w.leg = leg;
  w.time = 0;
  w.x = 0;
  w.z = 0;
  w.alt = leg.cruiseAlt;
  w.heading = 0;
  w.roll = 0;
  w.pitch = 0;
  w.speed = 55;
  w.throttle = 0.62;
  w.flaps = false;
  w.fuel = PHYSICS.fuelMax;
  w.vspeed = 0;
  w.rings = ringPlan(legIndex).map((r) => ({
    z: r.frac * leg.distance,
    x: r.lateral,
    alt: r.alt,
    hit: false,
    passed: false,
  }));
  w.nextRing = 0;
  w.runwayZ = leg.distance;
  w.runwayReached = false;
  w.landing = null;
  w.crashReason = '';
  w.flash = 0;
  w.flashTimer = 3 + w.rng.range(0, 4);
  w.gust = 0;
  w.gustTimer = 0;
  w.message = leg.blurb;
  w.messageTimer = 4;
  // Deterministic rain drops for the storm leg.
  w.rainDrops = [];
  for (let i = 0; i < 160; i++) {
    w.rainDrops.push({ x: w.rng.range(0, 1280), y: w.rng.range(0, 720), len: w.rng.range(14, 34), sp: w.rng.range(9, 15) });
  }
}

// Ground height at lateral x and distance z (world units).
// Sea level 0; islands rise above it; volcano is a tall cone near leg 3/4.
export function groundHeight(w, x, z) {
  const leg = w.leg;
  let h = 0;
  // Rolling island chain: a few gaussian mounds along the leg.
  const mounds = [
    { z: leg.distance * 0.22, x: -140, r: 260, h: 42 },
    { z: leg.distance * 0.45, x: 170, r: 300, h: 55 },
    { z: leg.distance * 0.68, x: -90, r: 280, h: 48 },
    { z: leg.distance * 0.95, x: 0, r: 340, h: 30 }, // destination island
  ];
  for (const m of mounds) {
    const dx = (x - m.x) / m.r;
    const dz = (z - m.z) / m.r;
    const d2 = dx * dx + dz * dz;
    if (d2 < 4) h += m.h * Math.exp(-d2 * 1.6);
  }
  if (leg.terrain === 'highland' || leg.terrain === 'plains') h += 14 * Math.exp(-Math.pow((z - leg.distance * 0.5) / 900, 2));
  if (leg.volcano) {
    const vz = leg.distance * 0.78;
    const dx = x / 190;
    const dz = (z - vz) / 190;
    const d2 = dx * dx + dz * dz;
    if (d2 < 3) h += 165 * Math.exp(-d2 * 1.1);
  }
  if (leg.terrain === 'volcano') {
    const vz = leg.distance * 0.55;
    const dx = (x + 40) / 220;
    const dz = (z - vz) / 220;
    const d2 = dx * dx + dz * dz;
    if (d2 < 3) h += 185 * Math.exp(-d2 * 1.1);
  }
  // Terraced hillsides add gentle bumps.
  if (leg.terraces) h += 8 * Math.sin(z * 0.004 + x * 0.01) * Math.exp(-Math.pow(x / 420, 2));
  return Math.max(0, h);
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// One physics step. dt in seconds. axes from Input. Returns events.
export function stepWorld(w, axes, dt) {
  const ev = { ring: false, landed: false, crashed: false, refuel: false };
  const leg = w.leg;
  const P = PHYSICS;
  w.time += dt;
  w.totalTime += dt;
  if (w.messageTimer > 0) w.messageTimer -= dt;

  // Gusts: storm legs push the plane laterally.
  w.gustTimer -= dt;
  if (w.gustTimer <= 0) {
    w.gustTimer = 1.2 + w.rng.range(0, 1.6);
    w.gust = (w.rng.next() * 2 - 1) * leg.gust * (leg.weather === 'storm' ? 2.2 : 1);
  }
  const gust = w.gust * (leg.weather === 'storm' ? 1.6 : 0.6);

  // Controls: blend keyboard and mouse steering.
  // Pitch authority used to be scaled by 0.55 (max pitch ±0.385), so the
  // plane could not sink faster than ~4 m/s on final and floated over
  // every runway. Full authority: max pitch ±0.7.
  const rollTarget = clamp(axes.roll * 0.85 + axes.mouseRoll * 0.45, -1, 1) * 0.9;
  const pitchTarget = clamp(axes.pitch * 0.7 + axes.mousePitch * 0.35, -1, 1);
  w.roll += (rollTarget - w.roll) * Math.min(1, dt * 3.2);
  w.pitch += (pitchTarget - w.pitch) * Math.min(1, dt * 2.6);
  w.throttle = clamp(w.throttle + axes.throttle * dt * 0.55, 0.15, 1);
  w.flaps = axes.flaps;

  // Speed: throttle drives it, flaps and climb bleed it. The speed floor
  // keeps the plane flyable on final — the old flap drag (-16) collapsed
  // speed to ~13, where stall sink then sank the plane into the hillside.
  let targetSpeed = P.minSpeed + (P.maxSpeed - P.minSpeed) * w.throttle
    - Math.max(0, w.pitch) * 14 - (w.flaps ? 9 : 0);
  targetSpeed = Math.max(26, targetSpeed);
  w.speed += (targetSpeed - w.speed) * Math.min(1, dt * 0.8);
  w.speed = clamp(w.speed, 8, P.maxSpeed + 6);

  // Vertical speed from pitch and speed.
  w.vspeed = w.pitch * P.climbRate * (w.speed / P.cruiseSpeed) - (w.flaps ? 4 : 0);
  // Stall sink, capped so it can never overpower a climb command.
  if (w.speed < 26) w.vspeed -= Math.min(6, (26 - w.speed) * 0.7);
  w.alt += w.vspeed * dt;
  w.alt = Math.max(0, w.alt);

  // Heading turns with roll.
  w.heading += -w.roll * P.turnRate * dt * (w.speed / P.cruiseSpeed);
  w.heading = clamp(w.heading, -0.9, 0.9);
  // Lateral drift: heading + gusts + wind.
  w.x += (Math.sin(w.heading) * w.speed * 0.9 + gust + leg.wind * 0.35) * dt * 2.2;
  w.x = clamp(w.x, -420, 420);
  w.z += w.speed * dt * 2.4;

  // Fuel.
  const drain = (P.fuelDrainBase + P.fuelDrainThrottle * w.throttle) * dt;
  w.fuel = Math.max(0, w.fuel - drain);
  if (w.fuel <= 0 && w.alt > 2) {
    w.vspeed = -P.sinkRate;
    w.alt = Math.max(0, w.alt + w.vspeed * dt);
  }

  // Lightning flash (storm leg).
  if (leg.weather === 'storm') {
    w.flashTimer -= dt;
    if (w.flashTimer <= 0) {
      w.flashTimer = 2.5 + w.rng.range(0, 4);
      w.flash = 1;
    }
  }
  if (w.flash > 0) w.flash -= dt * 2.4;

  // Rings.
  for (let i = 0; i < w.rings.length; i++) {
    const r = w.rings[i];
    if (r.hit || r.passed) continue;
    if (w.z > r.z + 60) { r.passed = true; if (i === w.nextRing) w.nextRing = i + 1; continue; }
    if (Math.abs(w.z - r.z) < 42) {
      const dx = w.x - r.x;
      const dy = w.alt - r.alt;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < P.ringRadius) {
        r.hit = true;
        w.ringsHit += 1;
        w.score += P.ringScore;
        ev.ring = true;
        w.message = 'Ring! +' + P.ringScore;
        w.messageTimer = 1.6;
        if (i === w.nextRing) w.nextRing = i + 1;
      }
    }
  }

  // Terrain / volcano collision.
  const gh = groundHeight(w, w.x, w.z);
  if (w.alt <= gh + P.crashAltMargin && w.z < w.runwayZ - 120) {
    w.screen = SCREEN.CRASHED;
    w.crashReason = gh > 90 ? 'You clipped the volcano.' : 'You flew into the hillside.';
    ev.crashed = true;
    return ev;
  }
  if (w.alt <= 1 && w.z < w.runwayZ - 120) {
    w.screen = SCREEN.CRASHED;
    w.crashReason = 'You ditched into the sea.';
    ev.crashed = true;
    return ev;
  }
  if (w.fuel <= 0 && w.alt <= 1 && w.z < w.runwayZ - 120) {
    w.screen = SCREEN.CRASHED;
    w.crashReason = 'Out of fuel — forced landing in the sea.';
    ev.crashed = true;
    return ev;
  }

  // Runway landing zone. The window runs to +800 so a plane still sinking
  // gently after the threshold can touch down instead of being called an
  // overshoot — the autopilot was at touchdown altitude 1 m past +650.
  if (w.z >= w.runwayZ - 160 && w.z <= w.runwayZ + 800) {
    const destGh = groundHeight(w, w.x, w.runwayZ);
    if (w.alt <= destGh + 14) {
      // Touchdown. Thresholds are firm but human-achievable: a slow,
      // level flare lands; a fast dive or a wild lateral offset does not.
      const lateralErr = Math.abs(w.x);
      const speedOk = w.speed < 68;
      const vsOk = w.vspeed > -12;
      if (lateralErr < 55 && speedOk && vsOk) {
        const quality = lateralErr < 18 && w.speed < 48 && w.vspeed > -5 ? 'PERFECT' : 'GOOD';
        const bonus = quality === 'PERFECT' ? P.perfectLandingBonus : P.goodLandingBonus;
        const timeBonus = Math.max(0, Math.round((260 - w.time) * 2));
        const gained = P.parcelScore + bonus + timeBonus;
        w.score += gained;
        w.parcels += 1;
        w.landing = { quality, bonus, timeBonus, gained };
        w.bestLanding = quality;
        w.legStats = {
          legName: leg.name, time: w.time, rings: w.rings.filter((r) => r.hit).length,
          quality, gained, score: w.score,
        };
        w.runwayReached = true;
        ev.landed = true;
        if (w.legIndex >= LEGS.length - 1) {
          w.screen = SCREEN.CAMPAIGN_COMPLETE;
        } else {
          w.screen = SCREEN.LEG_COMPLETE;
        }
        return ev;
      }
      // Hard touchdown off the strip = crash.
      w.screen = SCREEN.CRASHED;
      w.crashReason = lateralErr >= 55 ? 'You missed the runway strip.' : 'Too fast / too hard — touchdown failed.';
      ev.crashed = true;
      return ev;
    }
  }
  // Overshot the runway entirely.
  if (w.z > w.runwayZ + 850) {
    w.screen = SCREEN.CRASHED;
    w.crashReason = 'You overshot the runway.';
    ev.crashed = true;
    return ev;
  }
  return ev;
}

export function nextLeg(w) {
  if (w.legIndex + 1 < LEGS.length) {
    startLeg(w, w.legIndex + 1);
    w.screen = SCREEN.PLAYING;
  }
}

export function restartCampaign(w) {
  const seed = w.seed;
  const fresh = freshWorld(seed);
  Object.keys(fresh).forEach((k) => { w[k] = fresh[k]; });
  w.screen = SCREEN.PLAYING;
}
