import * as THREE from "three";
import { MAZE, MONSTERS, COMBAT } from "../utils/constants.js";
import { rand, randi, dist3 } from "../utils/math.js";

export class Monster {
  constructor(type, cellX, cellY, maze) {
    this.type = type;
    this.maze = maze;
    this.alive = true;
    this.stunned = false;
    this.stunTimer = 0;

    const wp = maze.worldPos(cellX, cellY);
    this.position = new THREE.Vector3(wp.x, 1.6, wp.z);

    this.isObserving = false;
    this.wanderAngle = rand(0, Math.PI * 2);
    this.moveTimer = 0;

    this.mesh = this._createMesh();
  }

  _createMesh() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.35, 1.0, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.type.color,
      emissive: this.type.emissive,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.4,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.0,
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 1.4, -0.32);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 1.4, -0.32);
    group.add(rightEye);

    const glowGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.type.emissive,
      transparent: true,
      opacity: 0.12,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 1.0;
    group.add(glow);

    const auraGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: this.type.emissive,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.y = 1.0;
    group.add(aura);

    group.userData.body = body;
    group.userData.glow = glow;
    group.userData.aura = aura;

    return group;
  }

  stun() {
    this.stunned = true;
    this.stunTimer = COMBAT.STUN_TIME;
    if (this.mesh.userData.body) {
      this.mesh.userData.body.material.emissiveIntensity = 0.1;
    }
  }

  update(dt, playerPos, playerYaw) {
    if (!this.alive) return;

    if (this.stunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.stunned = false;
        if (this.mesh.userData.body) {
          this.mesh.userData.body.material.emissiveIntensity = 0.7;
        }
      }
      this._updateMesh();
      return;
    }

    const distToPlayer = dist3(
      this.position.x,
      this.position.z,
      playerPos.x,
      playerPos.z
    );

    switch (this.type.name) {
      case "EL OBSERVADOR":
        this._updateObserver(dt, playerPos, playerYaw, distToPlayer);
        break;
      case "EL CAZADOR":
        this._updateHunter(dt, playerPos, distToPlayer);
        break;
    }

    this._updateMesh();
  }

  _updateObserver(dt, playerPos, playerYaw, distToPlayer) {
    const toMonster = new THREE.Vector3()
      .subVectors(this.position, playerPos)
      .normalize();
    const playerForward = new THREE.Vector3(
      -Math.sin(playerYaw),
      0,
      -Math.cos(playerYaw)
    ).normalize();
    const dot = toMonster.dot(playerForward);

    this.isObserving = dot > 0.3 && distToPlayer < 22;

    if (!this.isObserving) {
      this._chaseTarget(playerPos, dt);
    } else {
      this._wander(dt);
    }
  }

  _updateHunter(dt, playerPos, distToPlayer) {
    if (distToPlayer < 30) {
      this._chaseTarget(playerPos, dt);
    } else {
      this._wander(dt);
    }
  }

  _chaseTarget(target, dt) {
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.5) {
      const speed = this.type.speed * dt;
      const moveX = (dx / dist) * speed;
      const moveZ = (dz / dist) * speed;

      const newX = this.position.x + moveX;
      const newZ = this.position.z + moveZ;

      if (!this._collides(newX, this.position.z)) {
        this.position.x = newX;
      }
      if (!this._collides(this.position.x, newZ)) {
        this.position.z = newZ;
      }
    }
  }

  _wander(dt) {
    this.moveTimer -= dt;
    if (this.moveTimer <= 0) {
      this.wanderAngle += (Math.random() - 0.5) * 2;
      this.moveTimer = rand(1, 3);
    }

    const speed = this.type.speed * 0.4 * dt;
    const moveX = Math.sin(this.wanderAngle) * speed;
    const moveZ = Math.cos(this.wanderAngle) * speed;

    const newX = this.position.x + moveX;
    const newZ = this.position.z + moveZ;

    if (!this._collides(newX, this.position.z)) {
      this.position.x = newX;
    } else {
      this.wanderAngle += Math.PI;
    }
    if (!this._collides(this.position.x, newZ)) {
      this.position.z = newZ;
    } else {
      this.wanderAngle += Math.PI;
    }
  }

  _collides(wx, wz) {
    const cs = MAZE.CELL_SIZE;
    const halfW = MAZE.WIDTH / 2;
    const halfH = MAZE.HEIGHT / 2;
    const r = 0.4;

    const pts = [
      { x: wx + r, z: wz + r },
      { x: wx - r, z: wz - r },
      { x: wx + r, z: wz - r },
      { x: wx - r, z: wz + r },
    ];

    for (const p of pts) {
      const cx = Math.floor(p.x / cs + halfW);
      const cz = Math.floor(p.z / cs + halfH);
      if (this.maze.isWall(cx, cz)) return true;
    }
    return false;
  }

  _updateMesh() {
    const targetY = this.stunned ? 0.5 : 0;
    const lerpSpeed = 0.12;
    this.mesh.position.x += (this.position.x - this.mesh.position.x) * lerpSpeed;
    this.mesh.position.y += (targetY - this.mesh.position.y) * lerpSpeed;
    this.mesh.position.z += (this.position.z - this.mesh.position.z) * lerpSpeed;

    const t = Date.now() * 0.003;
    const bob = Math.sin(t * 1.5) * 0.08;
    this.mesh.position.y += bob;

    this.mesh.rotation.y += 0.02;

    if (this.stunned) {
      this.mesh.rotation.z = Math.sin(t * 5) * 0.4;
    } else {
      this.mesh.rotation.z *= 0.9;
    }

    const glow = this.mesh.userData.glow;
    if (glow) {
      glow.material.opacity = 0.08 + Math.sin(t) * 0.06;
      const s = 1 + Math.sin(t * 1.2) * 0.15;
      glow.scale.set(s, s, s);
    }

    const aura = this.mesh.userData.aura;
    if (aura) {
      aura.material.opacity = 0.03 + Math.sin(t * 0.7) * 0.02;
      const s2 = 1 + Math.sin(t * 0.9) * 0.1;
      aura.scale.set(s2, s2, s2);
    }
  }

  canDamage(playerPos) {
    return dist3(this.position, playerPos) < COMBAT.MONSTER_RANGE && !this.stunned;
  }
}

export class MonsterManager {
  constructor(maze) {
    this.maze = maze;
    this.monsters = [];
  }

  spawn(excludeCells) {
    this.monsters = [];
    const cells = this.maze.getEmptyCells(MONSTERS.COUNT, excludeCells);

    for (let i = 0; i < MONSTERS.COUNT; i++) {
      const type = MONSTERS.TYPES[i % MONSTERS.TYPES.length];
      const cell = cells[i] || this.maze.getEmptyCells(1, excludeCells)[0];
      const monster = new Monster(type, cell.x, cell.y, this.maze);
      this.monsters.push(monster);
    }

    return this.monsters;
  }

  update(dt, playerPos, playerYaw) {
    for (const m of this.monsters) {
      m.update(dt, playerPos, playerYaw);
    }
  }

  getNearest(playerPos) {
    let nearest = null;
    let minDist = Infinity;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const d = dist3(m.position, playerPos);
      if (d < minDist) {
        minDist = d;
        nearest = m;
      }
    }
    return { monster: nearest, distance: minDist };
  }

  addToScene(scene) {
    for (const m of this.monsters) {
      scene.add(m.mesh);
    }
  }

  reset() {
    for (const m of this.monsters) {
      if (m.mesh.parent) m.mesh.parent.remove(m.mesh);
    }
    this.monsters = [];
  }
}
