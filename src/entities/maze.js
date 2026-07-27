import * as THREE from "three";
import { MAZE } from "../utils/constants.js";
import { rand, randi, shuffle } from "../utils/math.js";

export class Maze {
  constructor() {
    this.grid = [];
    this.rooms = [];
    this.corridors = [];
    this.emptyCells = [];
  }

  generate() {
    const W = MAZE.WIDTH;
    const H = MAZE.HEIGHT;
    this.grid = Array.from({ length: H }, () => Array(W).fill(1));
    this.rooms = [];
    this.corridors = [];

    for (let i = 0; i < MAZE.ROOM_COUNT; i++) {
      this._placeRoom();
    }

    this._connectRooms();
    this._openExtra();
    this._collectEmpty();
    this._ensureConnectivity();

    return this.grid;
  }

  _placeRoom() {
    const W = MAZE.WIDTH;
    const H = MAZE.HEIGHT;
    for (let attempts = 0; attempts < 100; attempts++) {
      const rw = randi(MAZE.ROOM_MIN, MAZE.ROOM_MAX);
      const rh = randi(MAZE.ROOM_MIN, MAZE.ROOM_MAX);
      const rx = randi(2, W - rw - 2);
      const ry = randi(2, H - rh - 2);

      let overlaps = false;
      for (const r of this.rooms) {
        if (
          rx - 1 < r.x + r.w &&
          rx + rw + 1 > r.x &&
          ry - 1 < r.y + r.h &&
          ry + rh + 1 > r.y
        ) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        this.rooms.push({ x: rx, y: ry, w: rw, h: rh });
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            this.grid[y][x] = 0;
          }
        }
        return;
      }
    }
  }

  _connectRooms() {
    const centers = this.rooms.map((r) => ({
      x: Math.floor(r.x + r.w / 2),
      y: Math.floor(r.y + r.h / 2),
    }));

    const connected = new Set([0]);
    const unconnected = new Set(centers.map((_, i) => i).filter((i) => i > 0));

    while (unconnected.size > 0) {
      let bestDist = Infinity;
      let bestFrom = -1;
      let bestTo = -1;

      for (const ci of connected) {
        for (const ui of unconnected) {
          const dx = centers[ci].x - centers[ui].x;
          const dy = centers[ci].y - centers[ui].y;
          const d = Math.abs(dx) + Math.abs(dy);
          if (d < bestDist) {
            bestDist = d;
            bestFrom = ci;
            bestTo = ui;
          }
        }
      }

      if (bestTo === -1) break;

      this._carveCorridor(centers[bestFrom], centers[bestTo]);
      connected.add(bestTo);
      unconnected.delete(bestTo);
    }
  }

  _carveCorridor(a, b) {
    let { x, y } = a;
    const corridor = [];

    while (x !== b.x) {
      if (this.grid[y][x] === 1) {
        this.grid[y][x] = 0;
        corridor.push({ x, y });
      }
      x += x < b.x ? 1 : -1;
    }
    while (y !== b.y) {
      if (this.grid[y][x] === 1) {
        this.grid[y][x] = 0;
        corridor.push({ x, y });
      }
      y += y < b.y ? 1 : -1;
    }
    this.corridors.push(corridor);
  }

  _openExtra() {
    const W = MAZE.WIDTH;
    const H = MAZE.HEIGHT;
    let opened = 0;
    let attempts = 0;
    while (opened < MAZE.EXTRA_OPENINGS && attempts < 5000) {
      const x = randi(2, W - 3);
      const y = randi(2, H - 3);
      if (this.grid[y][x] === 1) {
        const neighbors =
          (this.grid[y - 1]?.[x] === 0 ? 1 : 0) +
          (this.grid[y + 1]?.[x] === 0 ? 1 : 0) +
          (this.grid[y]?.[x - 1] === 0 ? 1 : 0) +
          (this.grid[y]?.[x + 1] === 0 ? 1 : 0);
        if (neighbors >= 2) {
          this.grid[y][x] = 0;
          opened++;
        }
      }
      attempts++;
    }
  }

  _collectEmpty() {
    this.emptyCells = [];
    for (let y = 1; y < MAZE.HEIGHT - 1; y++) {
      for (let x = 1; x < MAZE.WIDTH - 1; x++) {
        if (this.grid[y][x] === 0) {
          this.emptyCells.push({ x, y });
        }
      }
    }
  }

  _ensureConnectivity() {
    const visited = Array.from({ length: MAZE.HEIGHT }, () =>
      Array(MAZE.WIDTH).fill(false)
    );
    const startCell = this.emptyCells[0];
    if (!startCell) return;

    const queue = [startCell];
    visited[startCell.y][startCell.x] = true;
    const reachable = [startCell];

    while (queue.length > 0) {
      const { x, y } = queue.shift();
      const dirs = [
        [0, -1], [0, 1], [-1, 0], [1, 0],
      ];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 && nx < MAZE.WIDTH &&
          ny >= 0 && ny < MAZE.HEIGHT &&
          !visited[ny][nx] &&
          this.grid[ny][nx] === 0
        ) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
          reachable.push({ x: nx, y: ny });
        }
      }
    }

    const unreachable = this.emptyCells.filter(
      (c) => !visited[c.y][c.x]
    );
    for (const cell of unreachable) {
      this.grid[cell.y][cell.x] = 1;
    }
    this.emptyCells = reachable;
  }

  getEmptyCells(count, exclude = []) {
    const used = new Set(exclude.map((c) => `${c.x},${c.y}`));
    const candidates = shuffle(
      this.emptyCells.filter((c) => !used.has(`${c.x},${c.y}`))
    );
    return candidates.slice(0, count);
  }

  worldPos(cellX, cellY) {
    return {
      x: (cellX - MAZE.WIDTH / 2 + 0.5) * MAZE.CELL_SIZE,
      z: (cellY - MAZE.HEIGHT / 2 + 0.5) * MAZE.CELL_SIZE,
    };
  }

  isWall(cellX, cellZ) {
    if (cellX < 0 || cellX >= MAZE.WIDTH || cellZ < 0 || cellZ >= MAZE.HEIGHT)
      return true;
    return this.grid[cellZ][cellX] === 1;
  }

  buildMeshes(scene) {
    const cs = MAZE.CELL_SIZE;
    const wh = MAZE.WALL_HEIGHT;
    const halfW = MAZE.WIDTH / 2;
    const halfH = MAZE.HEIGHT / 2;

    const floorGeo = new THREE.PlaneGeometry(cs, cs);
    floorGeo.rotateX(-Math.PI / 2);
    const floorColors = [
      0x2a2a55,
      0x2e2e5a,
      0x282850,
      0x2c2c58,
    ];
    const floorMats = floorColors.map((c) => new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.75,
      metalness: 0.1,
      emissive: 0x1a1a40,
      emissiveIntensity: 0.5,
    }));

    const wallGeo = new THREE.BoxGeometry(cs, wh, cs);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x303060,
      roughness: 0.65,
      metalness: 0.12,
      emissive: 0x1a1a40,
      emissiveIntensity: 0.4,
    });

    const floorGroup = new THREE.Group();
    for (let y = 0; y < MAZE.HEIGHT; y++) {
      for (let x = 0; x < MAZE.WIDTH; x++) {
        if (this.grid[y][x] === 0) {
          const wx = (x - halfW + 0.5) * cs;
          const wz = (y - halfH + 0.5) * cs;
          const fi = floorMats[(x + y) % floorMats.length];
          const floor = new THREE.Mesh(floorGeo, fi);
          floor.position.set(wx, 0, wz);
          floor.receiveShadow = true;
          floorGroup.add(floor);
        }
      }
    }
    scene.add(floorGroup);

    const wallMeshes = new THREE.InstancedMesh(
      wallGeo,
      wallMat,
      MAZE.WIDTH * MAZE.HEIGHT
    );
    wallMeshes.castShadow = true;
    wallMeshes.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let y = 0; y < MAZE.HEIGHT; y++) {
      for (let x = 0; x < MAZE.WIDTH; x++) {
        if (this.grid[y][x] === 1) {
          const wx = (x - halfW + 0.5) * cs;
          const wz = (y - halfH + 0.5) * cs;
          dummy.position.set(wx, wh / 2, wz);
          dummy.updateMatrix();
          wallMeshes.setMatrixAt(idx++, dummy.matrix);
        }
      }
    }
    wallMeshes.count = idx;
    wallMeshes.instanceMatrix.needsUpdate = true;
    scene.add(wallMeshes);

    const ceilingGeo = new THREE.PlaneGeometry(cs * MAZE.WIDTH, cs * MAZE.HEIGHT);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x151530,
      roughness: 0.9,
      metalness: 0.05,
      emissive: 0x0c0c22,
      emissiveIntensity: 0.2,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.set(0, wh, 0);
    ceiling.receiveShadow = true;
    scene.add(ceiling);

    return [floorGroup, wallMeshes, ceiling];
  }
}
