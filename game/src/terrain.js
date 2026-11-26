// Projection + terrain drawing: sea, islands, volcano, terraces, villages, runway, clouds.
import { VIEW_W, VIEW_H, HORIZON_Y, FOCAL, PALETTE } from './config.js';
import { makeRng, hashSeed } from './random.js';
import { groundHeight } from './world.js';

// Project a world point into screen space. Returns null when behind camera.
export function project(w, wx, wz, walt) {
  const dz = wz - w.z;
  if (dz < 12) return null;
  const s = FOCAL / dz;
  const sx = VIEW_W / 2 + (wx - w.x) * s * 1.05;
  const sy = HORIZON_Y - (walt - w.alt) * s * 1.05;
  return { x: sx, y: sy, s, dz };
}

function cacheFeatures(w) {
  const key = w.legIndex + ':' + w.seed;
  if (w._featKey === key && w._features) return w._features;
  const rng = makeRng(hashSeed('feat-' + w.legIndex + '-' + w.seed));
  const feats = { islands: [], villages: [], terraces: [], clouds: [], palms: [] };
  const leg = w.leg;
  for (let i = 0; i < 14; i++) {
    const z = leg.distance * (0.08 + i * 0.068) + rng.range(-120, 120);
    feats.islands.push({
      z, x: rng.range(-420, 420), w: rng.range(180, 420), h: rng.range(28, 78),
      green: rng.pick(['#4d8f4a', '#5da24e', '#3f7d3c']),
    });
  }
  for (let i = 0; i < 10; i++) {
    feats.villages.push({
      z: leg.distance * (0.12 + i * 0.09), x: rng.range(-260, 260), n: rng.int(3, 7),
    });
  }
  for (let i = 0; i < 16; i++) {
    feats.terraces.push({
      z: leg.distance * (0.1 + i * 0.058), x: rng.range(-320, 320), w: rng.range(120, 260),
    });
  }
  for (let i = 0; i < 18; i++) {
    feats.clouds.push({
      x: rng.range(-700, 700), y: rng.range(60, 250), z: rng.range(400, 5200),
      s: rng.range(0.7, 1.9), speed: rng.range(4, 12),
    });
  }
  w._featKey = key;
  w._features = feats;
  return feats;
}

export function drawSky(ctx, w, t) {
  const leg = w.leg;
  const storm = leg.weather === 'storm';
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 40);
  if (storm) {
    g.addColorStop(0, '#3a4666');
    g.addColorStop(0.55, '#7a6a72');
    g.addColorStop(1, '#c98a5e');
  } else if (leg.weather === 'sunset') {
    g.addColorStop(0, '#3d2f66');
    g.addColorStop(0.5, '#c65a6e');
    g.addColorStop(1, '#f7b267');
  } else {
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.55, PALETTE.skyMid);
    g.addColorStop(1, PALETTE.skyLow);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, HORIZON_Y + 42);

  // Low sun with glow, left of centre.
  const sunX = 930;
  const sunY = storm ? 250 : 218;
  const sunDim = storm ? 0.35 : 1;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 150);
  glow.addColorStop(0, `rgba(255,243,196,${0.95 * sunDim})`);
  glow.addColorStop(0.25, `rgba(255,179,71,${0.55 * sunDim})`);
  glow.addColorStop(1, 'rgba(255,179,71,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
  ctx.fillStyle = PALETTE.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, storm ? 26 : 34, 0, Math.PI * 2);
  ctx.fill();
  // Sun disc half-sunk glow band on the horizon.
  ctx.fillStyle = 'rgba(255,200,110,0.35)';
  ctx.fillRect(0, HORIZON_Y - 6, VIEW_W, 10);
}

export function drawClouds(ctx, w, t) {
  const feats = cacheFeatures(w);
  // Far clouds first (larger z = smaller on screen).
  const sorted = [...feats.clouds].sort((a, b) => b.z - a.z);
  for (const c of sorted) {
    // Parallax drift with time; wrap laterally.
    const drift = ((c.x + t * c.speed + w.z * 0.02) % 1500 + 1500) % 1500 - 750;
    const p = project(w, drift, c.z, 330);
    if (!p) continue;
    const r = 46 * p.s * c.s;
    if (r < 2) continue;
    const storm = w.leg.weather === 'storm';
    ctx.fillStyle = storm ? 'rgba(88,84,96,0.85)' : 'rgba(255,244,224,0.9)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 2.1, r * 0.62, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - r, p.y + r * 0.18, r * 1.2, r * 0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + r, p.y + r * 0.2, r * 1.3, r * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    // Warm under-light.
    ctx.fillStyle = storm ? 'rgba(60,55,70,0.5)' : 'rgba(247,180,110,0.45)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.28, r * 1.9, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSea(ctx, w, t) {
  const storm = w.leg.weather === 'storm';
  const g = ctx.createLinearGradient(0, HORIZON_Y, 0, VIEW_H);
  if (storm) {
    g.addColorStop(0, '#4a5a68');
    g.addColorStop(0.4, '#2c4256');
    g.addColorStop(1, '#16283a');
  } else {
    g.addColorStop(0, PALETTE.seaShallow);
    g.addColorStop(0.35, PALETTE.seaDeep);
    g.addColorStop(1, '#0d3248');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON_Y, VIEW_W, VIEW_H - HORIZON_Y);
  // Sun glitter path.
  const gx = 930;
  ctx.save();
  ctx.globalAlpha = storm ? 0.18 : 0.5;
  for (let i = 0; i < 26; i++) {
    const y = HORIZON_Y + 14 + i * 15;
    const spread = 30 + i * 9;
    const wob = Math.sin(t * 1.7 + i * 1.3) * 14;
    ctx.fillStyle = PALETTE.seaGlitter;
    ctx.fillRect(gx - spread / 2 + wob, y, spread * (0.4 + 0.6 * Math.abs(Math.sin(i * 2.1 + t))), 2.5);
  }
  ctx.restore();
  // Wave lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    const y = HORIZON_Y + 30 + i * i * 4.2 + 18;
    if (y > VIEW_H) break;
    ctx.beginPath();
    for (let x = 0; x <= VIEW_W; x += 40) {
      const yy = y + Math.sin(x * 0.02 + t * 2 + i) * 2;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function drawIsland(ctx, w, isl) {
  const gh = groundHeight(w, isl.x, isl.z);
  const base = project(w, isl.x, isl.z, 0);
  if (!base) return;
  const rw = isl.w * base.s * 0.9;
  // Taller dome so near islands read as hills, not flat plates.
  const rh = isl.h * base.s * 2.1 + gh * base.s;
  if (rw < 3) return;
  // Sand beach ring.
  ctx.fillStyle = PALETTE.sand;
  ctx.beginPath();
  ctx.ellipse(base.x, base.y, rw * 1.12, Math.max(3, rh * 0.22), 0, 0, Math.PI * 2);
  ctx.fill();
  // Green mound.
  ctx.fillStyle = isl.green;
  ctx.beginPath();
  ctx.ellipse(base.x, base.y - rh * 0.18, rw, Math.max(4, rh * 0.85), 0, Math.PI, 0);
  ctx.fill();
  // Jungle shading.
  ctx.fillStyle = 'rgba(20,60,25,0.35)';
  ctx.beginPath();
  ctx.ellipse(base.x + rw * 0.25, base.y - rh * 0.12, rw * 0.55, Math.max(3, rh * 0.55), 0, Math.PI, 0);
  ctx.fill();
}

export function drawVolcano(ctx, w, t) {
  if (!w.leg.volcano && w.leg.terrain !== 'volcano') return;
  const vz = w.leg.terrain === 'volcano' ? w.leg.distance * 0.55 : w.leg.distance * 0.78;
  const vx = w.leg.terrain === 'volcano' ? -40 : 0;
  const base = project(w, vx, vz, 0);
  if (!base) return;
  const h = 185 * base.s * 1.5;
  const bw = 230 * base.s * 1.5;
  if (bw < 4) return;
  // Cone.
  const g = ctx.createLinearGradient(base.x - bw, base.y, base.x + bw, base.y);
  g.addColorStop(0, PALETTE.volcanoRock);
  g.addColorStop(0.5, '#6b564a');
  g.addColorStop(1, PALETTE.volcanoDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(base.x - bw, base.y + 4);
  ctx.lineTo(base.x - bw * 0.22, base.y - h);
  ctx.lineTo(base.x + bw * 0.22, base.y - h);
  ctx.lineTo(base.x + bw, base.y + 4);
  ctx.closePath();
  ctx.fill();
  // Crater rim + lava glow.
  ctx.fillStyle = '#241a14';
  ctx.beginPath();
  ctx.ellipse(base.x, base.y - h, bw * 0.24, bw * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,110,40,0.85)';
  ctx.beginPath();
  ctx.ellipse(base.x, base.y - h, bw * 0.13, bw * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  // Smoking plume — animated puffs rising and drifting.
  for (let i = 0; i < 7; i++) {
    const ph = (t * 0.35 + i * 0.16) % 1;
    const px = base.x + Math.sin(i * 2.4 + t * 0.4) * 14 * ph + ph * 46;
    const py = base.y - h - ph * 150 * Math.min(1, base.s * 2 + 0.4);
    const pr = (10 + ph * 42) * Math.min(1, base.s * 1.6 + 0.25);
    ctx.fillStyle = `rgba(207,200,189,${0.75 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(2, pr), 0, Math.PI * 2);
    ctx.fill();
  }
  // Lava trickle.
  ctx.strokeStyle = 'rgba(255,120,40,0.7)';
  ctx.lineWidth = Math.max(1, 3 * base.s);
  ctx.beginPath();
  ctx.moveTo(base.x, base.y - h);
  ctx.lineTo(base.x + bw * 0.12, base.y - h * 0.45);
  ctx.stroke();
}

export function drawTerraces(ctx, w) {
  if (!w.leg.terraces) return;
  const feats = cacheFeatures(w);
  for (const tr of feats.terraces) {
    const p = project(w, tr.x, tr.z, 12);
    if (!p) continue;
    // Skip very close terraces: at large scale the stacked discs bury
    // the volcano and runway. Keep them as mid/far hillside steps.
    if (p.s > 1.0) continue;
    const tw = tr.w * p.s * 0.55;
    const th = 26 * p.s * 0.6;
    if (tw < 6) continue;
    for (let i = 0; i < 5; i++) {
      const y = p.y - i * th * 0.55;
      const ww = tw * (1 - i * 0.13);
      ctx.fillStyle = i % 2 ? PALETTE.terrace : PALETTE.terraceWater;
      ctx.beginPath();
      ctx.ellipse(p.x, y, ww / 2, Math.max(2, th * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,90,40,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

export function drawVillages(ctx, w) {
  const feats = cacheFeatures(w);
  for (const v of feats.villages) {
    const p = project(w, v.x, v.z, groundHeight(w, v.x, v.z));
    if (!p) continue;
    const s = p.s;
    const hs = Math.max(2.5, 9 * s);
    if (hs < 2.5) continue;
    for (let i = 0; i < v.n; i++) {
      const hx = p.x + (i - v.n / 2) * hs * 1.7;
      const hy = p.y - hs * 0.4;
      ctx.fillStyle = PALETTE.house;
      ctx.fillRect(hx - hs / 2, hy - hs * 0.8, hs, hs * 0.8);
      ctx.fillStyle = PALETTE.roof;
      ctx.beginPath();
      ctx.moveTo(hx - hs * 0.65, hy - hs * 0.8);
      ctx.lineTo(hx, hy - hs * 1.5);
      ctx.lineTo(hx + hs * 0.65, hy - hs * 0.8);
      ctx.closePath();
      ctx.fill();
      // Lit window.
      ctx.fillStyle = '#ffd98a';
      ctx.fillRect(hx - hs * 0.12, hy - hs * 0.55, hs * 0.24, hs * 0.24);
    }
  }
}

export function drawIslands(ctx, w) {
  const feats = cacheFeatures(w);
  const sorted = [...feats.islands].sort((a, b) => b.z - a.z);
  for (const isl of sorted) drawIsland(ctx, w, isl);
}

export function drawRunway(ctx, w, t) {
  const leg = w.leg;
  const rz = leg.distance;
  // Runway strip: two edges converging to the vanishing point.
  const near = project(w, 0, rz - 60, groundHeight(w, 0, rz));
  const far = project(w, 0, rz + 260, groundHeight(w, 0, rz));
  if (!near && !far) return;
  // Draw as a projected quad: sample points along the strip.
  // Wide strip (half-width 42) so it still reads at 1500+ m out.
  const ptsL = [];
  const ptsR = [];
  for (let d = -80; d <= 280; d += 40) {
    const p = project(w, -42, rz + d, groundHeight(w, -42, rz + d));
    const q = project(w, 42, rz + d, groundHeight(w, 42, rz + d));
    if (p) ptsL.push(p);
    if (q) ptsR.push(q);
  }
  if (ptsL.length < 2) return;
  ctx.fillStyle = PALETTE.runway;
  ctx.beginPath();
  ctx.moveTo(ptsL[0].x, ptsL[0].y);
  for (const p of ptsL) ctx.lineTo(p.x, p.y);
  for (let i = ptsR.length - 1; i >= 0; i--) ctx.lineTo(ptsR[i].x, ptsR[i].y);
  ctx.closePath();
  ctx.fill();
  // Bright edge lines so the strip reads against green islands at range.
  ctx.strokeStyle = 'rgba(245,240,220,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ptsL[0].x, ptsL[0].y);
  for (const p of ptsL) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ptsR[0].x, ptsR[0].y);
  for (const p of ptsR) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  // Centre dashes + threshold bars.
  ctx.fillStyle = PALETTE.runwayMark;
  for (let d = -40; d <= 240; d += 80) {
    const p = project(w, 0, rz + d, groundHeight(w, 0, rz + d) + 1);
    if (!p) continue;
    const dashW = Math.max(1.5, 4 * p.s);
    const dashH = Math.max(2, 16 * p.s);
    ctx.fillRect(p.x - dashW / 2, p.y - dashH / 2, dashW, dashH);
  }
  // Destination island label + windsock.
  const lp = project(w, 0, rz + 140, groundHeight(w, 0, rz) + 34);
  if (lp && lp.s > 0.05) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(lp.x - 92, lp.y - 34, 184, 26);
    ctx.fillStyle = '#fff8e6';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✈ ' + leg.to.toUpperCase() + ' AIRSTRIP', lp.x, lp.y - 15);
  }
}

export function drawRings(ctx, w, t) {
  for (let i = 0; i < w.rings.length; i++) {
    const r = w.rings[i];
    if (r.hit || r.passed) continue;
    const p = project(w, r.x, r.z, r.alt);
    if (!p) continue;
    const rad = 26 * p.s * 1.5;
    if (rad < 2) continue;
    const isNext = i === w.nextRing;
    const pulse = 0.75 + 0.25 * Math.sin(t * 4 + i);
    ctx.save();
    ctx.globalAlpha = isNext ? pulse : 0.55;
    ctx.strokeStyle = isNext ? PALETTE.ring : '#9fc4d8';
    ctx.lineWidth = Math.max(2, 5 * p.s);
    ctx.shadowColor = PALETTE.ring;
    ctx.shadowBlur = isNext ? 18 : 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(3, rad), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ringCore;
    ctx.lineWidth = Math.max(1, 2 * p.s);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2, rad * 0.72), 0, Math.PI * 2);
    ctx.stroke();
    // Chevrons pointing through.
    if (isNext && rad > 10) {
      ctx.fillStyle = PALETTE.ringCore;
      ctx.font = `bold ${Math.max(10, rad * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('›', p.x, p.y + rad * 0.18);
    }
    ctx.restore();
  }
}

export function drawRain(ctx, w, dt) {
  if (w.leg.weather !== 'storm') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(200,220,240,0.45)';
  ctx.lineWidth = 1.2;
  for (const d of w.rainDrops) {
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - 6 - w.gust * 2, d.y + d.len);
    ctx.stroke();
    d.y += d.sp * 60 * dt;
    d.x += w.gust * 30 * dt;
    if (d.y > VIEW_H) { d.y = -20; d.x = w.rng.range(0, VIEW_W); }
    if (d.x > VIEW_W) d.x = -10;
    if (d.x < -10) d.x = VIEW_W;
  }
  ctx.restore();
}
