import * as THREE from "three";
import { MAZE, ITEMS } from "../utils/constants.js";
import { rand, randi, dist3 } from "../utils/math.js";

export class Item {
  constructor(type, cellX, cellZ, maze) {
    this.type = type;
    this.maze = maze;
    this.collected = false;
    this.respawnable = (type === "ammo" || type === "battery");
    this.respawnTimer = 0;

    const wp = maze.worldPos(cellX, cellZ);
    this.spawnX = wp.x;
    this.spawnZ = wp.z;
    this.mesh = this._createMesh();
    this.mesh.position.set(wp.x, 0.8, wp.z);
  }

  _createMesh() {
    const group = new THREE.Group();
    let geo, mat;

    switch (this.type) {
      case "piece":
        geo = new THREE.OctahedronGeometry(0.3, 0);
        mat = new THREE.MeshStandardMaterial({
          color: 0x4488ff,
          emissive: 0x2244ff,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.6,
        });
        break;
      case "ammo":
        geo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
        mat = new THREE.MeshStandardMaterial({
          color: 0xffaa22,
          emissive: 0xff8800,
          emissiveIntensity: 0.7,
          roughness: 0.3,
          metalness: 0.5,
        });
        break;
      case "battery":
        geo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 8);
        mat = new THREE.MeshStandardMaterial({
          color: 0x44ff88,
          emissive: 0x22ff66,
          emissiveIntensity: 0.8,
          roughness: 0.35,
          metalness: 0.4,
        });
        break;
      case "fuse":
        geo = new THREE.TetrahedronGeometry(0.25, 0);
        mat = new THREE.MeshStandardMaterial({
          color: 0xffdd44,
          emissive: 0xffcc00,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.5,
        });
        break;
      case "power":
        geo = new THREE.IcosahedronGeometry(0.4, 1);
        mat = new THREE.MeshStandardMaterial({
          color: 0xff6644,
          emissive: 0xff4422,
          emissiveIntensity: 1.0,
          roughness: 0.2,
          metalness: 0.6,
        });
        break;
      case "exit":
        geo = new THREE.TorusGeometry(0.5, 0.12, 8, 20);
        mat = new THREE.MeshStandardMaterial({
          color: 0x44ffdd,
          emissive: 0x22ffcc,
          emissiveIntensity: 1.2,
          roughness: 0.15,
          metalness: 0.4,
        });
        break;
      default:
        geo = new THREE.SphereGeometry(0.2, 8, 8);
        mat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.5,
        });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);

    const glowGeo = new THREE.SphereGeometry(0.6, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: mat.emissive.getHex(),
      transparent: true,
      opacity: 0.1,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    group.userData.mainMesh = mesh;
    group.userData.glowMesh = glow;

    return group;
  }

  hide() {
    this.collected = true;
    this.mesh.visible = false;
  }

  respawn(cellX, cellZ) {
    const wp = this.maze.worldPos(cellX, cellZ);
    this.spawnX = wp.x;
    this.spawnZ = wp.z;
    this.mesh.position.set(wp.x, 0.8, wp.z);
    this.collected = false;
    this.mesh.visible = true;
    this.respawnTimer = 0;
  }

  update(dt) {
    if (this.collected) {
      if (this.respawnable) {
        this.respawnTimer += dt;
        if (this.respawnTimer >= ITEMS.RESPAWN_INTERVAL) {
          return "respawn";
        }
      }
      return;
    }

    const t = Date.now() * 0.002;
    const mainMesh = this.mesh.userData.mainMesh;
    if (mainMesh) {
      mainMesh.rotation.y += dt * 1.2;
      mainMesh.position.y = Math.sin(t) * 0.15;
    }

    const glowMesh = this.mesh.userData.glowMesh;
    if (glowMesh) {
      glowMesh.material.opacity = 0.08 + Math.sin(t * 1.5) * 0.06;
      glowMesh.scale.setScalar(1 + Math.sin(t) * 0.1);
    }
  }

  canInteract(playerPos, range = 2.2) {
    if (this.collected) return false;
    return dist3(this.mesh.position, playerPos) < range;
  }
}

export class ItemManager {
  constructor(maze) {
    this.maze = maze;
    this.items = [];
    this.pieces = [];
    this.ammoPickups = [];
    this.batteries = [];
    this.fuses = [];
    this.powerNodes = [];
    this.exitPortal = null;
    this._usedCells = [];
  }

  spawn(playerCell) {
    this.items = [];
    this.pieces = [];
    this.ammoPickups = [];
    this.batteries = [];
    this.fuses = [];
    this.powerNodes = [];
    this.exitPortal = null;
    this._usedCells = [playerCell];

    const pieceCells = this.maze.getEmptyCells(ITEMS.PIECES_TOTAL, this._usedCells);
    this._usedCells.push(...pieceCells);
    for (const c of pieceCells) {
      const item = new Item("piece", c.x, c.y, this.maze);
      this.pieces.push(item);
      this.items.push(item);
    }

    const ammoCells = this.maze.getEmptyCells(ITEMS.AMMO_PICKUPS, this._usedCells);
    this._usedCells.push(...ammoCells);
    for (const c of ammoCells) {
      const item = new Item("ammo", c.x, c.y, this.maze);
      this.ammoPickups.push(item);
      this.items.push(item);
    }

    const batteryCells = this.maze.getEmptyCells(ITEMS.BATTERIES, this._usedCells);
    this._usedCells.push(...batteryCells);
    for (const c of batteryCells) {
      const item = new Item("battery", c.x, c.y, this.maze);
      this.batteries.push(item);
      this.items.push(item);
    }

    const fuseCells = this.maze.getEmptyCells(ITEMS.FUSES, this._usedCells);
    this._usedCells.push(...fuseCells);
    for (const c of fuseCells) {
      const item = new Item("fuse", c.x, c.y, this.maze);
      this.fuses.push(item);
      this.items.push(item);
    }

    let powerCells = [];
    if (ITEMS.POWER_NODES > 0) {
      powerCells = this.maze.getEmptyCells(ITEMS.POWER_NODES, this._usedCells);
      this._usedCells.push(...powerCells);
      for (const c of powerCells) {
        const item = new Item("power", c.x, c.y, this.maze);
        this.powerNodes.push(item);
        this.items.push(item);
      }
    }

    const exitCell = this.maze.getEmptyCells(1, this._usedCells)[0];
    this.exitPortal = new Item("exit", exitCell.x, exitCell.y, this.maze);
    this.items.push(this.exitPortal);

    return {
      pieces: pieceCells,
      ammo: ammoCells,
      batteries: batteryCells,
      fuses: fuseCells,
      powerNodes: powerCells,
      exit: exitCell,
    };
  }

  update(dt) {
    for (const item of this.items) {
      const result = item.update(dt);
      if (result === "respawn") {
        const empty = this.maze.getEmptyCells(1, this._usedCells);
        if (empty.length > 0) {
          item.respawn(empty[0].x, empty[0].y);
        } else {
          const any = this.maze.getEmptyCells(1, []);
          if (any.length > 0) {
            item.respawn(any[0].x, any[0].y);
          }
        }
      }
    }
  }

  addToScene(scene) {
    for (const item of this.items) {
      scene.add(item.mesh);
    }
  }

  getNearestInteractable(playerPos) {
    let nearest = null;
    let minDist = 2.5;

    for (const item of this.items) {
      if (item.collected) continue;
      const d = dist3(item.mesh.position, playerPos);
      if (d < minDist) {
        minDist = d;
        nearest = item;
      }
    }

    return nearest;
  }

  reset() {
    for (const item of this.items) {
      if (item.mesh.parent) item.mesh.parent.remove(item.mesh);
    }
    this.items = [];
    this.pieces = [];
    this.ammoPickups = [];
    this.batteries = [];
    this.fuses = [];
    this.powerNodes = [];
    this.exitPortal = null;
  }
}
