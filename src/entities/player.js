import * as THREE from "three";
import { MAZE, PLAYER } from "../utils/constants.js";

export class Player {
  constructor(maze) {
    this.maze = maze;
    this.position = new THREE.Vector3(0, PLAYER.HEIGHT, 0);
    this.yaw = 0;
    this.pitch = 0;

    this.health = PLAYER.HEALTH_MAX;
    this.lives = PLAYER.LIVES;
    this.battery = PLAYER.BATTERY_MAX;
    this.flashlightOn = true;

    this.hasWeapon = true;
    this.weaponAmmo = PLAYER.START_AMMO;

    this.piecesFound = 0;
    this.keyAssembled = false;

    this.escapeEnergy = 0;

    this.isDowned = false;
    this.downedTimer = 0;

    this.damageCooldown = 0;
    this.shootCooldown = 0;

    this.keys = {};
    this.mouse = { dx: 0, dy: 0, locked: false };
    this.nearestInteractable = null;
    this.mouseActive = false;

    this._lastMouseX = 0;
    this._lastMouseY = 0;
    this._mouseInitialized = false;

    this.mouseButtons = { left: false, right: false };

    this._boundKeyDown = this._onKeyDown.bind(this);
    this._boundKeyUp = this._onKeyUp.bind(this);
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundClick = this._onClick.bind(this);
    this._boundPointerLock = this._onPointerLockChange.bind(this);
    this._boundContextMenu = (e) => e.preventDefault();
  }

  spawn(cellX, cellY) {
    const wp = this.maze.worldPos(cellX, cellY);
    this.position.set(wp.x, PLAYER.HEIGHT, wp.z);
  }

  reset() {
    this.health = PLAYER.HEALTH_MAX;
    this.lives = PLAYER.LIVES;
    this.battery = PLAYER.BATTERY_MAX;
    this.flashlightOn = true;
    this.hasWeapon = true;
    this.weaponAmmo = PLAYER.START_AMMO;
    this.piecesFound = 0;
    this.keyAssembled = false;
    this.escapeEnergy = 0;
    this.isDowned = false;
    this.downedTimer = 0;
    this.damageCooldown = 0;
    this.shootCooldown = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.mouseActive = false;
    this._mouseInitialized = false;
  }

  bindEvents(canvas) {
    this.canvas = canvas;
    document.addEventListener("keydown", this._boundKeyDown);
    document.addEventListener("keyup", this._boundKeyUp);
    document.addEventListener("mousemove", this._boundMouseMove);
    canvas.addEventListener("mousedown", this._boundMouseDown);
    canvas.addEventListener("mouseup", this._boundMouseUp);
    canvas.addEventListener("click", this._boundClick);
    canvas.addEventListener("contextmenu", this._boundContextMenu);
    document.addEventListener("pointerlockchange", this._boundPointerLock);
  }

  unbindEvents() {
    document.removeEventListener("keydown", this._boundKeyDown);
    document.removeEventListener("keyup", this._boundKeyUp);
    document.removeEventListener("mousemove", this._boundMouseMove);
    if (this.canvas) {
      this.canvas.removeEventListener("mousedown", this._boundMouseDown);
      this.canvas.removeEventListener("mouseup", this._boundMouseUp);
      this.canvas.removeEventListener("click", this._boundClick);
      this.canvas.removeEventListener("contextmenu", this._boundContextMenu);
    }
    document.removeEventListener("pointerlockchange", this._boundPointerLock);
  }

  applyDamage(amount) {
    if (this.damageCooldown > 0 || this.isDowned) return false;
    this.health -= amount;
    this.damageCooldown = PLAYER.DAMAGE_COOLDOWN;

    if (this.health <= 0) {
      this.health = 0;
      this.lives--;
      if (this.lives <= 0) {
        return "gameover";
      }
      this.isDowned = true;
      this.downedTimer = PLAYER.DOWNED_TIME;
    }
    return true;
  }

  update(dt) {
    if (this.damageCooldown > 0) this.damageCooldown -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    if (this.isDowned) {
      this.downedTimer -= dt;
      this.pitch = -0.5;
      if (this.downedTimer <= 0) {
        this.isDowned = false;
        this.health = PLAYER.DOWNED_REGEN;
      }
      return;
    }

    const sprinting = this.keys["shift"];
    let speed = PLAYER.SPEED;
    if (sprinting && (this.keys["w"] || this.keys["s"] || this.keys["a"] || this.keys["d"])) {
      speed *= PLAYER.SPRINT_MULT;
      this.battery -= PLAYER.SPRINT_DRAIN * dt;
      if (this.battery < 0) this.battery = 0;
    }

    if (this.keys["f"]) {
      if (!this._flashToggle) {
        this.flashlightOn = !this.flashlightOn;
        this._flashToggle = true;
      }
    } else {
      this._flashToggle = false;
    }

    if (this.flashlightOn) {
      this.battery -= PLAYER.BATTERY_DRAIN * dt;
      if (this.battery <= 0) {
        this.battery = 0;
        this.flashlightOn = false;
      }
    }

    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    ).normalize();
    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    ).normalize();

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (this.keys["w"]) moveDir.add(forward);
    if (this.keys["s"]) moveDir.sub(forward);
    if (this.keys["d"]) moveDir.add(right);
    if (this.keys["a"]) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const newX = this.position.x + moveDir.x * speed * dt;
      const newZ = this.position.z + moveDir.z * speed * dt;

      if (!this._collides(newX, this.position.z)) {
        this.position.x = newX;
      }
      if (!this._collides(this.position.x, newZ)) {
        this.position.z = newZ;
      }
    }

    const sensitivity = 0.003;
    this.yaw -= this.mouse.dx * sensitivity;
    this.pitch -= this.mouse.dy * sensitivity;

    while (this.yaw > Math.PI * 2) this.yaw -= Math.PI * 2;
    while (this.yaw < -Math.PI * 2) this.yaw += Math.PI * 2;
    while (this.pitch > Math.PI * 2) this.pitch -= Math.PI * 2;
    while (this.pitch < -Math.PI * 2) this.pitch += Math.PI * 2;

    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  _collides(wx, wz) {
    const r = PLAYER.RADIUS;
    const cs = MAZE.CELL_SIZE;
    const halfW = MAZE.WIDTH / 2;
    const halfH = MAZE.HEIGHT / 2;

    const checkPoints = [
      { x: wx + r, z: wz + r },
      { x: wx - r, z: wz - r },
      { x: wx + r, z: wz - r },
      { x: wx - r, z: wz + r },
    ];

    for (const p of checkPoints) {
      const cx = Math.floor(p.x / cs + halfW);
      const cz = Math.floor(p.z / cs + halfH);
      if (this.maze.isWall(cx, cz)) return true;
    }
    return false;
  }

  getForwardDir() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
  }

  getHorizontalDir() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  _onKeyDown(e) {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "e") this._interactPending = true;
  }

  _onKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  _onMouseDown(e) {
    if (e.button === 0) this.mouseButtons.left = true;
    if (e.button === 2) this.mouseButtons.right = true;
  }

  _onMouseUp(e) {
    if (e.button === 0) this.mouseButtons.left = false;
    if (e.button === 2) this.mouseButtons.right = false;
  }

  _onMouseMove(e) {
    if (document.pointerLockElement === this.canvas) {
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
    } else if (this.mouseActive) {
      if (!this._mouseInitialized) {
        this._lastMouseX = e.clientX;
        this._lastMouseY = e.clientY;
        this._mouseInitialized = true;
        return;
      }
      this.mouse.dx += e.clientX - this._lastMouseX;
      this.mouse.dy += e.clientY - this._lastMouseY;
      this._lastMouseX = e.clientX;
      this._lastMouseY = e.clientY;
    }
  }

  _onClick() {
    if (!this.mouseActive) {
      this.mouseActive = true;
      this._mouseInitialized = false;
    }
    if (!document.pointerLockElement && this.canvas) {
      this.canvas.requestPointerLock();
    }
  }

  _onPointerLockChange() {
    this.mouse.locked = !!document.pointerLockElement;
    if (document.pointerLockElement === this.canvas) {
      this.mouseActive = true;
      this._mouseInitialized = false;
    }
  }
}
