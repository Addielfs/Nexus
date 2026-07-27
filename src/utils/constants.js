export const MAZE = {
  WIDTH: 33,
  HEIGHT: 33,
  CELL_SIZE: 4,
  WALL_HEIGHT: 3.4,
  ROOM_MIN: 4,
  ROOM_MAX: 8,
  ROOM_COUNT: 12,
  EXTRA_OPENINGS: 160,
};

export const PLAYER = {
  HEIGHT: 1.7,
  RADIUS: 0.28,
  SPEED: 5.5,
  SPRINT_MULT: 1.65,
  SPRINT_DRAIN: 12,
  HEALTH_MAX: 100,
  HEALTH_REGEN: 2.5,
  LIVES: 3,
  BATTERY_MAX: 100,
  BATTERY_DRAIN: 3.5,
  START_AMMO: 15,
  DAMAGE_COOLDOWN: 0.8,
  DOWNED_TIME: 5,
  DOWNED_REGEN: 25,
};

export const COMBAT = {
  DAMAGE: 100,
  STUN_TIME: 3.5,
  COOLDOWN: 0.35,
  MONSTER_DAMAGE: 18,
  MONSTER_RANGE: 1.3,
  FLASH_DURATION: 0.12,
};

export const ITEMS = {
  PIECES_TOTAL: 5,
  PIECES_INITIAL: 3,
  AMMO_PICKUPS: 8,
  AMMO_PER_PICKUP: 5,
  BATTERIES: 4,
  BATTERY_RESTORE: 30,
  FUSES: 3,
  FUSE_ENERGY: 18,
  POWER_NODES: 1,
  POWER_ENERGY: 25,
  RESPAWN_INTERVAL: 20,
};

export const MONSTERS = {
  COUNT: 4,
  TYPES: [
    {
      name: "EL OBSERVADOR",
      color: 0xff2222,
      emissive: 0xff0000,
      desc: "Se detiene cuando lo miras",
      speed: 3.2,
    },
    {
      name: "EL CAZADOR",
      color: 0xff8800,
      emissive: 0xff4400,
      desc: "Persigue activamente",
      speed: 3.8,
    },
  ],
};

export const MAP_NAMES = [
  "SUBNIVEL-7",
  "REALIDAD BAJA",
  "PASILLO CERO",
  "SECTOR ECHO",
  "CAMARA NEGRA",
];

export const LIGHTS = {
  AMBIENT: 0x111122,
  HEMISPHERE: { sky: 0x222244, ground: 0x0a0a12 },
  FOG: 0x050510,
  POINT_COLOR: 0x6644cc,
  FLASHLIGHT: 0xffeedd,
  FLASHLIGHT_RANGE: 30,
  FLASHLIGHT_INTENSITY: 4.0,
};
