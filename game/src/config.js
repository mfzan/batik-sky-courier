// Batik Sky Courier — shared constants. All tuning lives here.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HORIZON_Y = 302; // ~42% of height
export const FOCAL = 620;

export const PALETTE = {
  skyTop: '#2e4a7a',
  skyMid: '#e8915a',
  skyLow: '#f7c873',
  sunCore: '#fff3c4',
  sunGlow: '#ffb347',
  seaDeep: '#14506e',
  seaShallow: '#2f8fa8',
  seaGlitter: '#ffd98a',
  sand: '#e8d29a',
  grass: '#4d8f4a',
  grassLight: '#79b657',
  jungle: '#2e6b34',
  terrace: '#8fbf5a',
  terraceWater: '#7ec8c8',
  volcanoRock: '#5a4a42',
  volcanoDark: '#3d322c',
  smoke: '#cfc8bd',
  roof: '#b8442e',
  house: '#f2e6c8',
  runway: '#3a3f45',
  runwayMark: '#f5f0dc',
  ring: '#ffd94d',
  ringCore: '#fff6b0',
  panel: '#1c1a24',
  panelGlow: '#ffb347',
  hudText: '#fff8e6',
  batikNavy: '#1f3a5f',
  batikGold: '#e8a83c',
  batikRed: '#b8442e',
  batikTeal: '#2f8f7a',
};

export const PHYSICS = {
  gravity: 9.8,
  maxSpeed: 92,
  minSpeed: 18,
  cruiseSpeed: 58,
  climbRate: 26,
  sinkRate: 20,
  rollRate: 2.4,
  pitchRate: 1.5,
  turnRate: 0.55,
  fuelMax: 100,
  fuelDrainBase: 0.55, // per second at cruise throttle
  fuelDrainThrottle: 0.9,
  flapDrag: 0.45,
  groundAlt: 0,
  crashAltMargin: 6,
  ringRadius: 26,
  ringScore: 150,
  parcelScore: 400,
  perfectLandingBonus: 300,
  goodLandingBonus: 150,
};

// Five legs across the archipelago. Distances are in world units (metres-ish).
// Each leg: name, from, to, weather, terrain flavour, ring offsets.
export const LEGS = [
  {
    id: 1, name: 'Jakarta Coast', from: 'Jakarta', to: 'Bandung',
    weather: 'clear', wind: 2, gust: 0.4,
    terrain: 'coast', volcano: false, terraces: false,
    distance: 5200, cruiseAlt: 150,
    blurb: 'Parcels for the highlands — lift off over the bay.',
  },
  {
    id: 2, name: 'Bandung Highlands', from: 'Bandung', to: 'Yogyakarta',
    weather: 'clear', wind: 4, gust: 0.7,
    terrain: 'highland', volcano: false, terraces: true,
    distance: 5600, cruiseAlt: 210,
    blurb: 'Rice terraces below, tea hills ahead.',
  },
  {
    id: 3, name: 'Yogyakarta Plains', from: 'Yogyakarta', to: 'Bromo',
    weather: 'cloud', wind: 6, gust: 1.0,
    terrain: 'plains', volcano: true, terraces: true,
    distance: 6000, cruiseAlt: 190,
    blurb: 'Volcano on the nose — thread the valley rings.',
  },
  {
    id: 4, name: 'Bromo Volcano Storm', from: 'Bromo', to: 'Bali Strait',
    weather: 'storm', wind: 12, gust: 2.6,
    terrain: 'volcano', volcano: true, terraces: false,
    distance: 6200, cruiseAlt: 230,
    blurb: 'Monsoon storm over the crater. Rain, gusts, lightning.',
  },
  {
    id: 5, name: 'Bali Sunset Run', from: 'Bali Strait', to: 'Denpasar',
    weather: 'sunset', wind: 5, gust: 0.8,
    terrain: 'bali', volcano: false, terraces: true,
    distance: 5400, cruiseAlt: 160,
    blurb: 'Last parcel — golden hour over the island of the gods.',
  },
];

export const RINGS_PER_LEG = 6;
export const TOTAL_PARCELS = LEGS.length;

// Ring layout per leg, generated deterministically from the leg seed.
// Fractions along the leg (0..1), lateral offset, altitude.
export function ringPlan(legIndex) {
  const fracs = [0.14, 0.30, 0.46, 0.60, 0.74, 0.87];
  const lats = [-70, 60, -40, 90, -80, 30];
  const alts = [150, 190, 170, 210, 180, 140];
  // Leg 4 storm rings sit a little higher to clear the volcano — but not
  // so high that the plane can't get down to the runway afterwards.
  const altBoost = legIndex === 3 ? 25 : 0;
  const latBoost = legIndex === 3 ? 12 : 0;
  return fracs.map((f, i) => ({
    frac: f,
    lateral: lats[i] + latBoost * ((i % 2) ? 1 : -1),
    alt: alts[i] + altBoost,
  }));
}

export const CONTROLS_TEXT = [
  'Arrow keys / WASD — pitch & roll',
  'Shift / Ctrl — throttle up / down',
  'Space — flaps / brake',
  'Mouse — steer lightly',
  'P — pause    R — restart    M — mute',
];
