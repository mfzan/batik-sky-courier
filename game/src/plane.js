// Vector-drawn high-wing bush plane with batik livery, banking with roll.
import { PALETTE } from './config.js';

// Draw the aircraft centred at (cx, cy), scale ~1. roll in radians (-0.9..0.9),
// pitch shifts the nose up/down, propAngle spins the prop blur.
export function drawPlane(ctx, cx, cy, scale, roll, pitch, propAngle, t, flaps) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(roll * 0.55);
  ctx.scale(scale, scale);
  // Soft shadow under the plane.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(6, 96, 150, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  const noseY = -pitch * 34;
  // Tail (behind, drawn first).
  ctx.fillStyle = '#d8cdb4';
  ctx.beginPath();
  ctx.moveTo(-118, -6 + noseY * 0.4);
  ctx.lineTo(-168, -34 + noseY * 0.4);
  ctx.lineTo(-168, -12 + noseY * 0.4);
  ctx.lineTo(-118, 12 + noseY * 0.4);
  ctx.closePath();
  ctx.fill();
  // Tail fin with batik motif.
  ctx.fillStyle = PALETTE.batikNavy;
  ctx.beginPath();
  ctx.moveTo(-128, -8 + noseY * 0.4);
  ctx.lineTo(-150, -72 + noseY * 0.4);
  ctx.lineTo(-128, -72 + noseY * 0.4);
  ctx.lineTo(-112, -10 + noseY * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.batikGold;
  ctx.beginPath();
  ctx.arc(-134, -52 + noseY * 0.4, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.batikRed;
  ctx.beginPath();
  ctx.arc(-134, -52 + noseY * 0.4, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Fuselage: cream body with batik stripe.
  const bodyGrad = ctx.createLinearGradient(0, -26, 0, 30);
  bodyGrad.addColorStop(0, '#fdf6e3');
  bodyGrad.addColorStop(0.55, '#f2e6c8');
  bodyGrad.addColorStop(1, '#cbb98f');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-150, -4 + noseY * 0.5);
  ctx.quadraticCurveTo(-60, -26 + noseY * 0.5, 40, -22 + noseY);
  ctx.quadraticCurveTo(130, -18 + noseY, 158, 0 + noseY);
  ctx.quadraticCurveTo(130, 20 + noseY, 40, 24 + noseY * 0.5);
  ctx.quadraticCurveTo(-60, 28 + noseY * 0.5, -150, 10 + noseY * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,45,25,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Batik stripe along the fuselage: navy band + gold parang waves.
  ctx.fillStyle = PALETTE.batikNavy;
  ctx.beginPath();
  ctx.moveTo(-148, 2 + noseY * 0.5);
  ctx.quadraticCurveTo(-40, -6 + noseY * 0.5, 60, -2 + noseY);
  ctx.lineTo(120, 2 + noseY);
  ctx.lineTo(118, 12 + noseY);
  ctx.quadraticCurveTo(0, 12 + noseY * 0.5, -148, 12 + noseY * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.batikGold;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let x = -140; x < 110; x += 14) {
    const y = 7 + Math.sin(x * 0.12) * 2.5 + noseY * 0.5;
    if (x === -140) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Batik dots.
  ctx.fillStyle = PALETTE.batikTeal;
  for (let x = -120; x < 100; x += 28) {
    ctx.beginPath();
    ctx.arc(x, 7 + noseY * 0.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cockpit windows.
  ctx.fillStyle = '#274b63';
  ctx.beginPath();
  ctx.moveTo(28, -20 + noseY);
  ctx.lineTo(78, -20 + noseY);
  ctx.lineTo(92, -4 + noseY);
  ctx.lineTo(28, -6 + noseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(34, -18 + noseY);
  ctx.lineTo(56, -18 + noseY);
  ctx.lineTo(56, -8 + noseY);
  ctx.lineTo(34, -8 + noseY);
  ctx.closePath();
  ctx.fill();

  // High wing.
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.moveTo(-30, -30 + noseY * 0.6);
  ctx.lineTo(30, -30 + noseY * 0.6);
  ctx.lineTo(44, -58 + noseY * 0.6);
  ctx.lineTo(-44, -58 + noseY * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,45,25,0.4)';
  ctx.stroke();
  // Wing batik tip.
  ctx.fillStyle = PALETTE.batikRed;
  ctx.beginPath();
  ctx.moveTo(30, -30 + noseY * 0.6);
  ctx.lineTo(44, -58 + noseY * 0.6);
  ctx.lineTo(30, -58 + noseY * 0.6);
  ctx.lineTo(18, -30 + noseY * 0.6);
  ctx.closePath();
  ctx.fill();

  // Lower wing / struts.
  ctx.strokeStyle = '#8a7a5c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, -28 + noseY * 0.6);
  ctx.lineTo(-70, 62);
  ctx.moveTo(20, -28 + noseY * 0.6);
  ctx.lineTo(70, 62);
  ctx.stroke();
  // Main wings spreading left/right (chase view: seen edge-on, wide).
  ctx.fillStyle = '#efe3c2';
  ctx.beginPath();
  ctx.ellipse(-150, 46, 130, 13, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(150, 46, 130, 13, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.batikNavy;
  ctx.beginPath();
  ctx.ellipse(-268, 60, 16, 11, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(268, 60, 16, 11, 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Landing gear + wheels.
  ctx.strokeStyle = '#3a3230';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-40, 24 + noseY * 0.5);
  ctx.lineTo(-52, 78);
  ctx.moveTo(40, 24 + noseY * 0.5);
  ctx.lineTo(52, 78);
  ctx.stroke();
  ctx.fillStyle = '#1c1a18';
  ctx.beginPath();
  ctx.arc(-54, 82, 11, 0, Math.PI * 2);
  ctx.arc(54, 82, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a8a8a';
  ctx.beginPath();
  ctx.arc(-54, 82, 4.5, 0, Math.PI * 2);
  ctx.arc(54, 82, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Propeller: spinning blur disc + blades.
  const px = 162;
  const py = noseY;
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = 'rgba(200,200,200,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(propAngle);
  ctx.fillStyle = 'rgba(40,32,26,0.85)';
  ctx.fillRect(-3, -62, 6, 124);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = 'rgba(40,32,26,0.45)';
  ctx.fillRect(-3, -62, 6, 124);
  ctx.restore();
  // Spinner.
  ctx.fillStyle = PALETTE.batikGold;
  ctx.beginPath();
  ctx.arc(px, py, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.batikRed;
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();

  // Nav lights (blink with time).
  const blink = Math.sin(t * 6) > 0;
  if (blink) {
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(-272, 58, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#37e08a';
  ctx.beginPath();
  ctx.arc(272, 58, 5, 0, Math.PI * 2);
  ctx.fill();
  // Strobe glow.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(-150, -64 + noseY * 0.4, blink ? 3 : 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Flaps indicator: small extended panels when flaps down.
  if (flaps) {
    ctx.fillStyle = 'rgba(184,68,46,0.9)';
    ctx.fillRect(-90, 56, 60, 6);
    ctx.fillRect(30, 56, 60, 6);
  }
  ctx.restore();
}
