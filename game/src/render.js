// Scene composition: sky, terrain, rings, plane, panel, HUD, and all screens.
import { VIEW_W, VIEW_H, HORIZON_Y, PALETTE, LEGS, CONTROLS_TEXT } from './config.js';
import { SCREEN } from './world.js';
import { drawSky, drawClouds, drawSea, drawIslands, drawVolcano, drawTerraces, drawVillages, drawRunway, drawRings, drawRain } from './terrain.js';
import { drawPlane } from './plane.js';
import { drawPanel, drawHUD } from './instruments.js';

function vignette(ctx) {
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function drawWorldScene(ctx, w, t, dt) {
  drawSky(ctx, w, t);
  drawClouds(ctx, w, t);
  drawSea(ctx, w, t);
  drawIslands(ctx, w);
  drawTerraces(ctx, w);
  drawVillages(ctx, w);
  drawVolcano(ctx, w, t);
  drawRunway(ctx, w, t);
  drawRings(ctx, w, t);
  // Plane: centre-lower frame, slight bob with time.
  const bob = Math.sin(t * 1.8) * 3;
  drawPlane(ctx, VIEW_W / 2, 470 + bob, 0.92, w.roll, w.pitch, t * 22, t, w.flaps);
  drawRain(ctx, w, dt);
  // Lightning flash overlay.
  if (w.flash > 0) {
    ctx.fillStyle = `rgba(230,240,255,${w.flash * 0.25})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  drawPanel(ctx, w, t);
  drawHUD(ctx, w, t);
  vignette(ctx);
}

function panelCard(ctx, x, y, cw, ch) {
  ctx.fillStyle = 'rgba(12,10,18,0.82)';
  ctx.fillRect(x, y, cw, ch);
  ctx.strokeStyle = PALETTE.batikGold;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, cw, ch);
  ctx.fillStyle = 'rgba(255,179,71,0.15)';
  ctx.fillRect(x, y, cw, 4);
}

export function drawTitle(ctx, w, t) {
  drawWorldScene(ctx, w, t, 0.016);
  // Dim the scene slightly for the title card.
  ctx.fillStyle = 'rgba(10,8,16,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panelCard(ctx, 290, 96, 700, 500);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.batikGold;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('✈  A BUSH-PLANE PARCEL RUN ACROSS INDONESIA  ✈', VIEW_W / 2, 138);
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText('BATIK SKY', VIEW_W / 2, 196);
  ctx.fillStyle = PALETTE.batikGold;
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText('COURIER', VIEW_W / 2, 256);
  // Batik divider.
  ctx.fillStyle = PALETTE.batikRed;
  ctx.fillRect(VIEW_W / 2 - 150, 272, 300, 3);
  ctx.fillStyle = PALETTE.batikTeal;
  for (let x = -140; x <= 140; x += 28) {
    ctx.beginPath();
    ctx.arc(VIEW_W / 2 + x, 290, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // 5-island mission map.
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('MISSION MAP — 5 ISLAND LEGS, 5 PARCELS', VIEW_W / 2, 322);
  const stops = ['Jakarta', 'Bandung', 'Yogyakarta', 'Bromo', 'Bali'];
  for (let i = 0; i < 5; i++) {
    const x = 380 + i * 125;
    const y = 372;
    ctx.fillStyle = i === 0 ? PALETTE.batikGold : '#2f8f7a';
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8e6';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(stops[i], x, y + 32);
    if (i < 4) {
      ctx.strokeStyle = 'rgba(255,233,176,0.6)';
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(x + 14, y);
      ctx.lineTo(x + 111, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.fillStyle = '#cfc4a8';
  ctx.font = '13px sans-serif';
  CONTROLS_TEXT.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 438 + i * 20));
  // Blinking start prompt.
  if (Math.sin(t * 3.5) > -0.2) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('PRESS ENTER OR CLICK TO START', VIEW_W / 2, 566);
  }
  ctx.fillStyle = '#8a7a5c';
  ctx.font = '12px sans-serif';
  ctx.fillText('Fly the rings, land the runway, deliver every parcel — watch your fuel.', VIEW_W / 2, 588 - 4);
}

export function drawPaused(ctx, w, t) {
  drawWorldScene(ctx, w, t, 0.016);
  ctx.fillStyle = 'rgba(10,8,16,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panelCard(ctx, 440, 260, 400, 180);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, 330);
  ctx.fillStyle = '#cfc4a8';
  ctx.font = '15px sans-serif';
  ctx.fillText('P — resume      R — restart leg', VIEW_W / 2, 372);
  ctx.fillText('M — mute      Enter — resume', VIEW_W / 2, 398);
}

function statLine(ctx, label, value, y) {
  ctx.fillStyle = '#b8a888';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, VIEW_W / 2 - 180, y);
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(value, VIEW_W / 2 + 180, y);
}

export function drawLegComplete(ctx, w, t) {
  drawWorldScene(ctx, w, t, 0.016);
  ctx.fillStyle = 'rgba(10,8,16,0.5)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panelCard(ctx, 390, 130, 500, 430);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#37e08a';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('PARCEL DELIVERED!', VIEW_W / 2, 188);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(w.leg.name + '  →  ' + w.leg.to, VIEW_W / 2, 218);
  const s = w.legStats || { time: 0, rings: 0, quality: '-', gained: 0, score: w.score };
  statLine(ctx, 'Landing', s.quality, 268);
  statLine(ctx, 'Rings hit', s.rings + ' / ' + w.rings.length, 300);
  statLine(ctx, 'Leg time', Math.floor(s.time / 60) + ':' + String(Math.floor(s.time % 60)).padStart(2, '0'), 332);
  statLine(ctx, 'Leg points', '+' + s.gained, 364);
  statLine(ctx, 'Total score', String(s.score), 396);
  statLine(ctx, 'Parcels', w.parcels + ' / 5', 428);
  if (Math.sin(t * 3.5) > -0.2) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS ENTER — NEXT LEG', VIEW_W / 2, 508);
  }
}

export function drawCampaignComplete(ctx, w, t) {
  drawWorldScene(ctx, w, t, 0.016);
  ctx.fillStyle = 'rgba(10,8,16,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panelCard(ctx, 360, 110, 560, 470);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.batikGold;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('ALL PARCELS DELIVERED!', VIEW_W / 2, 172);
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText('Batik Sky Courier — campaign complete', VIEW_W / 2, 204);
  statLine(ctx, 'Total score', String(w.score), 268);
  statLine(ctx, 'Parcels', w.parcels + ' / 5', 300);
  statLine(ctx, 'Rings hit', w.ringsHit + ' / 30', 332);
  const mm = Math.floor(w.totalTime / 60);
  const ss = Math.floor(w.totalTime % 60);
  statLine(ctx, 'Total time', mm + ':' + String(ss).padStart(2, '0'), 364);
  const rank = w.score >= 6000 ? 'LEGEND OF THE SKIES' : w.score >= 4500 ? 'MASTER COURIER' : w.score >= 3000 ? 'SEASONED PILOT' : 'ROOKIE RUNNER';
  ctx.fillStyle = '#37e08a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('RANK: ' + rank, VIEW_W / 2, 424);
  if (Math.sin(t * 3.5) > -0.2) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('PRESS ENTER — FLY AGAIN', VIEW_W / 2, 508);
  }
}

export function drawCrashed(ctx, w, t) {
  drawWorldScene(ctx, w, t, 0.016);
  ctx.fillStyle = 'rgba(40,8,8,0.5)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panelCard(ctx, 390, 180, 500, 330);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a3c';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('CRASHED', VIEW_W / 2, 248);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = '17px sans-serif';
  ctx.fillText(w.crashReason || 'The courier went down.', VIEW_W / 2, 286);
  statLine(ctx, 'Leg', w.leg.name, 336);
  statLine(ctx, 'Score so far', String(w.score), 368);
  statLine(ctx, 'Parcels', w.parcels + ' / 5', 400);
  if (Math.sin(t * 3.5) > -0.2) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS R — TRY THE LEG AGAIN', VIEW_W / 2, 468);
  }
}

export function drawScreen(ctx, w, t, dt) {
  switch (w.screen) {
    case SCREEN.TITLE: drawTitle(ctx, w, t); break;
    case SCREEN.PAUSED: drawPaused(ctx, w, t); break;
    case SCREEN.LEG_COMPLETE: drawLegComplete(ctx, w, t); break;
    case SCREEN.CAMPAIGN_COMPLETE: drawCampaignComplete(ctx, w, t); break;
    case SCREEN.CRASHED: drawCrashed(ctx, w, t); break;
    default: drawWorldScene(ctx, w, t, dt); break;
  }
}
