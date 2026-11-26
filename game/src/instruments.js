// Lit instrument panel + HUD: altimeter, airspeed, compass, VSI, fuel, RPM, flaps.
import { VIEW_W, VIEW_H, PALETTE } from './config.js';

function dial(ctx, cx, cy, r, label, valueText, subText) {
  // Warm-lit dial face.
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#2b2836');
  g.addColorStop(0.8, '#17151f');
  g.addColorStop(1, '#0c0b12');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,179,71,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
  ctx.stroke();
  // Ticks.
  ctx.strokeStyle = '#cfc4a8';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (r - 8);
    const y1 = cy + Math.sin(a) * (r - 8);
    const x2 = cx + Math.cos(a) * (r - 3);
    const y2 = cy + Math.sin(a) * (r - 3);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffe9b0';
  ctx.font = `bold ${Math.max(13, r * 0.34)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(valueText, cx, cy + 2);
  ctx.fillStyle = '#b8a888';
  ctx.font = `bold ${Math.max(9, r * 0.2)}px sans-serif`;
  ctx.fillText(label, cx, cy + r * 0.52);
  if (subText) {
    ctx.fillStyle = '#8fd8c8';
    ctx.font = `${Math.max(9, r * 0.2)}px monospace`;
    ctx.fillText(subText, cx, cy - r * 0.55);
  }
}

function needle(ctx, cx, cy, r, frac, color) {
  const a = -Math.PI * 0.75 + frac * Math.PI * 1.5;
  ctx.strokeStyle = color || '#ff5a3c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12));
  ctx.stroke();
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPanel(ctx, w, t) {
  const panelY = VIEW_H - 108;
  // Panel strip with warm glow.
  const g = ctx.createLinearGradient(0, panelY, 0, VIEW_H);
  g.addColorStop(0, '#241f2e');
  g.addColorStop(1, '#100d16');
  ctx.fillStyle = g;
  ctx.fillRect(0, panelY, VIEW_W, VIEW_H - panelY);
  ctx.fillStyle = 'rgba(255,179,71,0.35)';
  ctx.fillRect(0, panelY, VIEW_W, 2);
  ctx.fillStyle = 'rgba(255,179,71,0.12)';
  ctx.fillRect(0, panelY + 2, VIEW_W, 10);

  const cy = panelY + 54;
  // Altimeter.
  dial(ctx, 110, cy, 42, 'ALT ft', String(Math.round(w.alt * 3.28)), 'x100 ft');
  needle(ctx, 110, cy, 42, ((w.alt * 3.28) % 1000) / 1000, '#ffb347');
  // Airspeed.
  dial(ctx, 225, cy, 42, 'AIRSPEED kt', String(Math.round(w.speed * 1.6)), 'IAS');
  needle(ctx, 225, cy, 42, Math.min(1, w.speed / 100), '#ff5a3c');
  // Heading compass tape (centre).
  const cx = VIEW_W / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 150, panelY + 12, 300, 84);
  ctx.clip();
  ctx.fillStyle = '#17151f';
  ctx.fillRect(cx - 150, panelY + 12, 300, 84);
  const hdgDeg = ((w.heading * 57.2958) % 360 + 360) % 360;
  for (let d = -180; d <= 180; d += 10) {
    const deg = Math.round((hdgDeg + d) / 10) * 10;
    const off = (deg - hdgDeg) * 2.4;
    const x = cx + off;
    if (x < cx - 150 || x > cx + 150) continue;
    const major = deg % 30 === 0;
    ctx.strokeStyle = major ? '#ffe9b0' : '#8a7a5c';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, panelY + 22);
    ctx.lineTo(x, panelY + (major ? 44 : 34));
    ctx.stroke();
    if (major) {
      const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg);
      ctx.fillStyle = '#ffe9b0';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, panelY + 62);
    }
  }
  ctx.restore();
  // Compass centre marker + digital heading.
  ctx.fillStyle = PALETTE.batikGold;
  ctx.beginPath();
  ctx.moveTo(cx, panelY + 16);
  ctx.lineTo(cx - 6, panelY + 28);
  ctx.lineTo(cx + 6, panelY + 28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(hdgDeg)).padStart(3, '0') + '°', cx, panelY + 80);
  ctx.fillStyle = '#b8a888';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('HEADING', cx, panelY + 96);

  // VSI.
  dial(ctx, VIEW_W - 330, cy, 42, 'VSI', (w.vspeed >= 0 ? '+' : '') + Math.round(w.vspeed * 3.28 * 10) / 10, 'ft/min x10');
  needle(ctx, VIEW_W - 330, cy, 42, Math.max(0, Math.min(1, 0.5 + w.vspeed / 50)), '#8fd8c8');
  // RPM.
  dial(ctx, VIEW_W - 215, cy, 42, 'RPM', String(Math.round(w.throttle * 2600)), 'x100');
  needle(ctx, VIEW_W - 215, cy, 42, w.throttle, '#ffb347');
  // Fuel gauge (vertical bar + dial).
  const fx = VIEW_W - 110;
  ctx.fillStyle = '#17151f';
  ctx.fillRect(fx - 32, panelY + 14, 64, 80);
  ctx.strokeStyle = '#8a6a3a';
  ctx.strokeRect(fx - 32, panelY + 14, 64, 80);
  // Fuel bar lives in the lower part of the box so the % text never overlaps it.
  const fh = 44 * (w.fuel / 100);
  ctx.fillStyle = w.fuel < 22 ? '#ff5a3c' : w.fuel < 45 ? '#ffb347' : '#37c978';
  ctx.fillRect(fx - 26, panelY + 88 - fh, 52, fh);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(w.fuel) + '%', fx, panelY + 32);
  ctx.fillStyle = '#b8a888';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('FUEL', fx, panelY + 52 - 8);
  // Throttle bar under fuel.
  ctx.fillStyle = '#2b2836';
  ctx.fillRect(fx - 26, panelY + 76, 52, 6);
  ctx.fillStyle = PALETTE.batikGold;
  ctx.fillRect(fx - 26, panelY + 76, 52 * w.throttle, 6);
}

export function drawHUD(ctx, w, t) {
  // Top bar.
  ctx.fillStyle = 'rgba(12,10,18,0.55)';
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = 'rgba(255,179,71,0.4)';
  ctx.fillRect(0, 64, VIEW_W, 2);

  // Big digital ALT / SPD / HDG.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fd8c8';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('ALTITUDE', 18, 20);
  ctx.fillText('SPEED', 178, 20);
  ctx.fillText('HEADING', 338, 20);
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(String(Math.round(w.alt * 3.28)).padStart(4, '0') + ' ft', 18, 52);
  ctx.fillText(Math.round(w.speed * 1.6) + ' kt', 178, 52);
  const hdgDeg = ((w.heading * 57.2958) % 360 + 360) % 360;
  ctx.fillText(String(Math.round(hdgDeg)).padStart(3, '0') + '°', 338, 52);

  // Mission banner centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('LEG ' + (w.legIndex + 1) + '/5  ·  ' + w.leg.name.toUpperCase(), VIEW_W / 2, 20);
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Parcels ' + w.parcels + '/' + 5 + '   ·   Rings ' + w.rings.filter((r) => r.hit).length + '/' + w.rings.length + '   ·   Score ' + w.score, VIEW_W / 2, 44);
  const next = w.rings[w.nextRing];
  if (next) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = '12px sans-serif';
    ctx.fillText('Next ring ' + Math.max(0, Math.round(next.z - w.z)) + ' m ahead', VIEW_W / 2, 60 - 2);
  } else {
    ctx.fillStyle = '#37e08a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('All rings done — land on the runway!', VIEW_W / 2, 58);
  }

  // Right: timer, wind, score.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8fd8c8';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('TIME', VIEW_W - 18, 20);
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 22px monospace';
  const mm = Math.floor(w.time / 60);
  const ss = Math.floor(w.time % 60);
  ctx.fillText(mm + ':' + String(ss).padStart(2, '0'), VIEW_W - 18, 46);
  // Wind arrow + label (label sits left of the arrow, clear of the bar edge).
  const windDeg = w.leg.wind * 12;
  ctx.fillStyle = '#8fd8c8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('WIND ' + Math.round(w.leg.wind * 2) + ' kt', VIEW_W - 148, 52);
  ctx.save();
  ctx.translate(VIEW_W - 132, 48);
  ctx.rotate((windDeg * Math.PI) / 180);
  ctx.strokeStyle = '#8fd8c8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, -8);
  ctx.stroke();
  ctx.fillStyle = '#8fd8c8';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(-5, -3);
  ctx.lineTo(5, -3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Flaps indicator pill (moved here from the fuel gauge, where it overlapped the bar).
  if (w.flaps) {
    ctx.fillStyle = '#37c978';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('FLAPS DOWN', VIEW_W - 240, 52);
  }

  // Toast message.
  if (w.messageTimer > 0 && w.message) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, w.messageTimer);
    ctx.fillStyle = 'rgba(12,10,18,0.7)';
    const mw = ctx.measureText(w.message).width + 36;
    ctx.fillRect(VIEW_W / 2 - mw / 2, 84, mw, 30);
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(w.message, VIEW_W / 2, 104);
    ctx.restore();
  }
  // Fuel warning.
  if (w.fuel < 22 && Math.sin(t * 6) > 0) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ LOW FUEL — land soon', VIEW_W / 2, 132);
  }
}
