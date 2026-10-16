export const W = 800,
  H = 600;
export const GROUND_Y = 480;
export const PLAYER_X = 160,
  PLAYER_SIZE = 40,
  HITBOX_INSET = 6;
export const GRAVITY = 2400,
  JUMP_VELOCITY = 900;
export const JUMP_BUFFER_MS = 100;
export const BASE_SPEED = 360,
  MAX_SPEED = 720,
  SPEED_STEP = 30;
export const METERS_PER_LEVEL = 500;
export const MIN_GAP_S = 0.95,
  MAX_GAP_S = 1.8;
export const FIRST_OBSTACLE_X = 1000;
export const PX_PER_METER = 10;
export const STATS_EVERY_MS = 100;
export const OBSTACLES = {
  spike: { w: 30, h: 40 },
  doubleSpike: { w: 60, h: 40 },
  block: { w: 40, h: 60 },
} as const;
export const BEAM = { w: 120, top: 220, bottom: 400 } as const;
export const BEAM_FROM_LEVEL = 3,
  BEAM_CHANCE = 0.25,
  BEAM_MIN_GAP_S = 1.2;
export const ORB_CHANCE = 0.3,
  ORB_Y = 350,
  ORB_R = 10,
  ORB_POINTS = 100;
export const LEVEL_TEXT_MS = 1000,
  ORB_TEXT_MS = 500,
  DEATH_MS = 600,
  DEATH_PARTICLES = 16;
export const PARALLAX_FACTOR = 0.25;
